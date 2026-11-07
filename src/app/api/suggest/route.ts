import { NextRequest, NextResponse } from 'next/server';
import { withDb } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

export async function GET() {
  try {
    return await withDb(async (conn) => {
      const [rows] = await conn.query<RowDataPacket[]>(
        `SELECT id, title, message, created_at, updated_at
         FROM suggestions
         ORDER BY created_at DESC, id DESC
         LIMIT 50`
      );
      return NextResponse.json({
        success: true,
        data: rows,
      });
    });
  } catch (error: unknown) {
    console.error('Error in GET /api/suggest:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : 'Error al obtener sugerencias',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const title = String(body.title || '').trim();
    const message = String(body.message || '').trim();

    if (!title || !message) {
      return NextResponse.json(
        {
          success: false,
          message: 'Por favor ingresa el título y el mensaje de tu sugerencia.',
        },
        { status: 422 }
      );
    }

    return await withDb(async (conn) => {
      const [res] = await conn.query<ResultSetHeader>(
        `INSERT INTO suggestions (title, message, created_at, updated_at)
         VALUES (?, ?, NOW(), NOW())`,
        [title.slice(0, 190), message.slice(0, 190)]
      );

      return NextResponse.json(
        {
          success: true,
          id: res.insertId,
          title: title.slice(0, 190),
          message: message.slice(0, 190),
          status: 200,
          response_message: '¡Gracias! Tu sugerencia ha sido enviada correctamente.',
        },
        { status: 201 }
      );
    });
  } catch (error: unknown) {
    console.error('Error in POST /api/suggest:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : 'Error al guardar la sugerencia',
      },
      { status: 500 }
    );
  }
}

