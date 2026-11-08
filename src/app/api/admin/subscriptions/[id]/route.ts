import { NextRequest, NextResponse } from 'next/server';
import { withDb, getSessionUserFromRequest } from '@/lib/db';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = getSessionUserFromRequest(request);
    if (!sessionUser || sessionUser.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Acceso no autorizado. Se requiere rol de administrador.' },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const subId = Number(id);
    if (!subId) {
      return NextResponse.json({ success: false, error: 'ID de suscripción inválido.' }, { status: 400 });
    }

    return await withDb(async (conn) => {
      // Obtener el user_id de la suscripción para actualizar users.premuim si aplica
      const [rows] = await conn.query<RowDataPacket[]>('SELECT user_id FROM subscriptions WHERE id = ?', [subId]);
      const userId = rows[0]?.user_id ? Number(rows[0].user_id) : null;

      const [res] = await conn.query<ResultSetHeader>('DELETE FROM subscriptions WHERE id = ?', [subId]);

      if (userId) {
        // Verificar si le quedan otras suscripciones activas
        const [remaining] = await conn.query<RowDataPacket[]>(
          `SELECT id FROM subscriptions
           WHERE user_id = ? AND stripe_status = 'active' AND (ends_at IS NULL OR ends_at > NOW())`,
          [userId]
        );
        if (remaining.length === 0) {
          await conn.query('UPDATE users SET premuim = 0, pack_name = NULL, pack_id = NULL WHERE id = ?', [userId]);
        }
      }

      return NextResponse.json({
        success: true,
        message: res.affectedRows > 0 ? 'Suscripción cancelada/eliminada correctamente.' : 'No encontrada.',
      });
    });
  } catch (error: unknown) {
    console.error('Error deleting subscription in /api/admin/subscriptions/[id]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al cancelar la suscripción',
      },
      { status: 400 }
    );
  }
}

