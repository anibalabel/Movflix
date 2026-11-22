import { NextRequest, NextResponse } from 'next/server';
import { verifySignedProxyParams } from '@/lib/earnvids-manifest';

const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Range, Content-Type',
  'Access-Control-Expose-Headers':
    'Content-Length, Content-Range, Accept-Ranges, Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

async function handleProxyStream(
  request: NextRequest,
  method: 'GET' | 'HEAD'
) {
  try {
    const { searchParams } = new URL(request.url);
    const targetUrl = (searchParams.get('url') || '').trim();
    const referer = (searchParams.get('ref') || '').trim();
    const exp = (searchParams.get('exp') || '').trim();
    const sig = (searchParams.get('sig') || '').trim();
    const extra = searchParams.get('ex') || '';

    if (!verifySignedProxyParams(targetUrl, referer, exp, sig, extra)) {
      return NextResponse.json(
        { error: 'Enlace de stream inválido o expirado' },
        { status: 403, headers: CORS_HEADERS }
      );
    }

    const upstreamHeaders: Record<string, string> = {
      'User-Agent': BROWSER_USER_AGENT,
      Referer: referer,
      Accept: '*/*',
    };

    const range = request.headers.get('range');
    if (range) {
      upstreamHeaders.Range = range;
    }
    if (extra) {
      upstreamHeaders.Cookie = extra;
    }

    const upstream = await fetch(targetUrl, {
      method,
      headers: upstreamHeaders,
      redirect: 'follow',
      cache: 'no-store',
    });

    const contentType = (upstream.headers.get('content-type') || '').toLowerCase();
    const isErrorPayload =
      contentType.includes('text/html') || contentType.includes('application/json');

    if (!upstream.ok || isErrorPayload) {
      upstream.body?.cancel().catch(() => {});
      return NextResponse.json(
        { error: `Streamtape respondió HTTP ${upstream.status}` },
        { status: 403, headers: CORS_HEADERS }
      );
    }

    const outHeaders = new Headers(CORS_HEADERS);
    outHeaders.set(
      'Content-Type',
      upstream.headers.get('content-type') || 'video/mp4'
    );
    outHeaders.set(
      'Accept-Ranges',
      upstream.headers.get('accept-ranges') || 'bytes'
    );
    outHeaders.set('Cache-Control', 'no-store');

    const contentLength = upstream.headers.get('content-length');
    if (contentLength) {
      outHeaders.set('Content-Length', contentLength);
    }
    const contentRange = upstream.headers.get('content-range');
    if (contentRange) {
      outHeaders.set('Content-Range', contentRange);
    }

    return new NextResponse(method === 'HEAD' ? null : upstream.body, {
      status: upstream.status,
      headers: outHeaders,
    });
  } catch (error: unknown) {
    console.error('Error in /api/streamtape/stream:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Error al retransmitir stream de Streamtape',
      },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function HEAD(request: NextRequest) {
  return handleProxyStream(request, 'HEAD');
}

export async function GET(request: NextRequest) {
  return handleProxyStream(request, 'GET');
}
