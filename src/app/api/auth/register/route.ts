import { NextRequest, NextResponse } from 'next/server';
import { withDb } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!name || !email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: 'Por favor completa tu nombre, correo electrónico y contraseña.',
        },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          message: 'La contraseña debe tener al menos 6 caracteres.',
        },
        { status: 400 }
      );
    }

    return await withDb(async (conn) => {
      // Verificar si el correo ya está registrado
      const [existing] = await conn.query<RowDataPacket[]>(
        'SELECT id FROM users WHERE email = ? LIMIT 1',
        [email]
      );

      if (existing && existing.length > 0) {
        return NextResponse.json(
          {
            success: false,
            message: 'Este correo electrónico ya está registrado. Intenta iniciar sesión.',
          },
          { status: 409 }
        );
      }

      // Generar hash bcrypt compatible con PHP/Laravel ($2y$) y Node.js
      const rawHash = await bcrypt.hash(password, 10);
      const phpCompatibleHash = rawHash.replace(/^\$2[ab]\$/, '$2y$');

      const [result] = await conn.query<ResultSetHeader>(
        `INSERT INTO users (role, name, email, password, premuim, verified, verfied, active, last_login_at, created_at, updated_at)
         VALUES ('user', ?, ?, ?, 0, 1, 1, 1, NOW(), NOW(), NOW())`,
        [name, email, phpCompatibleHash]
      );

      const userData = {
        id: result.insertId,
        username: name,
        name,
        email,
        role: 'user',
        premium: false,
        avatar: null,
      };

      const response = NextResponse.json({
        success: true,
        message: 'Cuenta creada exitosamente',
        data: userData,
      });

      const tokenPayload = Buffer.from(JSON.stringify(userData)).toString('base64');
      response.cookies.set('dooplex_session', tokenPayload, {
        httpOnly: true,
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 días
        sameSite: 'lax',
      });

      return response;
    });
  } catch (error: unknown) {
    console.error('Error in /api/auth/register:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : 'Error al registrar el usuario',
      },
      { status: 500 }
    );
  }
}

