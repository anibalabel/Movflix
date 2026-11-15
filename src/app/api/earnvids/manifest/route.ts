import { NextRequest, NextResponse } from 'next/server';
import {
  EARNVIDS_USER_AGENT,
  verifySignedManifestParams,
  rewriteHlsManifest,
} from '@/lib/earnvids-manifest';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetUrl = (searchParams.get('url') || '').trim();
    const referer = (searchParams.get('ref') || '').trim();
    const exp = (searchParams.get('exp') || '').trim();
    const sig = (searchParams.get('sig') || '').trim();

    if (!verifySignedManifestParams(targetUrl, referer, exp, sig)) {
      return NextResponse.json(
        { error: 'Enlace de manifiesto inválido o expirado' },
        { status: 403, headers: CORS_HEADERS }
      );
    }

    const upstream = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': EARNVIDS_USER_AGENT,
        Referer: referer,
        Accept: '*/*',
      },
      cache: 'no-store',
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream respondió HTTP ${upstream.status}` },
        { status: upstream.status, headers: CORS_HEADERS }
      );
    }

    const finalUrl = upstream.url || targetUrl;
    const contentType = upstream.headers.get('content-type') || '';
    const isPlaylistUrl = /\.m3u8(\?|$)/i.test(finalUrl);
    const isPlaylistType =
      contentType.toLowerCase().includes('mpegurl') ||
      contentType.toLowerCase().includes('text/plain');

    if (isPlaylistUrl || isPlaylistType) {
      const text = await upstream.text();
      if (text.trimStart().startsWith('#EXTM3U') || isPlaylistUrl) {
        const rewritten = rewriteHlsManifest(text, finalUrl, referer);
        return new NextResponse(rewritten, {
          status: 200,
          headers: {
            ...CORS_HEADERS,
            'Content-Type': 'application/vnd.apple.mpegurl; charset=utf-8',
            'Cache-Control': 'no-store',
          },
        });
      }
      return new NextResponse(text, {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': contentType || 'text/plain; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      });
    }

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': contentType || 'application/octet-stream',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: unknown) {
    console.error('Error in GET /api/earnvids/manifest:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Error al obtener manifiesto HLS',
      },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
