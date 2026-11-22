import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserFromRequest } from '@/lib/db';

const DESKTOP_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

function isAllowedVidsonicUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return false;
    }
    return parsed.hostname.toLowerCase().includes('vidsonic');
  } catch {
    return false;
  }
}

/**
 * Decodifica la cadena ofuscada de Vidsonic:
 * 1. Elimina los separadores `|`
 * 2. Convierte pares hexadecimales a caracteres
 * 3. Invierte la cadena resultante y valida que comience por http(s)://
 */
function decodeVidsonic(encoded: string): string | null {
  try {
    const clean = encoded.replace(/\|/g, '').trim();
    if (clean.length < 16) return null;

    let out = '';
    for (let i = 0; i + 1 < clean.length; i += 2) {
      const byte = parseInt(clean.slice(i, i + 2), 16);
      if (Number.isNaN(byte)) {
        return null;
      }
      out += String.fromCharCode(byte);
    }

    const result = out.split('').reverse().join('');
    if (result.startsWith('http://') || result.startsWith('https://')) {
      return result;
    }
    return null;
  } catch {
    return null;
  }
}

function extractVidsonicStreamAndMeta(html: string): {
  streamingUrl: string | null;
  thumbnail: string | null;
} {
  let streamingUrl: string | null = null;
  let thumbnail: string | null = null;

  // Extraer miniatura/póster si viene en el HTML
  const posterMatch =
    html.match(/(?:image|poster)\s*[:=]\s*["'](https?:\/\/[^"']+)["']/i) ||
    html.match(
      /<meta[^>]+property=["']og:image["'][^>]+content=["'](https?:\/\/[^"']+)["']/i
    );
  if (posterMatch?.[1]) {
    thumbnail = posterMatch[1];
  }

  // Método 1: Variable `_0x1` (`const _0x1 = '...'`, `let _0x1 = '...'` o `var _0x1 = '...'`)
  const varMatches = html.matchAll(
    /(?:const|let|var)\s+_0x1\s*=\s*(['"])([^'"]+)\1/g
  );
  for (const m of varMatches) {
    const decoded = decodeVidsonic(m[2]);
    if (decoded) {
      streamingUrl = decoded;
      break;
    }
  }

  // Método 2 (fallback): Cadena hexadecimal larga con pipes (`[0-9a-fA-F|]{50,}`)
  if (!streamingUrl) {
    const hexMatches = html.matchAll(/(['"])([0-9a-fA-F|]{50,})\1/g);
    for (const m of hexMatches) {
      const candidate = m[2];
      if (candidate.includes('|') && candidate.length > 100) {
        const decoded = decodeVidsonic(candidate);
        if (decoded) {
          streamingUrl = decoded;
          break;
        }
      }
    }
  }

  return { streamingUrl, thumbnail };
}

async function fetchVidsonicPage(embedUrl: string): Promise<{
  streamingUrl: string | null;
  thumbnail: string | null;
  status: number;
  finalUrl: string;
}> {
  const response = await fetch(embedUrl, {
    method: 'GET',
    headers: {
      'User-Agent': DESKTOP_USER_AGENT,
      Referer: 'https://vidsonic.net/',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    },
    cache: 'no-store',
  });

  const finalUrl = response.url || embedUrl;
  if (!response.ok) {
    return {
      streamingUrl: null,
      thumbnail: null,
      status: response.status,
      finalUrl,
    };
  }

  const html = await response.text();
  const { streamingUrl, thumbnail } = extractVidsonicStreamAndMeta(html);

  return {
    streamingUrl,
    thumbnail,
    status: response.status,
    finalUrl,
  };
}

async function resolveVidsonicUrl(targetUrl?: string, rawFilecode?: string) {
  let filecode = (rawFilecode || '').trim();

  if (!filecode && targetUrl) {
    const match = targetUrl.match(
      /(?:embed-|\/(?:e|v|d|embed)\/)([a-zA-Z0-9_-]+)(?:\.html)?/i
    );
    if (match?.[1]) {
      filecode = match[1];
    } else {
      try {
        const parsed = new URL(targetUrl.trim());
        const segments = parsed.pathname.split('/').filter(Boolean);
        const last = segments[segments.length - 1]?.replace(/\.html$/i, '');
        if (last && last.toLowerCase() !== 'embed' && last.toLowerCase() !== 'e') {
          filecode = last;
        }
      } catch {
        // ignore
      }
    }
  }

  const normalizedTarget = (targetUrl || '')
    .trim()
    .replace(/vidsonic\.org/gi, 'vidsonic.net');
  const primaryEmbed =
    normalizedTarget && isAllowedVidsonicUrl(normalizedTarget)
      ? normalizedTarget
      : filecode
      ? `https://vidsonic.net/e/${filecode}`
      : '';

  const candidateUrls: string[] = [];
  const pushUnique = (u?: string) => {
    const clean = (u || '').trim();
    if (clean && isAllowedVidsonicUrl(clean) && !candidateUrls.includes(clean)) {
      candidateUrls.push(clean);
    }
  };

  pushUnique(normalizedTarget);
  pushUnique(targetUrl);
  if (filecode) {
    pushUnique(`https://vidsonic.net/e/${filecode}`);
    pushUnique(`https://vidsonic.net/embed-${filecode}.html`);
    pushUnique(`https://vidsonic.net/v/${filecode}`);
  }

  let streamingUrl: string | null = null;
  let thumbnail: string | null = null;
  let usedEmbed = primaryEmbed;

  for (const candidate of candidateUrls) {
    try {
      const res = await fetchVidsonicPage(candidate);
      if (res.thumbnail && !thumbnail) {
        thumbnail = res.thumbnail;
      }
      if (res.streamingUrl) {
        streamingUrl = res.streamingUrl;
        usedEmbed = res.finalUrl || candidate;
        break;
      }
    } catch {
      // Continuar con la siguiente variante de URL
    }
  }

  return {
    filecode: filecode || null,
    embed_url: usedEmbed,
    streaming_url: streamingUrl,
    thumbnail,
    fallback_embed: primaryEmbed || usedEmbed,
  };
}

async function handleVidsonicRequest(
  request: NextRequest,
  getParams: () => Promise<{ rawUrl: string; filecode: string }>
) {
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
    const { rawUrl, filecode } = await getParams();

    if (!rawUrl && !filecode) {
      return NextResponse.json(
        { success: false, error: 'Se requiere el parámetro url o filecode' },
        { status: 400 }
      );
    }

    const result = await resolveVidsonicUrl(rawUrl, filecode);
    return NextResponse.json(
      {
        success: Boolean(result.streaming_url),
        ...result,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: unknown) {
    console.error('Error in /api/vidsonic:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error al extraer el stream de Vidsonic',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleVidsonicRequest(request, async () => {
    const { searchParams } = new URL(request.url);
    return {
      rawUrl: (searchParams.get('url') || '').trim(),
      filecode: (searchParams.get('filecode') || '').trim(),
    };
  });
}

export async function POST(request: NextRequest) {
  return handleVidsonicRequest(request, async () => {
    const body = await request.json();
    return {
      rawUrl: String(body.url || '').trim(),
      filecode: String(body.filecode || '').trim(),
    };
  });
}
