export interface RawVideoLink {
  id: number;
  server: string | null;
  header: string | null;
  link: string;
  lang: string | null;
  quality?: string | null;
  video_name?: string | null;
  hd?: number | string | null;
  embed: number | string | null;
  youtubelink: number | string | null;
  hls: number | string | null;
  supported_hosts: number | string | null;
}

export type LanguageCode = 'LAT' | 'CAST' | 'SUB' | 'ESP';

export interface NormalizedVideoLink extends RawVideoLink {
  langCode: LanguageCode;
  langLabel: string;
  langFlag: string;
  serverLabel: string;
  playerType:
    | 'vidara'
    | 'streamwish'
    | 'uqload'
    | 'earnvids'
    | 'hls'
    | 'mp4'
    | 'youtube'
    | 'embed';
  playbackUrl: string;
  vidaraFilecode: string | null;
  streamwishFilecode: string | null;
  uqloadFilecode: string | null;
  earnvidsFilecode: string | null;
  requiresAuth: boolean;
}

const EARNVIDS_HOST_KEYWORDS = [
  'earnvids',
  'morencius',
  'minochinos',
  'callistanise',
  'vidhide',
  'smoothpre',
  'vidembed',
  'earnv',
];

const STREAMWISH_HOST_KEYWORDS = [
  'streamwish',
  'vibuxer',
  'hanerix',
  'masukestin',
  'hglink',
  'jefferycontrolmodel',
  'audinifer',
  'sfastwish',
  'flaswish',
  'obeywish',
  'cdnwish',
  'asnwish',
  'jodwish',
  'swish',
  'wishembed',
  'hlswish',
  'playerwish',
  'streamhg',
];

const KNOWN_SERVERS: Record<string, string> = {
  vidara: 'Vidara',
  streamwish: 'StreamWish',
  vibuxer: 'StreamWish',
  hanerix: 'StreamWish',
  masukestin: 'StreamWish',
  hglink: 'StreamWish',
  jefferycontrolmodel: 'StreamWish',
  audinifer: 'StreamWish',
  doodstream: 'Doodstream',
  dood: 'Doodstream',
  playmogo: 'Doodstream',
  supervideo: 'SuperVideo',
  earnvids: 'EarnVids',
  vidhide: 'VidHide',
  morencius: 'EarnVids',
  minochinos: 'EarnVids',
  callistanise: 'EarnVids',
  smoothpre: 'EarnVids',
  byse: 'Byse.sx',
  voe: 'VOE',
  uqload: 'Uqload',
  mixdrop: 'MixDrop',
  dropload: 'DropLoad',
  dr0pstream: 'DropLoad',
  player4me: 'Player4Me',
  streamtape: 'Streamtape',
  vidsonic: 'Vidsonic',
  vidsrc: 'VidSrc',
  moviepire: 'VidSrc',
  solidfiles: 'Solidfiles',
  'ok.ru': 'OK.ru',
  hxfile: 'HXFile',
  vidmoly: 'Vidmoly',
  lulustream: 'LuluStream',
  goodstream: 'Goodstream',
  bigwarp: 'Bigwarp',
  savefiles: 'Savefiles',
  docines: 'Docines',
  filemoon: 'FileMoon',
  vidoza: 'Vidoza',
  fembed: 'Fembed',
  mp4upload: 'Mp4Upload',
  yourupload: 'YourUpload',
};

const GENERIC_SERVER_TAGS = new Set([
  'LAT',
  'CAST',
  'SUB',
  'SPANISH',
  'ESPANOL LATINO',
  'ESPAÑOL LATINO',
  '480P',
  '720P',
  '1080P',
  '1080P HD',
  '4K',
  'AUTO',
  'HD',
  'CAM',
  'BR SCREENER',
  'OTROS',
]);

