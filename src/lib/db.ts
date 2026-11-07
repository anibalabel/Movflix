import mysql, { Connection, RowDataPacket, ResultSetHeader, FieldPacket } from 'mysql2/promise';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { NextRequest } from 'next/server';

export interface DbConnectionParams {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

declare global {
  var __DOOPLEX_DB_CONFIG: DbConnectionParams | undefined;
}

function readLocalConfigFile(): Partial<DbConnectionParams> | null {
  try {
    const filePath = path.join(process.cwd(), '.db-config.json');
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.host && parsed.database && parsed.user) {
        return {
          host: String(parsed.host).trim(),
          port: Number(parsed.port) || 3306,
          user: String(parsed.user).trim(),
          password: String(parsed.password ?? ''),
          database: String(parsed.database).trim(),
        };
      }
    }
  } catch {
    // Ignore fs errors on serverless/edge runtimes
  }
  return null;
}

export function getResolvedDbConfig(): DbConnectionParams & {
  isConfigured: boolean;
  source: 'runtime' | 'file' | 'env' | 'none';
} {
  // 1. In-memory runtime config set during current session
  if (
    globalThis.__DOOPLEX_DB_CONFIG &&
    globalThis.__DOOPLEX_DB_CONFIG.host &&
    globalThis.__DOOPLEX_DB_CONFIG.database &&
    globalThis.__DOOPLEX_DB_CONFIG.user
  ) {
    return {
      ...globalThis.__DOOPLEX_DB_CONFIG,
      isConfigured: true,
      source: 'runtime',
    };
  }

  // 2. Local installer file (.db-config.json)
  const fromFile = readLocalConfigFile();
  if (fromFile && fromFile.host && fromFile.database && fromFile.user) {
    const resolved: DbConnectionParams = {
      host: fromFile.host,
      port: Number(fromFile.port) || 3306,
      user: fromFile.user,
      password: fromFile.password ?? '',
      database: fromFile.database,
    };
    globalThis.__DOOPLEX_DB_CONFIG = resolved;
    return {
      ...resolved,
      isConfigured: true,
      source: 'file',
    };
  }

  // 3. Environment variables (.env.local / hosting panel)
  const envHost = (process.env.DB_HOST || '').trim();
  const envDatabase = (process.env.DB_DATABASE || '').trim();
  const envUser = (process.env.DB_USERNAME || '').trim();
  const envPassword = process.env.DB_PASSWORD || '';
  const envPort = Number(process.env.DB_PORT) || 3306;

  if (envHost && envDatabase && envUser) {
    return {
      host: envHost,
      port: envPort,
      user: envUser,
      password: envPassword,
      database: envDatabase,
      isConfigured: true,
      source: 'env',
    };
  }

  return {
    host: '',
    port: 3306,
    user: '',
    password: '',
    database: '',
    isConfigured: false,
    source: 'none',
  };
}

export function isDatabaseConfigured(): boolean {
  return getResolvedDbConfig().isConfigured;
}

