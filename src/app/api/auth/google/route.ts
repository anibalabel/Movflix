import { NextRequest, NextResponse } from 'next/server';
import {
  withDb,
  DEFAULT_AVATAR_PATH,
  DEFAULT_GOOGLE_CLIENT_ID,
  normalizeAvatarUrl,
  createAccessToken,
} from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Connection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';

export interface GoogleSettings {
  google_client_id: string;
  google_client_secret: string;
  google_redirect_uri: string;
}

export async function getGoogleSettings(conn: Connection): Promise<GoogleSettings> {
  const [rows] = await conn.query<RowDataPacket[]>(
    'SELECT google_client_id, google_client_secret, google_redirect_uri FROM settings LIMIT 1'
  );
  const row = rows?.[0] || {};
  return {
    google_client_id: String(row.google_client_id || DEFAULT_GOOGLE_CLIENT_ID).trim(),
    google_client_secret: String(
      row.google_client_secret || process.env.GOOGLE_CLIENT_SECRET || ''
    ).trim(),
    google_redirect_uri: String(
      row.google_redirect_uri || process.env.GOOGLE_REDIRECT_URI || ''
    ).trim(),
  };
}

function randomString(length = 40): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

export interface GooglePayload {
  sub?: string;
  id?: string;
  email?: string;
  name?: string;
  picture?: string;
  avatar?: string;
}

export async function resolveGooglePayload(
  body: Record<string, unknown>,
  settings: GoogleSettings
): Promise<GooglePayload> {
  const code = String(body.code || '').trim();
  let idToken = String(body.id_token || body.credential || '').trim();
  let accessToken = String(body.access_token || body.token || '').trim();

  // 0. Si viene un authorization `code` de OAuth2, intercambiarlo usando google_client_id, google_client_secret y google_redirect_uri de `settings`
  if (code && settings.google_client_id && settings.google_client_secret) {
    const redirectUri =
      String(body.redirect_uri || '').trim() || settings.google_redirect_uri;
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: settings.google_client_id,
        client_secret: settings.google_client_secret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!tokenRes.ok) {
      throw new Error('No se pudo intercambiar el código de autorización con Google');
    }
    const tokenData = await tokenRes.json();
    if (tokenData.access_token) accessToken = tokenData.access_token;
    if (tokenData.id_token) idToken = tokenData.id_token;
  }

  // 1. Verificar access_token con Google UserInfo endpoint (OAuth2 / Socialite)
  if (accessToken) {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      throw new Error('Access token de Google inválido o expirado');
    }
    const info = await res.json();
    return {
      sub: info.sub || info.id,
      email: info.email,
      name: info.name || info.given_name,
      picture: info.picture,
    };
  }

  // 2. Verificar id_token / credential con Google TokenInfo
  if (idToken) {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
    );
    if (!res.ok) {
      throw new Error('Token de Google (id_token) inválido o expirado');
    }
    const info = await res.json();
    return {
      sub: info.sub || info.user_id,
      email: info.email,
      name: info.name || info.given_name,
      picture: info.picture,
    };
  }

  // 3. Payload directo de Google / Socialite enviado en el body
  const nestedUser =
    body.user && typeof body.user === 'object'
      ? (body.user as Record<string, unknown>)
      : body;

  return {
    sub: String(nestedUser.sub || nestedUser.id || nestedUser.provider_id || '').trim(),
    email: String(nestedUser.email || '').trim(),
    name: String(nestedUser.name || '').trim(),
    picture: String(nestedUser.picture || nestedUser.avatar || '').trim(),
  };
}

