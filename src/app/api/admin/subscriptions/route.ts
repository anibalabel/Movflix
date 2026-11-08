import { NextRequest, NextResponse } from 'next/server';
import { withDb, getSessionUserFromRequest } from '@/lib/db';
import { computeSubscriptionStatus, SubscriptionItem } from '@/lib/plan-catalog';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function GET(request: NextRequest) {
  try {
    const sessionUser = getSessionUserFromRequest(request);
    if (!sessionUser || sessionUser.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Acceso no autorizado. Se requiere rol de administrador.' },
        { status: 403 }
      );
    }

    return await withDb(async (conn) => {
      const [rows] = await conn.query<RowDataPacket[]>(
        `SELECT s.*, u.name as user_name, u.email as user_email, u.avatar as user_avatar
         FROM subscriptions s
         LEFT JOIN users u ON u.id = s.user_id
         ORDER BY s.id DESC`
      );

      const items: SubscriptionItem[] = rows.map((r) => {
        const { is_active, status_label } = computeSubscriptionStatus(r);
        return {
          id: Number(r.id),
          user_id: Number(r.user_id),
          user_name: r.user_name || `Usuario #${r.user_id}`,
          user_email: r.user_email || 'Sin correo',
          user_avatar: r.user_avatar || null,
          name: r.name || 'default',
          provider: r.provider || 'manual',
          provider_id: r.provider_id || null,
          provider_status: r.provider_status || null,
          provider_plan_id: r.provider_plan_id || null,
          stripe_id: r.stripe_id || '',
          stripe_status: r.stripe_status || 'active',
          stripe_plan: r.stripe_plan || null,
          quantity: r.quantity !== null ? Number(r.quantity) : null,
          trial_ends_at: r.trial_ends_at ? String(r.trial_ends_at) : null,
          current_period_start: r.current_period_start ? String(r.current_period_start) : null,
          current_period_end: r.current_period_end ? String(r.current_period_end) : null,
          ends_at: r.ends_at ? String(r.ends_at) : null,
          created_at: r.created_at ? String(r.created_at) : null,
          updated_at: r.updated_at ? String(r.updated_at) : null,
          is_active,
          status_label,
        };
      });

      return NextResponse.json({
        success: true,
        data: items,
      });
    });
  } catch (error: unknown) {
    console.error('Error fetching subscriptions in /api/admin/subscriptions:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al obtener suscripciones',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionUser = getSessionUserFromRequest(request);
    if (!sessionUser || sessionUser.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Acceso no autorizado. Se requiere rol de administrador.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const userId = Number(body.user_id);
    const planName = String(body.name || 'default').trim();
    const provider = String(body.provider || 'manual').trim();
    const providerPlanId = String(body.provider_plan_id || '').trim();
    const days = Math.max(1, Number(body.days) || 30);

    if (!userId) {
      return NextResponse.json({ success: false, error: 'El ID de usuario es obligatorio.' }, { status: 400 });
    }

    return await withDb(async (conn) => {
      // Verificar que el usuario exista
      const [uRows] = await conn.query<RowDataPacket[]>('SELECT id, name FROM users WHERE id = ?', [userId]);
      if (uRows.length === 0) {
        return NextResponse.json({ success: false, error: 'El usuario no existe.' }, { status: 404 });
      }

      const stripeId = `sub_manual_${Date.now()}`;
      const [res] = await conn.query<ResultSetHeader>(
        `INSERT INTO subscriptions (
          user_id, name, provider, provider_id, provider_status, provider_plan_id,
          stripe_id, stripe_status, stripe_plan, quantity,
          current_period_start, current_period_end, ends_at,
          created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, 'active', ?,
          ?, 'active', ?, 1,
          NOW(), DATE_ADD(NOW(), INTERVAL ? DAY), DATE_ADD(NOW(), INTERVAL ? DAY),
          NOW(), NOW()
        )`,
        [userId, planName, provider, stripeId, providerPlanId, stripeId, providerPlanId, days, days]
      );

      // Actualizar también la tabla users para sincronizar el estado premium
      await conn.query(
        `UPDATE users SET
          premuim = 1,
          pack_name = ?,
          pack_id = ?,
          expired_in = DATE_FORMAT(DATE_ADD(NOW(), INTERVAL ? DAY), '%Y-%m-%d %H:%i:%s'),
          updated_at = NOW()
         WHERE id = ?`,
        [planName, providerPlanId || 'plan', days, userId]
      );

      return NextResponse.json({
        success: true,
        message: 'Suscripción asignada exitosamente.',
        subscription_id: res.insertId,
      });
    });
  } catch (error: unknown) {
    console.error('Error creating subscription in /api/admin/subscriptions:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al asignar suscripción',
      },
      { status: 400 }
    );
  }
}

