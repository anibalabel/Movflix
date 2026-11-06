import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const cookie = request.cookies.get('dooplex_session')?.value;
  if (!cookie) {
    return NextResponse.json({ authenticated: false, user: null });
  }
  try {
    const user = JSON.parse(Buffer.from(cookie, 'base64').toString('utf8'));
    return NextResponse.json({ authenticated: true, user });
  } catch {
    return NextResponse.json({ authenticated: false, user: null });
  }
}

