import mysql, { Connection, RowDataPacket, ResultSetHeader, FieldPacket } from 'mysql2/promise';

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
