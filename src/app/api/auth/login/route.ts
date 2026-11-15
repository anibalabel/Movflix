import { NextRequest, NextResponse } from 'next/server';
import { withDb, normalizeAvatarUrl, createAccessToken } from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { RowDataPacket } from 'mysql2';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = (body.email || '').trim();
    const password = body.password || '';

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Por favor ingresa tu correo y contraseña' },
        { status: 400 }
      );
    }

    return await withDb(async (conn) => {
      const [rows] = await conn.query<RowDataPacket[]>(
        'SELECT id, name, email, password, role, premuim, avatar, provider_name, active FROM users WHERE email = ? OR name = ? LIMIT 1',
        [email, email]
      );

      if (!rows || rows.length === 0) {
        return NextResponse.json(
          { success: false, message: 'Usuario no encontrado' },
          { status: 401 }
        );
      }

      const user = rows[0];
      const storedHash = String(user.password || '');
      let isValid = false;

      // 1. Check bcrypt ($2y$, $2a$, $2b$)
      if (
        storedHash.startsWith('$2y$') ||
        storedHash.startsWith('$2a$') ||
        storedHash.startsWith('$2b$')
      ) {
        const normalizedHash = storedHash.replace(/^\$2y\$/, '$2b$');
        isValid = await bcrypt.compare(password, normalizedHash);
      }
      // 2. Fallback MD5
      if (!isValid && storedHash.length === 32) {
        const md5Hash = crypto.createHash('md5').update(password).digest('hex');
        if (md5Hash.toLowerCase() === storedHash.toLowerCase()) {
          isValid = true;
        }
      }
      // 3. Fallback plain text
      if (!isValid && storedHash === password) {
        isValid = true;
      }

      if (!isValid) {
        return NextResponse.json(
          { success: false, message: 'Contraseña incorrecta' },
          { status: 401 }
        );
      }

      await conn
        .query(
          'UPDATE users SET last_login_at = NOW(), created_at = COALESCE(created_at, NOW()), updated_at = NOW() WHERE id = ?',
          [user.id]
        )
        .catch(() => {});

      const userData = {
        id: Number(user.id),
        username: user.name || user.email,
        name: user.name || user.email,
        email: user.email,
        role: user.role || 'user',
        premium: Boolean(user.premuim),
        avatar: user.avatar ? normalizeAvatarUrl(user.avatar) : null,
        provider_name: user.provider_name || null,
      };

      const expiresIn = 31536000;
      const accessToken = createAccessToken(
        {
          sub: userData.id,
          email: userData.email,
          name: userData.name,
          role: userData.role,
        },
        expiresIn
      );

      const response = NextResponse.json({
        success: true,
        message: 'Login correcto',
        token_type: 'Bearer',
        expires_in: expiresIn,
        access_token: accessToken,
        refresh_token: null,
        type: user.provider_name || 'local',
        data: userData,
      });

      const tokenPayload = Buffer.from(JSON.stringify(userData)).toString('base64');
      response.cookies.set('dooplex_session', tokenPayload, {
        httpOnly: true,
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        sameSite: 'lax',
      });

      return response;
    });
  } catch (error: unknown) {
    console.error('Error in /api/auth/login:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : 'Error en el servidor de autenticación',
      },
      { status: 500 }
    );
  }
}
