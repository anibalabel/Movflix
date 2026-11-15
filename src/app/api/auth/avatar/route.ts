import { NextRequest, NextResponse } from 'next/server';
import {
  withDb,
  verifySessionCookie,
  signSessionCookie,
  sessionCookieOptions,
  SESSION_COOKIE_NAME,
} from '@/lib/db';

function getSessionUser(request: NextRequest) {
  return verifySessionCookie(request.cookies.get(SESSION_COOKIE_NAME)?.value);
}

export async function POST(request: NextRequest) {
  const sessionUser = getSessionUser(request);
  if (!sessionUser || !sessionUser.id) {
    return NextResponse.json(
      { success: false, message: 'No has iniciado sesión' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const avatar = String(body.avatar || '').trim() || null;

    return await withDb(async (conn) => {
      await conn.query(
        'UPDATE users SET avatar = ?, updated_at = NOW() WHERE id = ?',
        [avatar, sessionUser.id]
      );

      const updatedUser = {
        ...sessionUser,
        avatar,
      };

      const response = NextResponse.json({
        success: true,
        message: 'Avatar actualizado correctamente',
        avatar,
      });

      response.cookies.set(
        SESSION_COOKIE_NAME,
        signSessionCookie(updatedUser),
        sessionCookieOptions()
      );

      return response;
    });
  } catch (error: unknown) {
    console.error('Error in /api/auth/avatar:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Error al actualizar el avatar',
      },
      { status: 500 }
    );
  }
}