export function normalizeLanguage(
  rawLang: string | null | undefined,
  rawServer: string | null | undefined
): { code: LanguageCode; label: string; flag: string } {
  const combined = `${rawLang || ''} ${rawServer || ''}`.toUpperCase();

  if (
    combined.includes('LAT') ||
    combined.includes('LATINO') ||
    combined.includes('MEX')
  ) {
    return { code: 'LAT', label: 'Latino', flag: '🇲🇽' };
  }

  if (
    combined.includes('CAST') ||
    combined.includes('CASTELLANO') ||
    combined.includes('ESPAÑA')
  ) {
    return { code: 'CAST', label: 'Castellano', flag: '🇪🇸' };
  }

  if (
    combined.includes('SUB') ||
    combined.includes('VOS') ||
    combined.includes('ENG') ||
    combined.includes('JAP') ||
    combined.includes('ORIGINAL')
  ) {
    return { code: 'SUB', label: 'Subtitulado', flag: '🇺🇸' };
  }

  return { code: 'LAT', label: 'Latino / Español', flag: '🇲🇽' };
}

export function extractCleanServerName(
  rawServer: string | null | undefined,
  rawHeader: string | null | undefined,
  link: string
): string {
  const s = (rawServer || '').trim();
  const h = (rawHeader || '').trim();

  // First check if the link domain itself matches a known server (handles cases where header='Vidara' but link is streamwish.fun)
  try {
    const url = new URL(link);
    const host = url.hostname.replace(/^www\./i, '').toLowerCase();
    for (const [key, friendly] of Object.entries(KNOWN_SERVERS)) {
      if (host.includes(key)) {
        return friendly;
      }
    }
  } catch {
    // ignore URL parse error
  }

  const candidates = [h, s].filter(Boolean);

  for (const candidate of candidates) {
    if (GENERIC_SERVER_TAGS.has(candidate.toUpperCase())) {
      continue;
    }
    const cleanPart = candidate.split('=')[0].trim();
    const lowerPart = cleanPart.toLowerCase();
    for (const [key, friendly] of Object.entries(KNOWN_SERVERS)) {
      if (lowerPart.includes(key)) {
        return friendly;
      }
    }
    return cleanPart.replace(/\.(com|io|cc|fun|to|net|org|bz|is|sx|so|vc|ps)$/i, '');
  }

  return h || s || 'Servidor Principal';
}

