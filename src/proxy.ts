import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const BLOCKED_PREFIXES = [
  '/.env',
  '/.db-config',
  '/.git',
  '/.aws',
  '/.ssh',
  '/wp-admin',
  '/wp-login',
  '/wp-content',
  '/wp-includes',
  '/xmlrpc.php',
  '/phpinfo',
  '/phpmyadmin',
  '/vendor/phpunit',
];

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname.toLowerCase();

  if (
    BLOCKED_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    pathname.endsWith('.env') ||
    pathname.endsWith('.sql') ||
    pathname.endsWith('.bak')
  ) {
    return new NextResponse('Forbidden', {
      status: 403,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  }

  return NextResponse.next();
}

