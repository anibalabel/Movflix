import { NextRequest, NextResponse } from 'next/server';
import { withDb, normalizeAvatarUrl } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET(request: NextRequest) {
  const cookie = request.cookies.get('dooplex_session')?.value;
  if (!cookie) {
    return NextResponse.json({ authenticated: false, user: null });
  }
  try {
    const sessionUser = JSON.parse(Buffer.from(cookie, 'base64').toString('utf8'));
    if (!sessionUser?.id) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    // Consultar siempre la columna `avatar` y datos actualizados desde la tabla `users`
    const dbUser = await withDb(async (conn) => {
      const [rows] = await conn.query<RowDataPacket[]>(
        'SELECT id, name, email, role, premuim, avatar, provider_name FROM users WHERE id = ? LIMIT 1',
        [sessionUser.id]
      );
      return rows[0] || null;
    });

    if (!dbUser) {
      return NextResponse.json({ authenticated: true, user: sessionUser });
    }

    const user = {
      id: Number(dbUser.id),
      username: dbUser.name || dbUser.email,
      name: dbUser.name || dbUser.email,
      email: dbUser.email,
      role: dbUser.role || 'user',
      premium: Boolean(dbUser.premuim),
      avatar: dbUser.avatar ? normalizeAvatarUrl(dbUser.avatar) : null,
      provider_name: dbUser.provider_name || null,
    };

    return NextResponse.json({ authenticated: true, user });
  } catch {
    return NextResponse.json({ authenticated: false, user: null });
  }
}
