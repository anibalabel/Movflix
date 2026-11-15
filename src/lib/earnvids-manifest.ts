import crypto from 'crypto';

export const EARNVIDS_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function getManifestSecret(): string {
  return process.env.JWT_SECRET || 'dooplex-earnvids-manifest-secret-2026';
}

function signPayload(targetUrl: string, referer: string, exp: number): string {
  return crypto
    .createHmac('sha256', getManifestSecret())
    .update(`${targetUrl}|${referer}|${exp}`)
    .digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/** Valida que la URL sea HTTPS pública y no apunte a direcciones privadas o locales. */
export function isAllowedHttpsUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    if (
      !host ||
      host === 'localhost' ||
      host.endsWith('.local') ||
      host === '::1' ||
      /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.)/.test(host)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** Construye una URL proxy firmada en nuestro dominio para servir playlists .m3u8 con CORS `*`. */
export function buildSignedManifestProxyUrl(
  targetUrl: string,
  referer: string,
  ttlSeconds = 21600
): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = signPayload(targetUrl, referer, exp);
  const params = new URLSearchParams({
    url: targetUrl,
    ref: referer,
    exp: String(exp),
    sig,
  });
  return `/api/earnvids/manifest?${params.toString()}`;
}

/** Verifica firma HMAC, vigencia temporal y protocolo seguro antes de hacer fetch. */
export function verifySignedManifestParams(
  targetUrl: string,
  referer: string,
  expStr: string,
  sig: string
): boolean {
  if (!targetUrl || !referer || !expStr || !sig) return false;
  if (!isAllowedHttpsUrl(targetUrl) || !isAllowedHttpsUrl(referer)) return false;

  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) {
    return false;
  }

  const expected = signPayload(targetUrl, referer, exp);
  return safeEqual(sig, expected);
}

/**
 * Reescribe referencias a sub-playlists (.m3u8) o recursos del mismo origen para pasar por el proxy CORS,
 * manteniendo intactos los segmentos multimedia alojados en CDNs externos (como tiktokcdn.com).
 */
export function rewriteHlsManifest(
  manifestText: string,
  manifestBaseUrl: string,
  referer: string
): string {
  const baseOrigin = new URL(manifestBaseUrl).origin;

  const resolveAndMaybeProxy = (rawUri: string): string => {
    const cleaned = rawUri.trim();
    if (!cleaned) return cleaned;
    try {
      const resolved = new URL(cleaned, manifestBaseUrl).toString();
      const parsed = new URL(resolved);
      const isPlaylist = /\.m3u8(\?|$)/i.test(parsed.pathname + parsed.search);
      const isSameOrigin = parsed.origin === baseOrigin;
      if (isPlaylist || isSameOrigin) {
        return buildSignedManifestProxyUrl(resolved, referer);
      }
      return resolved;
    } catch {
      return cleaned;
    }
  };

  return manifestText
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      if (trimmed.startsWith('#')) {
        if (trimmed.includes('URI="')) {
          return line.replace(/URI="([^"]+)"/g, (_m, uri) => {
            return `URI="${resolveAndMaybeProxy(uri)}"`;
          });
        }
        return line;
      }

      return resolveAndMaybeProxy(trimmed);
    })
    .join('\n');
}
