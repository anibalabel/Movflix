import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserFromRequest } from '@/lib/db';
import { unpackDeanEdwards } from '@/app/api/streamwish/route';
import {
  EARNVIDS_USER_AGENT,
  buildSignedManifestProxyUrl,
} from '@/lib/earnvids-manifest';

function extractEarnVidsStreamAndMeta(
  source: string,
  originUrl: string
): {
  hls4Url: string | null;
  fallbackUrl: string | null;
  thumbnail: string | null;
} {
  let hls4Url: string | null = null;
  let fallbackUrl: string | null = null;
  let thumbnail: string | null = null;

  // Normalizar barras escapadas (`https:\/\/...`) presentes en respuestas JSON/ofuscadas
  const normalized = source.replace(/\\\//g, '/');

  // EarnVids / VidHide entrega las fuentes en un objeto `links`:
  //   hls4: "/stream/<token>/.../master.m3u8" -> NO tiene bloqueo por ASN/IP, pero le falta cabecera CORS.
  //         Sus segmentos reales en index-v1-a1.m3u8 apuntan a tiktokcdn.com con CORS `*`.
  //         Al servir los manifiestos vía /api/earnvids/manifest, hls.js reproduce directo sin bloqueo por ASN.
  //   hls2: "https://<cdn>/hls2/.../master.m3u8?t=...&asn=..." -> Firmado al ASN del servidor (403 en el cliente).
  const embedOrigin = (() => {
    try {
      return new URL(originUrl).origin;
    } catch {
      return '';
    }
  })();
  const isCrossOrigin = (candidate: string) => {
    try {
      return new URL(candidate).origin !== embedOrigin;
    } catch {
      return false;
    }
  };

  const hls4Match = normalized.match(
    /["']?hls4["']?\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i
  );
  if (hls4Match?.[1]) {
    try {
      hls4Url = new URL(hls4Match[1], originUrl).toString();
    } catch {
      hls4Url = null;
    }
  }

  const fileM3u8Match = normalized.match(
    /file\s*:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i
  );
  const hls2Match = normalized.match(
    /["']?hls2["']?\s*:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i
  );
  const genericM3u8Match = normalized.match(
    /(https?:\/\/[^\s"'<>\\]+\.m3u8[^\s"'<>\\]*)/i
  );

  if (fileM3u8Match?.[1] && isCrossOrigin(fileM3u8Match[1])) {
    fallbackUrl = fileM3u8Match[1];
  } else if (hls2Match?.[1] && isCrossOrigin(hls2Match[1])) {
    fallbackUrl = hls2Match[1];
  } else if (genericM3u8Match?.[1] && isCrossOrigin(genericM3u8Match[1])) {
    fallbackUrl = genericM3u8Match[1];
  }

  // Extraer miniatura / póster
  const imgMatch = normalized.match(
    /(?:image|poster)\s*:\s*["'](https?:\/\/[^"']+)["']/i
  );
  if (imgMatch?.[1]) {
    thumbnail = imgMatch[1];
  }

  return { hls4Url, fallbackUrl, thumbnail };
}

async function isReachableUrl(url: string, referer: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': EARNVIDS_USER_AGENT,
        Referer: referer,
      },
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function fetchEarnVidsFromUrl(embedUrl: string): Promise<{
  streamingUrl: string | null;
  thumbnail: string | null;
  status: number;
  finalUrl: string;
}> {
  const uri = new URL(embedUrl);

  const response = await fetch(embedUrl, {
    method: 'GET',
    headers: {
      'User-Agent': EARNVIDS_USER_AGENT,
      Referer: `${uri.origin}/`,
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    return {
      streamingUrl: null,
      thumbnail: null,
      status: response.status,
      finalUrl: response.url || embedUrl,
    };
  }

  const html = await response.text();
  const resolvedOrigin = response.url || embedUrl;

  // 1. Probar en texto plano
  let { hls4Url, fallbackUrl, thumbnail } = extractEarnVidsStreamAndMeta(
    html,
    resolvedOrigin
  );

  // 2. Si no apareció hls4 en texto plano, desempaquetar con Dean Edwards
  if (!hls4Url) {
    const unpacked = unpackDeanEdwards(html);
    if (unpacked) {
      const extracted = extractEarnVidsStreamAndMeta(unpacked, resolvedOrigin);
      if (extracted.hls4Url) hls4Url = extracted.hls4Url;
      if (!fallbackUrl && extracted.fallbackUrl) fallbackUrl = extracted.fallbackUrl;
      if (extracted.thumbnail) thumbnail = extracted.thumbnail;
    }
  }

  let streamingUrl: string | null = null;
  if (hls4Url) {
    const embedHostOrigin = new URL(resolvedOrigin).origin;
    const hls4Origin = new URL(hls4Url).origin;
    if (hls4Origin !== embedHostOrigin) {
      streamingUrl = hls4Url;
    } else if (await isReachableUrl(hls4Url, resolvedOrigin)) {
      streamingUrl = buildSignedManifestProxyUrl(hls4Url, resolvedOrigin);
    }
  }

  if (!streamingUrl && fallbackUrl) {
    streamingUrl = fallbackUrl;
  }

  return {
    streamingUrl,
    thumbnail,
    status: response.status,
    finalUrl: resolvedOrigin,
  };
}

async function resolveEarnVidsUrl(
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

  const primaryEmbed = filecode
    ? `https://morencius.com/embed/${filecode}`
    : (targetUrl || '').trim();

  // Lista ordenada de espejos para tolerar bloqueos por IP o caídas de un dominio concreto
  const candidateUrls: string[] = [];
  const pushUnique = (u?: string) => {
    const clean = (u || '').trim();
    if (clean && !candidateUrls.includes(clean)) {
      candidateUrls.push(clean);
    }
  };

  pushUnique(primaryEmbed);
  pushUnique(targetUrl);
  if (filecode) {
    pushUnique(`https://smoothpre.com/embed/${filecode}`);
    pushUnique(`https://callistanise.com/embed/${filecode}`);
  }

  let streamingUrl: string | null = null;
  let thumbnail: string | null = null;
  let usedEmbed = primaryEmbed;
  const attempts: Array<{ url: string; status: number }> = [];

  for (const candidate of candidateUrls) {
    try {
      const res = await fetchEarnVidsFromUrl(candidate);
      attempts.push({ url: candidate, status: res.status });
      if (res.thumbnail && !thumbnail) {
        thumbnail = res.thumbnail;
      }
      if (res.streamingUrl) {
        streamingUrl = res.streamingUrl;
        usedEmbed = res.finalUrl || candidate;
        break;
      }
    } catch {
      attempts.push({ url: candidate, status: 0 });
    }
  }

  return {
    filecode: filecode || null,
    embed_url: usedEmbed,
    streaming_url: streamingUrl,
    thumbnail,
    fallback_embed: primaryEmbed || usedEmbed,
    ...(streamingUrl ? {} : { attempts }),
  };
}

async function handleEarnVidsRequest(
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

    const result = await resolveEarnVidsUrl(rawUrl, filecode);
    return NextResponse.json(
      {
        success: Boolean(result.streaming_url),
        ...result,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: unknown) {
    console.error('Error in /api/earnvids:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error al extraer stream de EarnVids',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleEarnVidsRequest(request, async () => {
    const { searchParams } = new URL(request.url);
    return {
      rawUrl: (searchParams.get('url') || '').trim(),
      filecode: (searchParams.get('filecode') || '').trim(),
    };
  });
}

export async function POST(request: NextRequest) {
  return handleEarnVidsRequest(request, async () => {
    const body = await request.json();
    return {
      rawUrl: String(body.url || '').trim(),
      filecode: String(body.filecode || '').trim(),
    };
  });
}
