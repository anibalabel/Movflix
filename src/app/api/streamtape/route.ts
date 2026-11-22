import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserFromRequest } from '@/lib/db';

const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';

const STREAMTAPE_ALLOWED_HOSTS = [
  'streamtape',
  'gettapeads',
  'tapewithadblock',
  'tapeadsenjoyer',
  'adblocktape',
  'watchadsontape',
  'shavetapeads',
  'antiadtape',
  'streamta.pe',
  'stape.',
];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isAllowedStreamtapeUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    return STREAMTAPE_ALLOWED_HOSTS.some((kw) => host.includes(kw));
  } catch {
    return false;
  }
}

/**
 * Evalúa concatenaciones simples de literales JS + `.substring(...)` usadas por Streamtape
 * (p. ej. `"//streamtape.com/get_video?id=..." + ('xcdtoken=abc').substring(3)`).
 */
function evaluateStreamtapeJsConcat(expr: string): string | null {
  const parts: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  let escaped = false;

  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (escaped) {
      current += ch;
      escaped = false;
      continue;
    }
    if (ch === '\\' && quote) {
      current += ch;
      escaped = true;
      continue;
    }
    if ((ch === '"' || ch === "'") && (!quote || quote === ch)) {
      quote = quote === ch ? null : ch;
      current += ch;
      continue;
    }
    if (ch === '+' && !quote) {
      parts.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) {
    parts.push(current.trim());
  }
  if (parts.length === 0) return null;

  let output = '';
  for (const part of parts) {
    const termMatch = part.match(
      /^(?:\(\s*)?(['"])((?:\\.|[^\\])*?)\1(?:\s*\))?((?:\s*\.\s*substring\(\s*\d+(?:\s*,\s*\d+)?\s*\))*)$/
    );
    if (!termMatch) {
      return null;
    }

    let literal = termMatch[2]
      .replace(/\\(['"\\])/g, '$1')
      .replace(/\\\//g, '/');

    const subCalls = termMatch[3] || '';
    const subRegex = /\.substring\(\s*(\d+)(?:\s*,\s*(\d+))?\s*\)/g;
    let subMatch: RegExpExecArray | null;
    while ((subMatch = subRegex.exec(subCalls)) !== null) {
      const start = Number(subMatch[1]);
      const end = subMatch[2] !== undefined ? Number(subMatch[2]) : undefined;
      literal = literal.substring(start, end);
    }

    output += literal;
  }

  return output || null;
}

function normalizeGetVideoUrl(rawPartial: string): string {
  let finalUrl = `https://${rawPartial
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^\/+/, '')}`;
  if (!/[?&]dl=1(?:&|$)/i.test(finalUrl)) {
    finalUrl += finalUrl.includes('?') ? '&dl=1' : '?dl=1';
  }
  return finalUrl;
}

function extractStreamtapeStreamAndMeta(html: string): {
  streamingUrl: string | null;
  thumbnail: string | null;
} {
  let streamingUrl: string | null = null;
  let thumbnail: string | null = null;

  // Extraer miniatura del tag <video id="mainvideo" poster="..."> o metadatos
  const posterMatch =
    html.match(/<video[^>]+poster=["'](https?:\/\/[^"']+)["']/i) ||
    html.match(
      /<meta[^>]+property=["']og:image["'][^>]+content=["'](https?:\/\/[^"']+)["']/i
    ) ||
    html.match(/(?:image|poster)\s*:\s*["'](https?:\/\/[^"']+)["']/i);
  if (posterMatch?.[1]) {
    thumbnail = posterMatch[1];
  }

  // Paso 1: localizar elemento oculto (*link) y su parte inicial hasta `token=`
  const elemMatch =
    html.match(
      /id=["']([^"']+link)["'][^>]*style=["'][^"']*display:\s*none;?[^"']*["'][^>]*>([^<]*)/i
    ) ||
    html.match(
      /style=["'][^"']*display:\s*none;?[^"']*["'][^>]*id=["']([^"']+link)["'][^>]*>([^<]*)/i
    );

  const linkId = elemMatch?.[1] || null;
  const hiddenInner = elemMatch?.[2] || '';
  const part1Match = hiddenInner.match(/(.*?token=)[^&<]*/i);

  // Paso 2A: evaluar expresión JS completa `document.getElementById(id).innerHTML = "..." + ('...').substring(...)`
  const candidateIds = linkId
    ? [linkId]
    : ['robotlink', 'norobotlink', 'ideoooolink'];
  for (const id of candidateIds) {
    const rhsRegex = new RegExp(
      `document\\.getElementById\\(\\s*['"]${escapeRegex(id)}['"]\\s*\\)\\.innerHTML\\s*=\\s*([^;\\r\\n]+)`,
      'i'
    );
    const rhsMatch = html.match(rhsRegex);
    if (rhsMatch?.[1]) {
      const evaluated = evaluateStreamtapeJsConcat(rhsMatch[1]);
      if (
        evaluated &&
        evaluated.includes('get_video') &&
        evaluated.includes('token=')
      ) {
        streamingUrl = normalizeGetVideoUrl(evaluated);
        break;
      }
    }
  }

  // Paso 2B: reconstrucción directa part1 (HTML) + part2 (token=... en script), idéntica al extractor base
  if (!streamingUrl && linkId && part1Match?.[1]) {
    const escapedId = escapeRegex(linkId);
    const tokenRegex = new RegExp(
      `document\\.getElementById\\(\\s*['"]${escapedId}['"]\\s*\\)\\.innerHTML\\s*=\\s*.*?token=([\\w-]+)`,
      'i'
    );
    const tokenMatch = html.match(tokenRegex);
    if (tokenMatch?.[1]) {
      streamingUrl = normalizeGetVideoUrl(`${part1Match[1]}${tokenMatch[1]}`);
    }
  }

  return { streamingUrl, thumbnail };
}

async function resolveRedirectLocation(
  videoUrl: string,
  referer: string
): Promise<string> {
  try {
    const res = await fetch(videoUrl, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        'User-Agent': BROWSER_USER_AGENT,
        Referer: referer,
      },
      cache: 'no-store',
    });
    res.body?.cancel().catch(() => {});

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (location) {
        const resolved = new URL(location, videoUrl).toString();
        if (
          resolved.startsWith('https://') &&
          !resolved.toLowerCase().includes('/404')
        ) {
          return resolved;
        }
      }
    }
  } catch {
    // Mantener la URL get_video construida si falla la resolución previa de redirección
  }
  return videoUrl;
}

async function fetchStreamtapePage(embedUrl: string): Promise<{
  streamingUrl: string | null;
  thumbnail: string | null;
  status: number;
  finalUrl: string;
}> {
  const parsed = new URL(embedUrl);
  const response = await fetch(embedUrl, {
    method: 'GET',
    headers: {
      'User-Agent': BROWSER_USER_AGENT,
      Referer: `${parsed.origin}/`,
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
  const { streamingUrl, thumbnail } = extractStreamtapeStreamAndMeta(html);
  const resolvedUrl = streamingUrl
    ? await resolveRedirectLocation(streamingUrl, finalUrl)
    : null;

  return {
    streamingUrl: resolvedUrl,
    thumbnail,
    status: response.status,
    finalUrl,
  };
}

async function resolveStreamtapeUrl(
  targetUrl?: string,
  rawFilecode?: string
) {
  let filecode = (rawFilecode || '').trim();

  if (!filecode && targetUrl) {
    const match = targetUrl.match(/\/(?:e|v|embed|d)\/([a-zA-Z0-9_-]+)/i);
    if (match?.[1]) {
      filecode = match[1];
    }
  }

  const primaryEmbed = filecode
    ? `https://streamtape.com/e/${filecode}`
    : (targetUrl || '').trim();

  const candidateUrls: string[] = [];
  const pushUnique = (u?: string) => {
    const clean = (u || '').trim();
    if (clean && isAllowedStreamtapeUrl(clean) && !candidateUrls.includes(clean)) {
      candidateUrls.push(clean);
    }
  };

  pushUnique(targetUrl);
  pushUnique(primaryEmbed);
  if (filecode) {
    pushUnique(`https://gettapeads.com/e/${filecode}`);
    pushUnique(`https://streamtape.to/e/${filecode}`);
    pushUnique(`https://tapewithadblock.org/e/${filecode}`);
  }

  let streamingUrl: string | null = null;
  let thumbnail: string | null = null;
  let usedEmbed = primaryEmbed;

  for (const candidate of candidateUrls) {
    try {
      const res = await fetchStreamtapePage(candidate);
      if (res.thumbnail && !thumbnail) {
        thumbnail = res.thumbnail;
      }
      if (res.streamingUrl) {
        streamingUrl = res.streamingUrl;
        usedEmbed = res.finalUrl || candidate;
        break;
      }
    } catch {
      // Continuar con el siguiente dominio espejo
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

async function handleStreamtapeRequest(
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

    const result = await resolveStreamtapeUrl(rawUrl, filecode);
    return NextResponse.json(
      {
        success: Boolean(result.streaming_url),
        ...result,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: unknown) {
    console.error('Error in /api/streamtape:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error al extraer el stream de Streamtape',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleStreamtapeRequest(request, async () => {
    const { searchParams } = new URL(request.url);
    return {
      rawUrl: (searchParams.get('url') || '').trim(),
      filecode: (searchParams.get('filecode') || '').trim(),
    };
  });
}

export async function POST(request: NextRequest) {
  return handleStreamtapeRequest(request, async () => {
    const body = await request.json();
    return {
      rawUrl: String(body.url || '').trim(),
      filecode: String(body.filecode || '').trim(),
    };
  });
}
