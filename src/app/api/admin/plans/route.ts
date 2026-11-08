import { NextRequest, NextResponse } from 'next/server';
import { withDb, getSessionUserFromRequest } from '@/lib/db';
import { getAllCatalogPlans, createCatalogPlan } from '@/lib/plan-catalog';

export async function GET() {
  try {
    return await withDb(async (conn) => {
      const plans = await getAllCatalogPlans(conn);
      return NextResponse.json({
        success: true,
        data: plans,
      });
    });
  } catch (error: unknown) {
    console.error('Error fetching plans in /api/admin/plans:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al obtener los planes',
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
    return await withDb(async (conn) => {
      const created = await createCatalogPlan(conn, body);
      return NextResponse.json({
        success: true,
        message: 'Plan creado exitosamente.',
        data: created,
      });
    });
  } catch (error: unknown) {
    console.error('Error creating plan in /api/admin/plans:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al guardar el plan',
      },
      { status: 400 }
    );
  }
}

