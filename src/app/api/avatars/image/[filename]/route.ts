import { NextResponse } from 'next/server';

export async function GET() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#dc2626" />
        <stop offset="100%" stop-color="#7f1d1d" />
      </linearGradient>
    </defs>
    <rect width="128" height="128" rx="64" fill="url(#bg)" />
    <circle cx="64" cy="48" r="22" fill="#ffffff" fill-opacity="0.92" />
    <path d="M26 108c4-22 21-34 38-34s34 12 38 34" fill="#ffffff" fill-opacity="0.92" />
  </svg>`;

  return new NextResponse(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}

