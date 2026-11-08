import { NextRequest, NextResponse } from 'next/server';
import { withDb, getSessionUserFromRequest } from '@/lib/db';
import { getAllCatalogPlans } from '@/lib/plan-catalog';
import { RowDataPacket } from 'mysql2';

export async function GET(request: NextRequest) {
  try {
    const sessionUser = getSessionUserFromRequest(request);

    return await withDb(async (conn) => {
      const allPlans = await getAllCatalogPlans(conn);
      const activePlans = allPlans.filter((p) => p.is_active);

      let userSubscription = null;
      if (sessionUser?.id) {
        const [subRows] = await conn.query<RowDataPacket[]>(
          `SELECT * FROM subscriptions
           WHERE user_id = ?
           ORDER BY id DESC
           LIMIT 1`,
          [sessionUser.id]
        );
        if (subRows.length > 0) {
          userSubscription = subRows[0];
        }
      }

      return NextResponse.json({
        success: true,
        plans: activePlans,
        userSubscription,
      });
    });
  } catch (error: unknown) {
    console.error('Error fetching public plans in /api/plans:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al obtener los planes',
      },
      { status: 500 }
    );
  }
}

