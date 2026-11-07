import { NextRequest, NextResponse } from 'next/server';
import { withDb } from '@/lib/db';
import {
  WEB_GOOGLE_REDIRECT_URI,
  getGoogleSettings,
  resolveGooglePayload,
  upsertGoogleUser,
} from '@/app/api/auth/google/route';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const accessTokenParam = request.nextUrl.searchParams.get('access_token');
  const idTokenParam = request.nextUrl.searchParams.get('id_token');
  const wantsJson =
    request.headers.get('accept')?.includes('application/json') ||
    request.nextUrl.searchParams.get('format') === 'json';

  if (!code && !accessTokenParam && !idTokenParam) {
    if (wantsJson) {
      return NextResponse.json(
        { success: false, message: 'No se recibió código ni token de Google' },
        { status: 400 }
      );
    }
    return NextResponse.redirect(new URL('/', request.url));
  }

  try {
    return await withDb(async (conn) => {
      const settings = await getGoogleSettings(conn);

      const googleData = await resolveGooglePayload(
        {
          code: code || undefined,
          access_token: accessTokenParam || undefined,
          id_token: idTokenParam || undefined,
          redirect_uri: WEB_GOOGLE_REDIRECT_URI,
        },
        settings
      );

      const email = String(googleData.email || '').trim().toLowerCase();
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

      const { userData, expiresIn, accessToken } = await upsertGoogleUser(
        conn,
        googleData
      );

      const cookiePayload = Buffer.from(JSON.stringify(userData)).toString('base64');

      if (wantsJson) {
        const jsonRes = NextResponse.json(
          {
            token_type: 'Bearer',
            expires_in: expiresIn,
            access_token: accessToken,
            refresh_token: null,
            type: 'google',
            success: true,
            data: userData,
          },
          { status: 200 }
        );
        jsonRes.cookies.set('dooplex_session', cookiePayload, {
          httpOnly: true,
          path: '/',
          maxAge: 60 * 60 * 24 * 30,
          sameSite: 'lax',
        });
        return jsonRes;
      }

      const redirectRes = NextResponse.redirect(new URL('/dashboard', request.url));
      redirectRes.cookies.set('dooplex_session', cookiePayload, {
        httpOnly: true,
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
        sameSite: 'lax',
      });
      return redirectRes;
    });
  } catch (error: unknown) {
    console.error('Error in GET /auth/google/callback:', error);
    if (wantsJson) {
      return NextResponse.json(
        {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : 'Error en el callback de Google',
        },
        { status: 500 }
      );
    }
    return NextResponse.redirect(new URL('/', request.url));
  }
}

