import { NextRequest, NextResponse } from 'next/server';
import { withDb } from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { RowDataPacket } from 'mysql2';

function getSessionUser(request: NextRequest): { id: number; name: string; email: string; role: string } | null {
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
      { success: false, message: 'Debes iniciar sesión para cambiar tu contraseña.' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const currentPassword = String(body.currentPassword || '');
    const newPassword = String(body.newPassword || '');

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, message: 'Por favor completa la contraseña actual y la nueva contraseña.' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: 'La nueva contraseña debe tener al menos 6 caracteres.' },
        { status: 400 }
      );
    }

    return await withDb(async (conn) => {
      const [rows] = await conn.query<RowDataPacket[]>(
        'SELECT id, password FROM users WHERE id = ? LIMIT 1',
        [sessionUser.id]
      );

      if (!rows || rows.length === 0) {
        return NextResponse.json(
          { success: false, message: 'Usuario no encontrado.' },
          { status: 404 }
        );
      }

      const storedHash = String(rows[0].password || '');
      let isValid = false;

      if (
        storedHash.startsWith('$2y$') ||
        storedHash.startsWith('$2a$') ||
        storedHash.startsWith('$2b$')
      ) {
        const normalizedHash = storedHash.replace(/^\$2y\$/, '$2b$');
        isValid = await bcrypt.compare(currentPassword, normalizedHash);
      }
      if (!isValid && storedHash.length === 32) {
        const md5Hash = crypto.createHash('md5').update(currentPassword).digest('hex');
        if (md5Hash.toLowerCase() === storedHash.toLowerCase()) {
          isValid = true;
        }
      }
      if (!isValid && storedHash === currentPassword) {
        isValid = true;
      }

      if (!isValid) {
        return NextResponse.json(
          { success: false, message: 'La contraseña actual ingresada es incorrecta.' },
          { status: 401 }
        );
      }

      const rawNewHash = await bcrypt.hash(newPassword, 10);
      const phpCompatibleHash = rawNewHash.replace(/^\$2[ab]\$/, '$2y$');

      await conn.query(
        'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
        [phpCompatibleHash, sessionUser.id]
      );

      return NextResponse.json({
        success: true,
        message: '¡Tu contraseña ha sido actualizada correctamente!',
      });
    });
  } catch (error: unknown) {
    console.error('Error in /api/auth/change-password:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Error al actualizar la contraseña',
      },
      { status: 500 }
    );
  }
}

