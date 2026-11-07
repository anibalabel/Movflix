import mysql, { Connection, RowDataPacket, ResultSetHeader, FieldPacket } from 'mysql2/promise';
import crypto from 'crypto';

const dbConfig = {
  host: process.env.DB_HOST || 'mysql.us.cloudlogin.co',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USERNAME || 'plusmovie_st',
  password: process.env.DB_PASSWORD || '5083038xS/@',
  database: process.env.DB_DATABASE || 'plusmovie_st',
  charset: 'utf8mb4',
  connectTimeout: 15000,
  // Required for Cloudflare Workers / Edge V8 isolates where eval() / new Function() is disallowed
  disableEval: true,
};

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

export async function createDbConnection(): Promise<Connection> {
  return mysql.createConnection(dbConfig);
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