export function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) {
      const id = parsed.pathname.slice(1);
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (parsed.hostname.includes('youtube.com')) {
      if (parsed.pathname.startsWith('/embed/')) {
        return url;
      }
      const v = parsed.searchParams.get('v');
      if (v) {
        return `https://www.youtube.com/embed/${v}`;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Extrae el filecode de Vidara si el enlace pertenece a un dominio de Vidara
 * (ej. https://vidara.so/v/bqNlDdazNYOEt o https://vidara.to/e/dkTOmUUzGpzv -> "bqNlDdazNYOEt")
 */
export function extractVidaraFilecode(link: string): string | null {
  try {
    const url = new URL(link.trim());
    if (!url.hostname.toLowerCase().includes('vidara')) {
      return null;
    }
    const match = url.pathname.match(/\/(?:v|e|embed|d)\/([a-zA-Z0-9_-]+)/i);
    if (match && match[1]) {
      return match[1];
    }
  } catch {
    // Fallback regex
    if (link.toLowerCase().includes('vidara')) {
      const match = link.match(/\/(?:v|e|embed|d)\/([a-zA-Z0-9_-]+)/i);
      if (match && match[1]) return match[1];
    }
  }
  return null;
}

/**
 * Extrae el filecode de StreamWish (o de cualquiera de sus dominios espejo en la BD)
 * (ej. https://streamwish.fun/e/dpvxt82avem2 o https://masukestin.com/e/xudxdrmuetyg -> "dpvxt82avem2")
 */
export function extractStreamWishFilecode(
  link: string,
  rawServer?: string | null,
  rawHeader?: string | null
): string | null {
  const trimmed = (link || '').trim();
  if (!trimmed) return null;

  let isStreamWishDomain = false;
  try {
    const url = new URL(trimmed);
    const host = url.hostname.toLowerCase();
    if (STREAMWISH_HOST_KEYWORDS.some((kw) => host.includes(kw))) {
      isStreamWishDomain = true;
    }
  } catch {
    // ignore
  }

  const meta = `${rawServer || ''} ${rawHeader || ''}`.toLowerCase();
  const isStreamWishMeta =
    meta.includes('streamwish') || meta.includes('vibuxer');

  // Excluir dominios que pertenecen a otros servidores (como minochinos que a veces tiene header StreamWish pero ruta /embed/)
  if (!isStreamWishDomain && !isStreamWishMeta) {
    return null;
  }

  if (!isStreamWishDomain && trimmed.toLowerCase().includes('minochinos')) {
    return null;
  }

  const match = trimmed.match(/\/(?:e|v|f|d)\/([a-zA-Z0-9_-]+)/i);
  if (match && match[1]) {
    return match[1];
  }

  return null;
}

/**
 * Extrae el filecode de Uqload (ej. https://uqload.is/embed-ech9olnz8v3i.html o https://uqload.vc/e/gp47l81u4694 -> "ech9olnz8v3i")
 */
export function extractUqloadFilecode(
  link: string,
  rawServer?: string | null,
  rawHeader?: string | null
): string | null {
  const trimmed = (link || '').trim();
  if (!trimmed) return null;

  const combined = `${rawServer || ''} ${rawHeader || ''} ${trimmed}`.toLowerCase();
  if (!combined.includes('uqload')) {
    return null;
  }

  const match = trimmed.match(
    /(?:embed-|\/(?:e|v|d|embed)\/)([a-zA-Z0-9_-]+)/i
  );
  if (match && match[1]) {
    return match[1];
  }

  const htmlMatch = trimmed.match(/\/([a-zA-Z0-9_-]+)\.html/i);
  if (htmlMatch && htmlMatch[1]) {
    return htmlMatch[1].replace(/^embed-/i, '');
  }

  return null;
}

/**
 * Extrae el filecode de EarnVids / VidHide / Morencius
 * (ej. https://morencius.com/embed/hkfu8o6gimjm o https://earnvids.com/e/hkfu8o6gimjm -> "hkfu8o6gimjm")
 */
export function extractEarnVidsFilecode(
  link: string,
  rawServer?: string | null,
  rawHeader?: string | null
): string | null {
  const trimmed = (link || '').trim();
  if (!trimmed) return null;

  let isEarnVidsDomain = false;
  try {
    const url = new URL(trimmed);
    const host = url.hostname.toLowerCase();
    if (EARNVIDS_HOST_KEYWORDS.some((kw) => host.includes(kw))) {
      isEarnVidsDomain = true;
    }
  } catch {
    // ignore
  }

  const combined = `${rawHeader || ''} ${rawServer || ''} ${trimmed}`.toLowerCase();
  if (!isEarnVidsDomain && !EARNVIDS_HOST_KEYWORDS.some((kw) => combined.includes(kw))) {
    return null;
  }

  // 1. Probar ruta estándar /embed/code, /e/code, /v/code, /d/code
  const pathMatch = trimmed.match(/\/(?:embed|e|v|d)\/([a-zA-Z0-9_-]+)/i);
  if (pathMatch && pathMatch[1] && pathMatch[1].toLowerCase() !== 'embed') {
    return pathMatch[1];
  }

  // 2. Probar último segmento del path si no es 'embed'
  try {
    const url = new URL(trimmed);
    const segments = url.pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    if (last && last.toLowerCase() !== 'embed' && last.toLowerCase() !== 'e') {
      return last;
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Normaliza enlaces de servidores embed como Vidara que en la BD vienen con `/v/`
 * (ej. https://vidara.so/v/qo1LOLLEEEw3i -> https://vidara.so/e/qo1LOLLEEEw3i)
 */
export function normalizeEmbedPlaybackUrl(
  rawLink: string,
  rawServer: string | null | undefined,
  rawHeader: string | null | undefined
): string {
  const link = rawLink.trim();
  const combinedMeta = `${rawHeader || ''} ${rawServer || ''} ${link}`.toLowerCase();

  if (combinedMeta.includes('vidara')) {
    return link.replace(/\/v\/([^/?#]+)/i, '/e/$1');
  }

  // Si es un dominio espejo de StreamWish en modo embed, normalizar a streamwish.fun/e/{code}
  const swCode = extractStreamWishFilecode(link, rawServer, rawHeader);
  if (swCode) {
    return `https://streamwish.fun/e/${swCode}`;
  }

  // Si es un enlace antiguo de Uqload (/embed-{code}.html), normalizar a https://uqload.vc/e/{code}
  const uqCode = extractUqloadFilecode(link, rawServer, rawHeader);
  if (uqCode) {
    return `https://uqload.vc/e/${uqCode}`;
  }

  return link;
}

export function classifyVideoLink(video: RawVideoLink): NormalizedVideoLink {
  const rawLink = (video.link || '').trim();
  const link = normalizeEmbedPlaybackUrl(rawLink, video.server, video.header);
  const vidaraFilecode = extractVidaraFilecode(rawLink);
  const streamwishFilecode = extractStreamWishFilecode(
    rawLink,
    video.server,
    video.header
  );
  const uqloadFilecode = extractUqloadFilecode(
    rawLink,
    video.server,
    video.header
  );
  const earnvidsFilecode = extractEarnVidsFilecode(
    rawLink,
    video.server,
    video.header
  );

  const isHlsFlag = Number(video.hls) === 1;
  const isYoutubeFlag = Number(video.youtubelink) === 1;
  const isEmbedFlag = Number(video.embed) === 1;
  const isSupportedHostFlag = Number(video.supported_hosts) === 1;

  const lowerLink = link.toLowerCase();
  const { code, label, flag } = normalizeLanguage(video.lang, video.server);
  const serverLabel = extractCleanServerName(video.server, video.header, link);

  const isDirectVideoFile =
    (lowerLink.endsWith('.mp4') ||
      lowerLink.endsWith('.mkv') ||
      lowerLink.endsWith('.webm') ||
      lowerLink.includes('.mp4?')) &&
    !lowerLink.includes('/e/') &&
    !lowerLink.includes('/embed');

  let playerType:
    | 'vidara'
    | 'streamwish'
    | 'uqload'
    | 'earnvids'
    | 'hls'
    | 'mp4'
    | 'youtube'
    | 'embed' = 'embed';
  let playbackUrl = link;

  // Regla principal de `supported_hosts`:
  // Solo si `supported_hosts == 1` está activo intentamos usar los extractores propios implementados (Vidara, StreamWish, Uqload y EarnVids).
  if (isSupportedHostFlag) {
    if (vidaraFilecode) {
      playerType = 'vidara';
    } else if (streamwishFilecode) {
      playerType = 'streamwish';
      playbackUrl = `https://streamwish.fun/e/${streamwishFilecode}`;
    } else if (uqloadFilecode) {
      playerType = 'uqload';
      playbackUrl = `https://uqload.vc/e/${uqloadFilecode}`;
    } else if (earnvidsFilecode) {
      playerType = 'earnvids';
      playbackUrl = `https://morencius.com/embed/${earnvidsFilecode}`;
    } else {
      playerType = 'embed';
    }
  }
  // Rule 1: HLS (.m3u8 or hls == 1 when not a direct .mp4 file)
  else if (lowerLink.includes('.m3u8') || (isHlsFlag && !isDirectVideoFile)) {
    playerType = 'hls';
  }
  // Rule 2: YouTube
  else if (
    isYoutubeFlag ||
    lowerLink.includes('youtube.com/') ||
    lowerLink.includes('youtu.be/')
  ) {
    playerType = 'youtube';
    playbackUrl = getYouTubeEmbedUrl(link) || link;
  }
  // Rule 3: Direct MP4 / MKV (when embed == 0 and supported_hosts == 0)
  else if (!isEmbedFlag && !isSupportedHostFlag && isDirectVideoFile) {
    playerType = 'mp4';
  }
  // Rule 4: Default / embed == 1
  else {
    playerType = 'embed';
  }

  return {
    ...video,
    langCode: code,
    langLabel: label,
    langFlag: flag,
    serverLabel,
    playerType,
    playbackUrl,
    vidaraFilecode,
    streamwishFilecode,
    uqloadFilecode,
    earnvidsFilecode,
    // Los videos con `supported_hosts == 1` requieren que el usuario esté registrado y logueado
    requiresAuth: isSupportedHostFlag,
  };
}
