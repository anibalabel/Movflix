import mysql from 'mysql2/promise';

declare global {
  // eslint-disable-next-line no-var
  var _mysqlPool: mysql.Pool | undefined;
}

export const pool: mysql.Pool =
  global._mysqlPool ||
  mysql.createPool({
    host: process.env.DB_HOST || 'mysql.us.cloudlogin.co',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USERNAME || 'plusmovie_st',
    password: process.env.DB_PASSWORD || '5083038xS/@',
    database: process.env.DB_DATABASE || 'plusmovie_st',
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 15000,
  });

if (process.env.NODE_ENV !== 'production') {
  global._mysqlPool = pool;
}

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

