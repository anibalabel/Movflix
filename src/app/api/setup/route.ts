import { NextRequest, NextResponse } from 'next/server';
import {
  getResolvedDbConfig,
  saveDbConfig,
  createCustomDbConnection,
  getSessionUserFromRequest,
  withDb,
} from '@/lib/db';
import { RowDataPacket } from 'mysql2';

function maskString(value: string): string {
  const trimmed = (value || '').trim();
  if (!trimmed) return '';
  if (trimmed === 'localhost' || trimmed === '127.0.0.1') return trimmed;
  if (trimmed.length <= 4) return `${trimmed[0]}***`;
  return `${trimmed.slice(0, 2)}${'*'.repeat(Math.min(6, trimmed.length - 4))}${trimmed.slice(-2)}`;
}

export async function GET(request: NextRequest) {
  const cfg = getResolvedDbConfig();
  const sessionUser = getSessionUserFromRequest(request);
  const isAdmin = sessionUser?.role === 'admin';

  if (!cfg.isConfigured) {
    return NextResponse.json({
      installed: false,
      connected: false,
      source: 'none',
      isAdmin,
      currentConfig: null,
      stats: null,
    });
  }

  let connected = false;
  let connectionError: string | null = null;
  let stats: { movies: number; series: number; animes: number; users: number } | null = null;

  try {
    await withDb(async (conn) => {
      const [[row]] = await conn.query<RowDataPacket[]>(
        `SELECT
          (SELECT COUNT(*) FROM movies) as movies,
          (SELECT COUNT(*) FROM series) as series,
          (SELECT COUNT(*) FROM animes) as animes,
          (SELECT COUNT(*) FROM users) as users`
      );
      connected = true;
      stats = {
        movies: Number(row?.movies || 0),
        series: Number(row?.series || 0),
        animes: Number(row?.animes || 0),
        users: Number(row?.users || 0),
      };
    });
  } catch (err: unknown) {
    connected = false;
    connectionError = err instanceof Error ? err.message : 'No se pudo conectar a la base de datos';
  }

  return NextResponse.json({
    installed: true,
    connected,
    connectionError,
    source: cfg.source,
    isAdmin,
    requiresUnlock: connected && !isAdmin,
    currentConfig: {
      host: isAdmin ? cfg.host : maskString(cfg.host),
      port: cfg.port,
      database: isAdmin ? cfg.database : maskString(cfg.database),
      user: isAdmin ? cfg.user : maskString(cfg.user),
    },
    stats,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action === 'save' ? 'save' : 'test';
    const host = String(body.host || '').trim();
    const port = Number(body.port) || 3306;
    const database = String(body.database || '').trim();
    const username = String(body.username || '').trim();
    const password = String(body.password ?? '');
    const currentPassword = String(body.currentPassword ?? '');

    if (!host || !database || !username) {
      return NextResponse.json(
        {
          success: false,
          error: 'Debes completar el Host, Nombre de la Base de Datos y Usuario.',
        },
        { status: 400 }
      );
    }

    // Si el sistema ya está instalado y conectado, verificar autorización antes de sobrescribir
    const existing = getResolvedDbConfig();
    const sessionUser = getSessionUserFromRequest(request);
    const isAdmin = sessionUser?.role === 'admin';

    if (action === 'save' && existing.isConfigured && !isAdmin) {
      let existingWorks = false;
      try {
        const testExisting = await createCustomDbConnection(existing);
        await testExisting.query('SELECT 1');
        await testExisting.end().catch(() => {});
        existingWorks = true;
      } catch {
        existingWorks = false;
      }

      if (existingWorks && currentPassword !== existing.password) {
        return NextResponse.json(
          {
            success: false,
            requiresCurrentPassword: true,
            error:
              'El sistema ya está instalado. Ingresa la contraseña actual de la base de datos (o inicia sesión como Administrador) para autorizar el cambio de configuración.',
          },
          { status: 403 }
        );
      }
    }

    // Probar conexión en tiempo real con los datos proporcionados
    const conn = await createCustomDbConnection({
      host,
      port,
      user: username,
      password,
      database,
    });

    let existingTables: string[] = [];
    let stats = { movies: 0, series: 0, animes: 0, users: 0 };
    let missingCoreTables: string[] = [];

    try {
      const [tableRows] = await conn.query<RowDataPacket[]>('SHOW TABLES');
      existingTables = tableRows.map((r) => String(Object.values(r)[0]).toLowerCase());

      const requiredTables = ['movies', 'series', 'animes', 'users', 'settings'];
      missingCoreTables = requiredTables.filter((t) => !existingTables.includes(t));

      if (missingCoreTables.length === 0) {
        const [[counts]] = await conn.query<RowDataPacket[]>(
          `SELECT
            (SELECT COUNT(*) FROM movies) as movies,
            (SELECT COUNT(*) FROM series) as series,
            (SELECT COUNT(*) FROM animes) as animes,
            (SELECT COUNT(*) FROM users) as users`
        );
        stats = {
          movies: Number(counts?.movies || 0),
          series: Number(counts?.series || 0),
          animes: Number(counts?.animes || 0),
          users: Number(counts?.users || 0),
        };
      }
    } finally {
      await conn.end().catch(() => {});
    }

    if (action === 'test') {
      return NextResponse.json({
        success: true,
        mode: 'test',
        message:
          missingCoreTables.length === 0
            ? '¡Conexión exitosa! Se detectaron todas las tablas principales de Dooplex.'
            : `Conexión MySQL exitosa, pero faltan algunas tablas (${missingCoreTables.join(', ')}).`,
        tablesCount: existingTables.length,
        missingCoreTables,
        stats,
      });
    }

    // Guardar configuración
    const saveResult = saveDbConfig({
      host,
      port,
      user: username,
      password,
      database,
    });

    return NextResponse.json({
      success: true,
      mode: 'save',
      message: '¡Configuración de base de datos guardada e instalada correctamente!',
      savedToFile: saveResult.savedToFile,
      savedToEnv: saveResult.savedToEnv,
      tablesCount: existingTables.length,
      missingCoreTables,
      stats,
    });
  } catch (error: unknown) {
    console.error('Error in POST /api/setup:', error);
    const rawMsg = error instanceof Error ? error.message : 'Error al conectar con MySQL';
    return NextResponse.json(
      {
        success: false,
        error: `No se pudo conectar a la base de datos: ${rawMsg}`,
      },
      { status: 400 }
    );
  }
}