export async function upsertGoogleUser(conn: Connection, googleData: GooglePayload) {
  const providerId = String(googleData.sub || googleData.id || '').trim();
  const email = String(googleData.email || '').trim().toLowerCase();

  // Si name viene vacío, usa la parte antes del @ del email
  const emailPrefix = email.split('@')[0] || 'Usuario';
  const name = String(googleData.name || '').trim() || emailPrefix;

  // Si picture viene vacío, asigna /api/avatars/image/avatar_default.png
  const picture =
    String(googleData.picture || googleData.avatar || '').trim() ||
    DEFAULT_AVATAR_PATH;

  // Buscar si el usuario ya existe por provider_id o mismo email
  let existingRows: RowDataPacket[] = [];
  if (providerId) {
    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT id, role, name, email, premuim, avatar, provider_name, provider_id
       FROM users
       WHERE (provider_id = ? AND provider_name = 'google') OR LOWER(email) = ?
       ORDER BY (provider_id = ?) DESC, id ASC
       LIMIT 1`,
      [providerId, email, providerId]
    );
    existingRows = rows;
  } else {
    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT id, role, name, email, premuim, avatar, provider_name, provider_id
       FROM users
       WHERE LOWER(email) = ?
       LIMIT 1`,
      [email]
    );
    existingRows = rows;
  }

  let userId: number;
  let userRole = 'user';
  let userName = name;
  let userPremium = false;
  let finalAvatar = picture;

  if (existingRows && existingRows.length > 0) {
    // Usuario existente: actualiza provider_name = "google", provider_id, avatar (si no tenía), email_verified_at, last_login_at y updated_at
    const existing = existingRows[0];
    userId = Number(existing.id);
    userRole = existing.role || 'user';
    userName = existing.name || name;
    userPremium = Boolean(existing.premuim);

    const currentAvatar = String(existing.avatar || '').trim();
    const hasCustomAvatar =
      currentAvatar !== '' &&
      !currentAvatar.includes('/api/avatars/image/avatar_default.png');

    finalAvatar = hasCustomAvatar ? currentAvatar : picture;
    const finalProviderId = providerId || existing.provider_id || null;

    await conn.query(
      `UPDATE users
       SET provider_name = 'google',
           provider_id = ?,
           avatar = ?,
           email_verified_at = NOW(),
           last_login_at = NOW(),
           updated_at = NOW()
       WHERE id = ?`,
      [finalProviderId, finalAvatar, userId]
    );
  } else {
    // Usuario nuevo:
    // password: Hash aleatorio de 40 caracteres (Hash::make(Str::random(40)))
    const random40 = randomString(40);
    const rawHash = await bcrypt.hash(random40, 10);
    const phpCompatibleHash = rawHash.replace(/^\$2[ab]\$/, '$2y$');

    const [insertResult] = await conn.query<ResultSetHeader>(
      `INSERT INTO users (
        role,
        name,
        email,
        password,
        avatar,
        premuim,
        verified,
        verfied,
        active,
        provider_name,
        provider_id,
        email_verified_at,
        last_login_at,
        created_at,
        updated_at
      ) VALUES (
        'user',
        ?,
        ?,
        ?,
        ?,
        0,
        1,
        1,
        1,
        'google',
        ?,
        NOW(),
        NOW(),
        NOW(),
        NOW()
      )`,
      [name, email, phpCompatibleHash, picture, providerId || null]
    );

    userId = insertResult.insertId;
    finalAvatar = picture;
  }

  const normalizedAvatar = normalizeAvatarUrl(finalAvatar);

  const userData = {
    id: userId,
    username: userName,
    name: userName,
    email,
    role: userRole,
    premium: userPremium,
    avatar: normalizedAvatar,
    provider_name: 'google',
    provider_id: providerId || null,
  };

  const expiresIn = 31536000;
  const accessToken = createAccessToken(
    {
      sub: userId,
      email,
      name: userName,
      role: userRole,
      provider: 'google',
    },
    expiresIn
  );

  return {
    userData,
    expiresIn,
    accessToken,
  };
}

export async function GET(request: NextRequest) {
  try {
    return await withDb(async (conn) => {
      const settings = await getGoogleSettings(conn);
      const shouldRedirect = request.nextUrl.searchParams.get('redirect') === '1';

      if (shouldRedirect) {
        const callbackUrl =
          request.nextUrl.searchParams.get('redirect_uri') ||
          `${request.nextUrl.origin}/auth/google/callback`;
        const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        authUrl.searchParams.set('client_id', settings.google_client_id);
        authUrl.searchParams.set('redirect_uri', callbackUrl);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('scope', 'openid email profile');
        authUrl.searchParams.set('prompt', 'select_account');
        return NextResponse.redirect(authUrl.toString());
      }

      return NextResponse.json({
        success: true,
        google_client_id: settings.google_client_id,
        google_redirect_uri: settings.google_redirect_uri,
      });
    });
  } catch {
    return NextResponse.json({
      success: true,
      google_client_id: DEFAULT_GOOGLE_CLIENT_ID,
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    return await withDb(async (conn) => {
      const settings = await getGoogleSettings(conn);
      const googleData = await resolveGooglePayload(body, settings);

      const email = String(googleData.email || '').trim().toLowerCase();

      // Email obligatorio: si Google no lo devuelve, retorna 422 email_required
      if (!email) {
        return NextResponse.json(
          {
            success: false,
            error: 'email_required',
            message: 'El correo electrónico de Google es obligatorio (email_required).',
          },
          { status: 422 }
        );
      }

      const { userData, expiresIn, accessToken } = await upsertGoogleUser(conn, googleData);

      // Respuesta 200 OK compatible tanto con la App como con la Web
      const response = NextResponse.json(
        {
          token_type: 'Bearer',
          expires_in: expiresIn,
          access_token: accessToken,
          refresh_token: null,
          type: 'google',
          success: true,
          message: 'Inicio de sesión con Google exitoso',
          data: userData,
        },
        { status: 200 }
      );

      const cookiePayload = Buffer.from(JSON.stringify(userData)).toString('base64');
      response.cookies.set('dooplex_session', cookiePayload, {
        httpOnly: true,
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 días en navegador
        sameSite: 'lax',
      });

      return response;
    });
  } catch (error: unknown) {
    console.error('Error in POST /api/auth/google:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Error al autenticar con Google',
      },
      { status: 500 }
    );
  }
}
