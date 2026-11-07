import { NextRequest, NextResponse } from 'next/server';
import { withDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim();
    const subject = String(body.subject || 'Consulta General').trim();
    const message = String(body.message || '').trim();

    if (!name || !email || !message) {
      return NextResponse.json(
        {
          success: false,
          message: 'Por favor completa tu nombre, correo y mensaje.',
        },
        { status: 400 }
      );
    }

    const reportTitle = `[Web - ${subject}] ${name} <${email}>`.slice(0, 190);
    const reportMessage = message.slice(0, 190);

    await withDb((conn) =>
      conn.query(
        'INSERT INTO reports (title, message, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
        [reportTitle, reportMessage]
      )
    );

    return NextResponse.json({
      success: true,
      message:
        '¡Mensaje enviado con éxito! Nuestro equipo lo revisará a la brevedad.',
    });
  } catch (error: unknown) {
    console.error('Error in POST /api/contact:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          'No se pudo registrar el mensaje en este momento. También puedes escribirnos a soporte@movflix.live.',
      },
      { status: 500 }
    );
  }
}

