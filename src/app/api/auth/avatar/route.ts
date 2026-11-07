import { NextRequest, NextResponse } from 'next/server';
import { withDb } from '@/lib/db';

function getSessionUser(request: NextRequest) {
  const cookie = request.cookies.get('dooplex_session')?.value;
  if (!cookie) return null;
  try {
    return JSON.parse(Buffer.from(cookie, 'base64').toString('utf8'));
  } catch {
    return null;
  }
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

      const tokenPayload = Buffer.from(JSON.stringify(updatedUser)).toString('base64');
      response.cookies.set('dooplex_session', tokenPayload, {
        httpOnly: true,
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
        sameSite: 'lax',
      });

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

