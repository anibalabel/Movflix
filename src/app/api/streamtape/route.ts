import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserFromRequest } from '@/lib/db';
import { buildSignedProxyUrl } from '@/lib/earnvids-manifest';

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

function splitTopLevelPlus(expr: string): string[] {
  const parts: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  let escaped = false;
  let depth = 0;

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
    if (!quote) {
      if (ch === '(') depth++;
      else if (ch === ')' && depth > 0) depth--;
      else if (ch === '+' && depth === 0) {
        parts.push(current.trim());
        current = '';
        continue;
      }
    }
    current += ch;
  }
  if (current.trim()) {
    parts.push(current.trim());
  }
  return parts;
}

/**
 * Evalúa recursivamente concatenaciones de literales JS + `.substring(...)` / `.slice(...)`
 * (incluyendo paréntesis anidados usados por Streamtape en `innerHTML = ...`).
 */
function evaluateStreamtapeJsExpr(rawExpr: string): string | null {
  const expr = rawExpr.trim();
  if (!expr) return null;

  const parts = splitTopLevelPlus(expr);
  if (parts.length > 1) {
    let out = '';
    for (const part of parts) {
      const val = evaluateStreamtapeJsExpr(part);
      if (val === null) return null;
      out += val;
    }
    return out;
  }

  // Verificar si termina en cadena de `.substring(...)` / `.slice(...)` sobre paréntesis `(subExpr)`
  if (expr.startsWith('(')) {
    let depth = 0;
    let quote: '"' | "'" | null = null;
    let escaped = false;
    let closeIdx = -1;

    for (let i = 0; i < expr.length; i++) {
      const ch = expr[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\' && quote) {
        escaped = true;
        continue;
      }
      if ((ch === '"' || ch === "'") && (!quote || quote === ch)) {
        quote = quote === ch ? null : ch;
        continue;
      }
      if (!quote) {
        if (ch === '(') depth++;
        else if (ch === ')') {
          depth--;
          if (depth === 0) {
            closeIdx = i;
            break;
          }
        }
      }
    }

    if (closeIdx > 0) {
      const inner = expr.slice(1, closeIdx);
      const tail = expr.slice(closeIdx + 1).trim();
      let baseVal = evaluateStreamtapeJsExpr(inner);
      if (baseVal === null) return null;

      if (tail) {
        const calls = tail.match(
          /^(?:\s*\.\s*(?:substring|slice)\(\s*\d+(?:\s*,\s*\d+)?\s*\))+$/
        );
        if (!calls) return null;
        const callRegex =
          /\.\s*(substring|slice)\(\s*(\d+)(?:\s*,\s*(\d+))?\s*\)/g;
        let m: RegExpExecArray | null;
        while ((m = callRegex.exec(tail)) !== null) {
          const fn = m[1];
          const a = Number(m[2]);
          const b = m[3] !== undefined ? Number(m[3]) : undefined;
          baseVal = fn === 'slice' ? baseVal.slice(a, b) : baseVal.substring(a, b);
        }
      }
      return baseVal;
    }
  }

  const litMatch = expr.match(
    /^(['"])((?:\\.|[^\\])*?)\1((?:\s*\.\s*(?:substring|slice)\(\s*\d+(?:\s*,\s*\d+)?\s*\))*)$/
  );
  if (!litMatch) return null;

  let literal = litMatch[2]
    .replace(/\\(['"\\])/g, '$1')
    .replace(/\\\//g, '/');

  const tail = litMatch[3] || '';
  if (tail) {
    const callRegex = /\.\s*(substring|slice)\(\s*(\d+)(?:\s*,\s*(\d+))?\s*\)/g;
    let m: RegExpExecArray | null;
    while ((m = callRegex.exec(tail)) !== null) {
      const fn = m[1];
      const a = Number(m[2]);
      const b = m[3] !== undefined ? Number(m[3]) : undefined;
      literal = fn === 'slice' ? literal.slice(a, b) : literal.substring(a, b);
    }
  }

  return literal;
}

function normalizeBaseGetVideoUrl(rawPartial: string): string {
  return `https://${rawPartial
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^\/+/, '')}`;
}

function withQueryParam(url: string, key: string, value: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set(key, value);
    return parsed.toString();
  } catch {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}${key}=${value}`;
  }
}

function extractStreamtapeCandidatesAndMeta(html: string): {
  candidateVideoUrls: string[];
  thumbnail: string | null;
} {
  let thumbnail: string | null = null;
  const candidateVideoUrls: string[] = [];

  const pushVideo = (rawUrl: string | null) => {
    if (!rawUrl) return;
    const base = normalizeBaseGetVideoUrl(rawUrl);
    if (!base.includes('get_video') || !base.includes('token=')) return;
    if (!candidateVideoUrls.includes(base)) {
      candidateVideoUrls.push(base);
    }
  };

  // Miniatura
  const posterMatch =
    html.match(/<video[^>]+poster=["'](https?:\/\/[^"']+)["']/i) ||
    html.match(
      /<meta[^>]+property=["']og:image["'][^>]+content=["'](https?:\/\/[^"']+)["']/i
    ) ||
    html.match(/(?:image|poster)\s*:\s*["'](https?:\/\/[^"']+)["']/i);
  if (posterMatch?.[1]) {
    thumbnail = posterMatch[1];
  }

  // 1. Recolectar asignaciones JS `document.getElementById(...).innerHTML = ...`
  // En Streamtape suele haber señuelos (`botlink`) y el real (`norobotlink`, `ideoooolink`, `robotlink`).
  const innerHtmlMatches = Array.from(
    html.matchAll(
      /document\.getElementById\(\s*['"]([a-zA-Z0-9_-]*link)['"]\s*\)\.innerHTML\s*=\s*([^;\r\n]+)/gi
    )
  );

  // Guardar la última asignación de cada ID respetando prioridad (norobotlink > ideoooolink > robotlink > otros no-botlink)
  const exprById = new Map<string, string>();
  for (const m of innerHtmlMatches) {
    exprById.set(m[1], m[2]);
  }

  const orderedIds = Array.from(exprById.keys()).sort((a, b) => {
    const rank = (id: string) => {
      const low = id.toLowerCase();
      if (low === 'norobotlink') return 0;
      if (low === 'ideoooolink') return 1;
      if (low === 'robotlink') return 2;
      if (low === 'botlink') return 9;
      return 3;
    };
    return rank(a) - rank(b);
  });

  for (const id of orderedIds) {
    const rhs = exprById.get(id);
    if (!rhs) continue;
    const evaluated = evaluateStreamtapeJsExpr(rhs);
    if (evaluated) {
      pushVideo(evaluated);
    }
  }

  // 2. Fallback Kotlin 2 pasos por cada <div id="...link" style="display:none;">...token=...</div>
  const elemMatches = html.matchAll(
    /id=["']([^"']+link)["'][^>]*style=["'][^"']*display:\s*none;?[^"']*["'][^>]*>([^<]*)/gi
  );
  for (const elem of elemMatches) {
    const linkId = elem[1];
    if (linkId.toLowerCase() === 'botlink') continue;
    const part1Match = elem[2].match(/(.*?token=)[^&<]*/i);
    if (!part1Match?.[1]) continue;

    const tokenRegex = new RegExp(
      `document\\.getElementById\\(\\s*['"]${escapeRegex(linkId)}['"]\\s*\\)\\.innerHTML\\s*=\\s*.*?token=([\\w-]+)`,
      'gi'
    );
    const tokens = Array.from(html.matchAll(tokenRegex));
    const lastToken = tokens[tokens.length - 1]?.[1];
    if (lastToken) {
      pushVideo(`${part1Match[1]}${lastToken}`);
    }
  }

  return { candidateVideoUrls, thumbnail };
}

function extractCookieHeader(response: Response): string {
  const hdrs = response.headers as unknown as {
    getSetCookie?: () => string[];
  };
  const list =
    typeof hdrs.getSetCookie === 'function'
      ? hdrs.getSetCookie()
      : response.headers.get('set-cookie')
      ? [response.headers.get('set-cookie')!]
      : [];
  return list
    .map((c) => c.split(';')[0]?.trim())
    .filter(Boolean)
    .join('; ');
}

async function verifyVideoUrlReachable(
  url: string,
  referer: string,
  cookieHeader: string
): Promise<boolean> {
  try {
    const headers: Record<string, string> = {
      'User-Agent': BROWSER_USER_AGENT,
      Referer: referer,
      Range: 'bytes=0-15',
    };
    if (cookieHeader) {
      headers.Cookie = cookieHeader;
    }

    const res = await fetch(url, {
      method: 'GET',
      headers,
      redirect: 'follow',
      cache: 'no-store',
    });

    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (!res.ok || ct.includes('text/html') || ct.includes('application/json')) {
      res.body?.cancel().catch(() => {});
      return false;
    }

    // Leer el primer chunk corto para descartar JSON `{"status":403,"msg":"Access Denied"}` disfrazado sin Content-Type
    const reader = res.body?.getReader();
    if (reader) {
      const { value } = await reader.read();
      reader.cancel().catch(() => {});
      if (value && value.length > 0 && value[0] === 0x7b) {
        const preview = Buffer.from(value.slice(0, 64)).toString('utf8');
        if (preview.includes('"status":403') || preview.includes('Access Denied')) {
          return false;
        }
      }
    }

    return true;
  } catch {
    return false;
  }
}

async function resolvePlayableStreamtapeTarget(
  baseGetVideoUrl: string,
  referer: string,
  cookieHeader: string
): Promise<{ resolvedUrl: string; needsCookie: boolean } | null> {
  const probeUrls = [
    withQueryParam(baseGetVideoUrl, 'stream', '1'),
    withQueryParam(baseGetVideoUrl, 'dl', '1'),
    baseGetVideoUrl,
  ];

  for (const probeUrl of Array.from(new Set(probeUrls))) {
    try {
      const headers: Record<string, string> = {
        'User-Agent': BROWSER_USER_AGENT,
        Referer: referer,
      };
      if (cookieHeader) {
        headers.Cookie = cookieHeader;
      }

      const res = await fetch(probeUrl, {
        method: 'GET',
        redirect: 'manual',
        headers,
        cache: 'no-store',
      });

      if (res.status >= 300 && res.status < 400) {
        res.body?.cancel().catch(() => {});
        const location = res.headers.get('location');
        if (location) {
          const cdnUrl = new URL(location, probeUrl).toString();
          if (
            cdnUrl.startsWith('https://') &&
            !cdnUrl.toLowerCase().includes('/404')
          ) {
            if (await verifyVideoUrlReachable(cdnUrl, referer, '')) {
              return { resolvedUrl: cdnUrl, needsCookie: false };
            }
            if (
              cookieHeader &&
              (await verifyVideoUrlReachable(cdnUrl, referer, cookieHeader))
            ) {
              return { resolvedUrl: cdnUrl, needsCookie: true };
            }
          }
        }
        continue;
      }

      res.body?.cancel().catch(() => {});
      if (await verifyVideoUrlReachable(probeUrl, referer, cookieHeader)) {
        return { resolvedUrl: probeUrl, needsCookie: Boolean(cookieHeader) };
      }
    } catch {
      // Probar siguiente variante (stream=1 / dl=1)
    }
  }

  return null;
}

async function fetchStreamtapePage(embedUrl: string): Promise<{
  streamingUrl: string | null;
  directUrl: string | null;
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
      directUrl: null,
      thumbnail: null,
      status: response.status,
      finalUrl,
    };
  }

  const cookieHeader = extractCookieHeader(response);
  const html = await response.text();
  const { candidateVideoUrls, thumbnail } = extractStreamtapeCandidatesAndMeta(html);

  for (const candidateUrl of candidateVideoUrls) {
    const playable = await resolvePlayableStreamtapeTarget(
      candidateUrl,
      finalUrl,
      cookieHeader
    );
    if (playable) {
      const proxiedUrl = buildSignedProxyUrl(
        '/api/streamtape/stream',
        playable.resolvedUrl,
        finalUrl,
        21600,
        playable.needsCookie ? cookieHeader : ''
      );
      return {
        streamingUrl: proxiedUrl,
        directUrl: playable.resolvedUrl,
        thumbnail,
        status: response.status,
        finalUrl,
      };
    }
  }

  return {
    streamingUrl: null,
    directUrl: null,
    thumbnail,
    status: response.status,
    finalUrl,
  };
}

async function resolveStreamtapeUrl(targetUrl?: string, rawFilecode?: string) {
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
  let directUrl: string | null = null;
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
        directUrl = res.directUrl;
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
    ...(directUrl ? { direct_url: directUrl } : {}),
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
