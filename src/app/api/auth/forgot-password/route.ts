import { NextRequest, NextResponse } from 'next/server';
import { withDb } from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { RowDataPacket } from 'mysql2';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const step = String(body.step || 'verify');
    const email = String(body.email || '').trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Por favor ingresa tu correo electrónico.' },
        { status: 400 }
      );
    }

    return await withDb(async (conn) => {
      if (step === 'verify') {
        const name = String(body.name || '').trim();
        if (!name) {
          return NextResponse.json(
            {
              success: false,
              message: 'Por favor ingresa tu nombre de usuario registrado para verificar tu cuenta.',
            },
            { status: 400 }
          );
        }

        const [users] = await conn.query<RowDataPacket[]>(
          'SELECT id, name, email FROM users WHERE LOWER(email) = ? AND LOWER(name) = ? LIMIT 1',
          [email, name.toLowerCase()]
        );

        if (!users || users.length === 0) {
          return NextResponse.json(
            {
              success: false,
              message: 'No encontramos ninguna cuenta que coincida con ese correo y nombre de usuario.',
            },
            { status: 404 }
          );
        }

        const resetToken = crypto.randomBytes(20).toString('hex');

        // Registrar el token en la tabla `password_resets`
        await conn.query('DELETE FROM password_resets WHERE email = ?', [email]);
        await conn.query(
          'INSERT INTO password_resets (email, token, created_at) VALUES (?, ?, NOW())',
          [email, resetToken]
        );

        return NextResponse.json({
          success: true,
          resetToken,
          message: 'Cuenta verificada correctamente. Ahora escribe tu nueva contraseña.',
        });
      }

      if (step === 'reset') {
        const resetToken = String(body.resetToken || '').trim();
        const newPassword = String(body.newPassword || '');

        if (!resetToken || !newPassword) {
          return NextResponse.json(
            { success: false, message: 'Datos incompletos para restablecer la contraseña.' },
            { status: 400 }
          );
        }

        if (newPassword.length < 6) {
          return NextResponse.json(
            { success: false, message: 'La nueva contraseña debe tener al menos 6 caracteres.' },
            { status: 400 }
          );
        }

        const [tokens] = await conn.query<RowDataPacket[]>(
          'SELECT email, token FROM password_resets WHERE email = ? AND token = ? LIMIT 1',
          [email, resetToken]
        );

        if (!tokens || tokens.length === 0) {
          return NextResponse.json(
            {
              success: false,
              message: 'El código de recuperación es inválido o ha expirado. Vuelve a intentarlo.',
            },
            { status: 400 }
          );
        }

        const rawHash = await bcrypt.hash(newPassword, 10);
        const phpCompatibleHash = rawHash.replace(/^\$2[ab]\$/, '$2y$');

        await conn.query(
          'UPDATE users SET password = ?, updated_at = NOW() WHERE LOWER(email) = ?',
          [phpCompatibleHash, email]
        );

        await conn.query('DELETE FROM password_resets WHERE email = ?', [email]);

        return NextResponse.json({
          success: true,
          message: '¡Contraseña restablecida con éxito! Ahora puedes iniciar sesión.',
        });
      }

      return NextResponse.json(
        { success: false, message: 'Paso inválido' },
        { status: 400 }
      );
    });
  } catch (error: unknown) {
    console.error('Error in /api/auth/forgot-password:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Error al recuperar la contraseña',
      },
      { status: 500 }
    );
  }
}