export function saveDbConfig(params: DbConnectionParams): { savedToFile: boolean; savedToEnv: boolean } {
  const clean: DbConnectionParams = {
    host: params.host.trim(),
    port: Number(params.port) || 3306,
    user: params.user.trim(),
    password: params.password ?? '',
    database: params.database.trim(),
  };

  globalThis.__DOOPLEX_DB_CONFIG = clean;
  process.env.DB_HOST = clean.host;
  process.env.DB_PORT = String(clean.port);
  process.env.DB_DATABASE = clean.database;
  process.env.DB_USERNAME = clean.user;
  process.env.DB_PASSWORD = clean.password;

  let savedToFile = false;
  let savedToEnv = false;

  try {
    const jsonPath = path.join(process.cwd(), '.db-config.json');
    fs.writeFileSync(
      jsonPath,
      JSON.stringify(
        {
          ...clean,
          updatedAt: new Date().toISOString(),
        },
        null,
        2
      ),
      'utf8'
    );
    savedToFile = true;
  } catch {
    // Ignore if read-only filesystem
  }

  try {
    const envPath = path.join(process.cwd(), '.env.local');
    let existingLines: string[] = [];
    if (fs.existsSync(envPath)) {
      existingLines = fs
        .readFileSync(envPath, 'utf8')
        .split(/\r?\n/)
        .filter(
          (line) =>
            !line.startsWith('DB_CONNECTION=') &&
            !line.startsWith('DB_HOST=') &&
            !line.startsWith('DB_PORT=') &&
            !line.startsWith('DB_DATABASE=') &&
            !line.startsWith('DB_USERNAME=') &&
            !line.startsWith('DB_PASSWORD=') &&
            !line.startsWith('DB_CHARSET=')
        );
    }
    const escapedPass = clean.password.replace(/"/g, '\\"');
    const dbLines = [
      'DB_CONNECTION=mysql',
      `DB_HOST=${clean.host}`,
      `DB_PORT=${clean.port}`,
      `DB_DATABASE=${clean.database}`,
      `DB_USERNAME=${clean.user}`,
      `DB_PASSWORD="${escapedPass}"`,
      'DB_CHARSET=utf8mb4',
    ];
    const finalContent = [...dbLines, ...existingLines.filter(Boolean)].join('\n') + '\n';
    fs.writeFileSync(envPath, finalContent, 'utf8');
    savedToEnv = true;
  } catch {
    // Ignore if read-only filesystem
  }

  return { savedToFile, savedToEnv };
}

export async function createCustomDbConnection(params: DbConnectionParams): Promise<Connection> {
  return mysql.createConnection({
    host: params.host.trim(),
    port: Number(params.port) || 3306,
    user: params.user.trim(),
    password: params.password ?? '',
    database: params.database.trim(),
    charset: 'utf8mb4',
    connectTimeout: 12000,
    disableEval: true,
  });
}

export const DEFAULT_AVATAR_PATH = '/api/avatars/image/avatar_default.png';
export const DEFAULT_GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  '946966649680-sobqbid2jil433jlilgiknb2kjulu00d.apps.googleusercontent.com';

export function normalizeAvatarUrl(avatar?: string | null): string {
  if (!avatar || typeof avatar !== 'string' || avatar.trim() === '') {
    return DEFAULT_AVATAR_PATH;
  }
  const trimmed = avatar.trim();
  if (trimmed.includes('/api/avatars/image/avatar_default.png')) {
    return DEFAULT_AVATAR_PATH;
  }
  return trimmed;
}

export function createAccessToken(payload: Record<string, unknown>, expiresInSeconds = 31536000): string {
  const header = Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'HS256' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const body = Buffer.from(
    JSON.stringify({
      ...payload,
      iat: now,
      exp: now + expiresInSeconds,
    })
  ).toString('base64url');
  const secret = process.env.JWT_SECRET || 'dooplex-jwt-secret-key-2026';
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

export interface SessionUserPayload {
  id: number;
  username?: string;
  name?: string;
  email?: string;
  role?: string;
  avatar?: string | null;
}

export function getSessionUserFromRequest(request: NextRequest): SessionUserPayload | null {
  // 1. Check dooplex_session cookie
  const cookie = request.cookies.get('dooplex_session')?.value;
  if (cookie) {
    try {
      const parsed = JSON.parse(Buffer.from(cookie, 'base64').toString('utf8'));
      if (parsed && parsed.id) {
        return {
          id: Number(parsed.id),
          username: parsed.username || parsed.name,
          name: parsed.name || parsed.username,
          email: parsed.email,
          role: parsed.role || 'user',
          avatar: parsed.avatar || null,
        };
      }
    } catch {
      // fallback to Authorization header
    }
  }

  // 2. Check Authorization: Bearer <token>
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim();
    const parts = token.split('.');
    if (parts.length === 3) {
      try {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
        const userId = Number(payload.sub || payload.id);
        if (userId) {
          return {
            id: userId,
            username: payload.name || payload.email,
            name: payload.name || payload.email,
            email: payload.email,
            role: payload.role || 'user',
            avatar: payload.avatar || null,
          };
        }
      } catch {
        return null;
      }
    }
  }

  return null;
}

export async function createDbConnection(): Promise<Connection> {
  const cfg = getResolvedDbConfig();
  if (!cfg.isConfigured) {
    throw new Error(
      'DB_NOT_CONFIGURED: La base de datos no está configurada. Completa la instalación en /setup.'
    );
  }
  return mysql.createConnection({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    charset: 'utf8mb4',
    connectTimeout: 15000,
    disableEval: true,
  });
}

export async function withDb<T>(fn: (conn: Connection) => Promise<T>): Promise<T> {
  const conn = await createDbConnection();
  try {
    return await fn(conn);
  } finally {
    await conn.end().catch(() => {});
  }
}

export const pool = {
  async query<T extends RowDataPacket[] | ResultSetHeader = RowDataPacket[]>(
    sql: string,
    values?: unknown
  ): Promise<[T, FieldPacket[]]> {
    return withDb((conn) => conn.query<T>(sql, values as never));
  },
};

export const TMDB_API_KEY = process.env.TMDB_API_KEY || '1559f1f0a886aa7e93f22e09c47b9c9e';

export function normalizeImageUrl(
  url: string | null | undefined,
  size: 'w500' | 'original' = 'w500'
): string {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return '';
  }
  const trimmed = url.trim();
  if (trimmed.startsWith('http://image.tmdb.org')) {
    return trimmed.replace('http://image.tmdb.org', 'https://image.tmdb.org');
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) {
    return `https://image.tmdb.org/t/p/${size}${trimmed}`;
  }
  return trimmed;
}
