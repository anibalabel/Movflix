import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserFromRequest } from '@/lib/db';
import { unpackDeanEdwards } from '@/app/api/streamwish/route';

const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function extractUqloadStreamAndMeta(source: string): {
  streamingUrl: string | null;
  thumbnail: string | null;
} {
  let streamingUrl: string | null = null;
  let thumbnail: string | null = null;

  // 1. Expresión regular específica para Uqload (.m3u8 con todos sus parámetros ?t=...&s=...&e=...)
  const regexUqloadM3u8 =
    /(https?:\/\/[a-zA-Z0-9.-]+\.uqload\.[a-z]+\/[^"'\s<>\\]+\.m3u8[^"'\s<>\\]*)/i;
  const fileM3u8Match = source.match(
    /file\s*:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i
  );
  const sourcesArrayMatch = source.match(
    /sources\s*:\s*\[\s*["'](https?:\/\/[^"']+\.(?:m3u8|mp4)[^"']*)["']/i
  );

  const m3u8Match = source.match(regexUqloadM3u8);
  streamingUrl =
    m3u8Match?.[1] ||
    fileM3u8Match?.[1] ||
    sourcesArrayMatch?.[1] ||
    null;

  // Extraer miniatura (`image: "https://..."` o `poster: "https://..."`)
  const imgMatch = source.match(
    /(?:image|poster)\s*:\s*["'](https?:\/\/[^"']+)["']/i
  );
  if (imgMatch?.[1]) {
    thumbnail = imgMatch[1];
  }

  return { streamingUrl, thumbnail };
}

async function fetchUqloadPage(url: string) {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': BROWSER_USER_AGENT,
      Referer: 'https://uqload.vc/',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    return { streamingUrl: null, thumbnail: null };
  }

  const html = await response.text();

  // 1. Buscar directamente en texto plano en el HTML
  let { streamingUrl, thumbnail } = extractUqloadStreamAndMeta(html);

  // 2. Si está empaquetado con Dean Edwards eval(function(p,a,c,k,e,d)...), desempaquetar y extraer
  if (!streamingUrl) {
    const unpacked = unpackDeanEdwards(html);
    if (unpacked) {
      const extracted = extractUqloadStreamAndMeta(unpacked);
      streamingUrl = extracted.streamingUrl;
      if (extracted.thumbnail) {
        thumbnail = extracted.thumbnail;
      }
    }
  }

  return { streamingUrl, thumbnail };
}

export async function resolveUqloadUrl(
  targetUrl?: string,
  rawFilecode?: string
) {
  let filecode = (rawFilecode || '').trim();
  if (!filecode && targetUrl) {
    const match = targetUrl.match(
      /(?:embed-|\/(?:e|v|d|embed)\/)([a-zA-Z0-9_-]+)/i
    );
    if (match?.[1]) {
      filecode = match[1];
    }
  }

  // En Uqload, `https://uqload.vc/{filecode}.html` entrega directamente el bloque del reproductor con el `.m3u8?t=...&s=...&e=...`
  // sin el bloqueo "Video embed restricted for this domain" de `/embed-{code}.html`
  const directWatchUrl = filecode
    ? `https://uqload.vc/${filecode}.html`
    : (targetUrl || '').trim();
  const fallbackEmbedUrl = filecode
    ? `https://uqload.vc/e/${filecode}`
    : (targetUrl || '').trim();

  let { streamingUrl, thumbnail } = await fetchUqloadPage(directWatchUrl);

  if (
    !streamingUrl &&
    targetUrl &&
    targetUrl.trim() !== '' &&
    targetUrl.trim() !== directWatchUrl
  ) {
    const fallbackRes = await fetchUqloadPage(targetUrl.trim());
    streamingUrl = fallbackRes.streamingUrl;
    if (fallbackRes.thumbnail) {
      thumbnail = fallbackRes.thumbnail;
    }
  }

  return {
    filecode: filecode || null,
    embed_url: fallbackEmbedUrl,
    streaming_url: streamingUrl,
    thumbnail,
    fallback_embed: fallbackEmbedUrl,
  };
}

export async function GET(request: NextRequest) {
  const sessionUser = getSessionUserFromRequest(request);
  if (!sessionUser || !sessionUser.id) {
    return NextResponse.json(
      {
        success: false,
        requiresAuth: true,
        error:
          'Debes iniciar sesión con tu cuenta para reproducir servidores en Stream Directo (Sin Anuncios).',
      },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const rawUrl = (searchParams.get('url') || '').trim();
    const filecode = (searchParams.get('filecode') || '').trim();

    if (!rawUrl && !filecode) {
      return NextResponse.json(
        { success: false, error: 'Se requiere el parámetro url o filecode' },
        { status: 400 }
      );
    }

    const result = await resolveUqloadUrl(rawUrl, filecode);
    return NextResponse.json({
      success: Boolean(result.streaming_url),
      ...result,
    });
  } catch (error: unknown) {
    console.error('Error in GET /api/uqload:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error al extraer el enlace .m3u8 de Uqload',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const sessionUser = getSessionUserFromRequest(request);
  if (!sessionUser || !sessionUser.id) {
    return NextResponse.json(
      {
        success: false,
        requiresAuth: true,
        error:
          'Debes iniciar sesión con tu cuenta para reproducir servidores en Stream Directo (Sin Anuncios).',
      },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const rawUrl = String(body.url || '').trim();
    const filecode = String(body.filecode || '').trim();

    if (!rawUrl && !filecode) {
      return NextResponse.json(
        { success: false, error: 'Se requiere el campo url o filecode' },
        { status: 400 }
      );
    }

    const result = await resolveUqloadUrl(rawUrl, filecode);
    return NextResponse.json({
      success: Boolean(result.streaming_url),
      ...result,
    });
  } catch (error: unknown) {
    console.error('Error in POST /api/uqload:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error al extraer el enlace .m3u8 de Uqload',
      },
      { status: 500 }
    );
  }
}

