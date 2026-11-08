import { NextRequest, NextResponse } from 'next/server';
import { withDb, getSessionUserFromRequest } from '@/lib/db';
import { updateCatalogPlan, deleteCatalogPlan } from '@/lib/plan-catalog';

export async function PUT(
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
    const planId = Number(id);
    if (!planId) {
      return NextResponse.json({ success: false, error: 'ID de plan inválido.' }, { status: 400 });
    }

    const body = await request.json();
    return await withDb(async (conn) => {
      const updated = await updateCatalogPlan(conn, planId, body);
      return NextResponse.json({
        success: true,
        message: 'Plan actualizado correctamente.',
        data: updated,
      });
    });
  } catch (error: unknown) {
    console.error('Error updating plan in /api/admin/plans/[id]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al actualizar el plan',
      },
      { status: 400 }
    );
  }
}

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
    const planId = Number(id);
    if (!planId) {
      return NextResponse.json({ success: false, error: 'ID de plan inválido.' }, { status: 400 });
    }

    return await withDb(async (conn) => {
      const deleted = await deleteCatalogPlan(conn, planId);
      return NextResponse.json({
        success: true,
        message: deleted ? 'Plan eliminado correctamente.' : 'No se encontró el plan especificado.',
      });
    });
  } catch (error: unknown) {
    console.error('Error deleting plan in /api/admin/plans/[id]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al eliminar el plan',
      },
      { status: 400 }
    );
  }
}

