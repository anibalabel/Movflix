import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserFromRequest } from '@/lib/db';

const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/**
 * Desempaqueta bloques ofuscados con Dean Edwards Packer:
 * eval(function(p,a,c,k,e,d){while(c--)if(k[c])p=p.replace(new RegExp('\\b'+c.toString(a)+'\\b','g'),k[c]);return p}('...',36,507,'...'.split('|')))
 * Funciona 100% en puro JavaScript (compatible con Cloudflare Workers donde eval() está bloqueado).
 */
export function unpackDeanEdwards(html: string): string | null {
  const packedRegex =
    /eval\(function\(p,a,c,k,e,d\)\{[\s\S]*?\}\('([\s\S]*?)',\s*(\d+),\s*(\d+),\s*'([\s\S]*?)'\.split\('\|'\)\)\)/i;
  const match = html.match(packedRegex);
  if (!match) return null;

  let payload = match[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\');
  const radix = parseInt(match[2], 10);
  let count = parseInt(match[3], 10);
  const symtab = match[4].split('|');

  const encodeBase = (num: number, base: number): string => {
    if (base <= 36) return num.toString(base);
    const chars =
      '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let out = '';
    let n = num;
    do {
      out = chars[n % base] + out;
      n = Math.floor(n / base);
    } while (n > 0);
    return out;
  };

  while (count--) {
    if (symtab[count]) {
      const token = encodeBase(count, radix);
      payload = payload.replace(new RegExp(`\\b${token}\\b`, 'g'), symtab[count]);
    }
  }

  return payload;
}

function extractM3u8AndMetaFromSource(
  source: string,
  originUrl: string
): {
  streamingUrl: string | null;
  thumbnail: string | null;
} {
  let streamingUrl: string | null = null;
  let thumbnail: string | null = null;

  // 1. Buscar en objeto `links = {"hls4": "...", "hls2": "..."}` o `file: "...m3u8..."`
  const hls4Match = source.match(
    /["']?hls4["']?\s*:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i
  );
  const hls2Match = source.match(
    /["']?hls2["']?\s*:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i
  );
  const fileMatch = source.match(
    /file\s*:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i
  );
  const genericM3u8Match = source.match(
    /(https?:\/\/[^\s"'<>\\]+\.m3u8[^\s"'<>\\]*)/i
  );

  const rawM3u8 =
    hls4Match?.[1] ||
    hls2Match?.[1] ||
    fileMatch?.[1] ||
    genericM3u8Match?.[1] ||
    null;

  if (rawM3u8) {
    streamingUrl = rawM3u8;
  } else {
    // Algunas variantes usan rutas relativas `/stream/.../master.m3u8`
    const relMatch = source.match(/["'](\/[^"']+\.m3u8[^"']*)["']/i);
    if (relMatch?.[1]) {
      try {
        streamingUrl = new URL(relMatch[1], originUrl).toString();
      } catch {
        streamingUrl = null;
      }
    }
  }

  // Extraer imagen/poster del reproductor si existe (`image: "https://..."`)
  const imgMatch = source.match(/image\s*:\s*["'](https?:\/\/[^"']+)["']/i);
  if (imgMatch?.[1]) {
    thumbnail = imgMatch[1];
  }

  return { streamingUrl, thumbnail };
}

async function fetchAndExtractFromEmbedUrl(embedUrl: string) {
  const parsedOrigin = new URL(embedUrl);
  const response = await fetch(embedUrl, {
    method: 'GET',
    headers: {
      'User-Agent': BROWSER_USER_AGENT,
      Referer: `${parsedOrigin.origin}/`,
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

  // Forma A: Buscar directamente en el HTML en texto plano
  let { streamingUrl, thumbnail } = extractM3u8AndMetaFromSource(
    html,
    response.url || embedUrl
  );

  // Forma B: Si no está en texto plano, desempaquetar el bloque eval(function(p,a,c,k,e,d)...)
  if (!streamingUrl) {
    const unpacked = unpackDeanEdwards(html);
    if (unpacked) {
      const extracted = extractM3u8AndMetaFromSource(
        unpacked,
        response.url || embedUrl
      );
      streamingUrl = extracted.streamingUrl;
      if (extracted.thumbnail) {
        thumbnail = extracted.thumbnail;
      }
    }
  }

  return { streamingUrl, thumbnail };
}

export async function resolveStreamWishUrl(
  targetUrl?: string,
  rawFilecode?: string
) {
  let filecode = (rawFilecode || '').trim();
  if (!filecode && targetUrl) {
    const match = targetUrl.match(
      /\/(?:e|v|f|d|embed)\/([a-zA-Z0-9_-]+)/i
    );
    if (match?.[1]) {
      filecode = match[1];
    }
  }

  const canonicalEmbedUrl = filecode
    ? `https://streamwish.fun/e/${filecode}`
    : (targetUrl || '').trim();

  // 1. Intentar primero desde el dominio activo principal https://streamwish.fun/e/{filecode}
  let { streamingUrl, thumbnail } = await fetchAndExtractFromEmbedUrl(
    canonicalEmbedUrl
  );

  // 2. Si no se encontró y la URL original era de otro espejo, intentar con la URL original
  if (
    !streamingUrl &&
    targetUrl &&
    targetUrl.trim() !== '' &&
    targetUrl.trim() !== canonicalEmbedUrl
  ) {
    const fallbackResult = await fetchAndExtractFromEmbedUrl(targetUrl.trim());
    streamingUrl = fallbackResult.streamingUrl;
    if (fallbackResult.thumbnail) {
      thumbnail = fallbackResult.thumbnail;
    }
  }

  return {
    filecode: filecode || null,
    embed_url: canonicalEmbedUrl,
    streaming_url: streamingUrl,
    thumbnail,
    fallback_embed: canonicalEmbedUrl,
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

    const result = await resolveStreamWishUrl(rawUrl, filecode);
    return NextResponse.json({
      success: Boolean(result.streaming_url),
      ...result,
    });
  } catch (error: unknown) {
    console.error('Error in GET /api/streamwish:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error al extraer el enlace .m3u8 de StreamWish',
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

    const result = await resolveStreamWishUrl(rawUrl, filecode);
    return NextResponse.json({
      success: Boolean(result.streaming_url),
      ...result,
    });
  } catch (error: unknown) {
    console.error('Error in POST /api/streamwish:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error al extraer el enlace .m3u8 de StreamWish',
      },
      { status: 500 }
    );
  }
}
