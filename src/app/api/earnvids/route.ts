import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserFromRequest } from '@/lib/db';
import { unpackDeanEdwards } from '@/app/api/streamwish/route';

const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function extractEarnVidsStreamAndMeta(
  source: string,
  originUrl: string
): {
  streamingUrl: string | null;
  thumbnail: string | null;
} {
  let streamingUrl: string | null = null;
  let thumbnail: string | null = null;

  // 1. EarnVids / VidHide suele estructurar las fuentes en un objeto `links`:
  // links={"hls4": ".../master.m3u8", "hls2": "https://.../master.m3u8?t=..."}
  const hls2Match = source.match(
    /["']?hls2["']?\s*:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i
  );
  const hls4Match = source.match(
    /["']?hls4["']?\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i
  );
  const genericM3u8Match = source.match(
    /(https?:\/\/[^\s"'<>\\]+\.m3u8[^\s"'<>\\]*)/i
  );

  if (hls2Match?.[1]) {
    streamingUrl = hls2Match[1];
  } else if (hls4Match?.[1]) {
    const raw = hls4Match[1];
    if (raw.startsWith('http')) {
      streamingUrl = raw;
    } else {
      try {
        streamingUrl = new URL(raw, originUrl).toString();
      } catch {
        streamingUrl = null;
      }
    }
  } else if (genericM3u8Match?.[1]) {
    streamingUrl = genericM3u8Match[1];
  }

  // Extraer miniatura / póster
  const imgMatch = source.match(
    /(?:image|poster)\s*:\s*["'](https?:\/\/[^"']+)["']/i
  );
  if (imgMatch?.[1]) {
    thumbnail = imgMatch[1];
  }

  return { streamingUrl, thumbnail };
}

export async function resolveEarnVidsUrl(
  targetUrl?: string,
  rawFilecode?: string
) {
  let filecode = (rawFilecode || '').trim();
  if (filecode.toLowerCase() === 'embed') {
    filecode = '';
  }

  if (!filecode && targetUrl) {
    const pathMatch = targetUrl.match(/\/(?:embed|e|v|d)\/([a-zA-Z0-9_-]+)/i);
    if (pathMatch && pathMatch[1] && pathMatch[1].toLowerCase() !== 'embed') {
      filecode = pathMatch[1];
    } else {
      try {
        const parsed = new URL(targetUrl.trim());
        const segments = parsed.pathname.split('/').filter(Boolean);
        const last = segments[segments.length - 1];
        if (last && last.toLowerCase() !== 'embed' && last.toLowerCase() !== 'e') {
          filecode = last;
        }
      } catch {
        // ignore
      }
    }
  }

  const embedUrl = filecode
    ? `https://morencius.com/embed/${filecode}`
    : (targetUrl || '').trim();

  const uri = new URL(embedUrl);

  const response = await fetch(embedUrl, {
    method: 'GET',
    headers: {
      'User-Agent': BROWSER_USER_AGENT,
      Referer: `${uri.origin}/`,
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    return {
      filecode: filecode || null,
      embed_url: embedUrl,
      streaming_url: null,
      thumbnail: null,
      fallback_embed: embedUrl,
    };
  }

  const html = await response.text();

  // 1. Probar en texto plano
  let { streamingUrl, thumbnail } = extractEarnVidsStreamAndMeta(html, embedUrl);

  // 2. Si no, desempaquetar con Dean Edwards
  if (!streamingUrl) {
    const unpacked = unpackDeanEdwards(html);
    if (unpacked) {
      const extracted = extractEarnVidsStreamAndMeta(unpacked, embedUrl);
      streamingUrl = extracted.streamingUrl;
      if (extracted.thumbnail) thumbnail = extracted.thumbnail;
    }
  }

  return {
    filecode: filecode || null,
    embed_url: embedUrl,
    streaming_url: streamingUrl,
    thumbnail,
    fallback_embed: embedUrl,
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

    const result = await resolveEarnVidsUrl(rawUrl, filecode);
    return NextResponse.json({
      success: Boolean(result.streaming_url),
      ...result,
    });
  } catch (error: unknown) {
    console.error('Error in GET /api/earnvids:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al extraer stream de EarnVids',
      },
      { status: 500 }
    );
  }
}
