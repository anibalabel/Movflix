'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Hls from 'hls.js';
import { NormalizedVideoLink, LanguageCode } from '@/lib/video-utils';
import {
  Play,
  Server,
  Globe,
  ExternalLink,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Maximize2,
  Minimize2,
  Lock,
  LogIn,
} from 'lucide-react';

interface VideoPlayerProps {
  videos: NormalizedVideoLink[];
  title: string;
  subtitle?: string;
  backdropUrl?: string;
  loading?: boolean;
}

interface VidaraStreamInfo {
  filecode: string;
  streaming_url: string | null;
  thumbnail: string | null;
  title: string | null;
  fallback_embed: string;
}

const LANGUAGE_ORDER: { code: LanguageCode; label: string; flag: string }[] = [
  { code: 'LAT', label: 'Español Latino', flag: '🇲🇽' },
  { code: 'CAST', label: 'Castellano', flag: '🇪🇸' },
  { code: 'SUB', label: 'Subtitulado', flag: '🇺🇸' },
];

export default function VideoPlayer({
  videos,
  title,
  subtitle,
  backdropUrl,
  loading = false,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [selectedLang, setSelectedLang] = useState<LanguageCode>('LAT');
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);
  const [theaterMode, setTheaterMode] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  // State for Vidara / StreamWish Direct Stream API (/api/vidara & /api/streamwish)
  const [vidaraInfo, setVidaraInfo] = useState<VidaraStreamInfo | null>(null);
  const [vidaraLoading, setVidaraLoading] = useState(false);
  const [vidaraStarted, setVidaraStarted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    const checkAuth = () => {
      fetch('/api/auth/me')
        .then((r) => r.json())
        .then((d) => {
          setIsAuthenticated(Boolean(d?.authenticated && d?.user?.id));
        })
        .catch(() => {});
    };
    checkAuth();
    window.addEventListener('dooplex-auth-changed', checkAuth);
    return () => {
      window.removeEventListener('dooplex-auth-changed', checkAuth);
    };
  }, []);

  // Group videos by language code
  const groupedByLang = useMemo(() => {
    const groups: Record<LanguageCode, NormalizedVideoLink[]> = {
      LAT: [],
      CAST: [],
      SUB: [],
      ESP: [],
    };
    for (const v of videos) {
      if (groups[v.langCode]) {
        groups[v.langCode].push(v);
      } else {
        groups.LAT.push(v);
      }
    }
    return groups;
  }, [videos]);

  // Available language tabs that actually have servers
  const availableLangs = useMemo(() => {
    return LANGUAGE_ORDER.filter((l) => (groupedByLang[l.code]?.length || 0) > 0);
  }, [groupedByLang]);

  // Auto-select first available language and first server when videos change
  useEffect(() => {
    if (availableLangs.length > 0) {
      const firstAvailable = availableLangs[0].code;
      const currentHasVideos = (groupedByLang[selectedLang]?.length || 0) > 0;
      const targetLang = currentHasVideos ? selectedLang : firstAvailable;
      setSelectedLang(targetLang);

      const list = groupedByLang[targetLang] || [];
      if (list.length > 0) {
        setSelectedVideoId(list[0].id);
      } else {
        setSelectedVideoId(null);
      }
    } else {
      setSelectedVideoId(null);
    }
  }, [videos, availableLangs, groupedByLang]);

  const currentLangVideos = useMemo(() => {
    return groupedByLang[selectedLang] || [];
  }, [groupedByLang, selectedLang]);

  const activeVideo = useMemo(() => {
    return (
      currentLangVideos.find((v) => v.id === selectedVideoId) ||
      currentLangVideos[0] ||
      null
    );
  }, [currentLangVideos, selectedVideoId]);

  // Resolve Vidara, StreamWish or Uqload direct streaming_url and thumbnail when activeVideo is 'vidara', 'streamwish' or 'uqload'
  useEffect(() => {
    const isVidara =
      activeVideo?.playerType === 'vidara' && Boolean(activeVideo?.vidaraFilecode);
    const isStreamWish =
      activeVideo?.playerType === 'streamwish' &&
      Boolean(activeVideo?.streamwishFilecode);
    const isUqload =
      activeVideo?.playerType === 'uqload' &&
      Boolean(activeVideo?.uqloadFilecode);

    if (
      !activeVideo ||
      (!isVidara && !isStreamWish && !isUqload) ||
      (activeVideo.requiresAuth && !isAuthenticated)
    ) {
      setVidaraInfo(null);
      setVidaraLoading(false);
      setVidaraStarted(false);
      return;
    }

    let cancelled = false;
    setVidaraLoading(true);
    setVidaraStarted(false);
    setVidaraInfo(null);

    const endpoint = isVidara
      ? '/api/vidara'
      : isStreamWish
      ? '/api/streamwish'
      : '/api/uqload';
    const filecode =
      (isVidara
        ? activeVideo.vidaraFilecode
        : isStreamWish
        ? activeVideo.streamwishFilecode
        : activeVideo.uqloadFilecode) || '';
    const payload = isVidara
      ? { filecode }
      : {
          filecode,
          url: activeVideo.playbackUrl,
        };

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.success && data.streaming_url) {
          setVidaraInfo({
            filecode: data.filecode || filecode,
            streaming_url: data.streaming_url,
            thumbnail: data.thumbnail || null,
            title: data.title || null,
            fallback_embed: data.fallback_embed || activeVideo.playbackUrl,
          });
        } else {
          setVidaraInfo({
            filecode,
            streaming_url: null,
            thumbnail: null,
            title: null,
            fallback_embed: activeVideo.playbackUrl,
          });
        }
      })
      .catch(() => {
        if (cancelled) return;
        setVidaraInfo({
          filecode,
          streaming_url: null,
          thumbnail: null,
          title: null,
          fallback_embed: activeVideo.playbackUrl,
        });
      })
      .finally(() => {
        if (!cancelled) setVidaraLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeVideo, iframeKey, isAuthenticated]);

  // Determine effective HLS URL (standard HLS server OR Vidara / StreamWish / Uqload direct m3u8 once user clicks Play)
  const effectiveHlsUrl = useMemo(() => {
    if (!activeVideo) return null;
    if (activeVideo.playerType === 'hls') {
      return activeVideo.playbackUrl;
    }
    if (
      (activeVideo.playerType === 'vidara' ||
        activeVideo.playerType === 'streamwish' ||
        activeVideo.playerType === 'uqload') &&
      vidaraStarted &&
      vidaraInfo?.streaming_url &&
      vidaraInfo.streaming_url.toLowerCase().includes('.m3u8')
    ) {
      return vidaraInfo.streaming_url;
    }
    return null;
  }, [activeVideo, vidaraStarted, vidaraInfo]);

  // Setup HLS.js when effectiveHlsUrl is active
  useEffect(() => {
    if (!effectiveHlsUrl || !videoRef.current) {
      return;
    }

    const videoEl = videoRef.current;
    let hls: Hls | null = null;

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hls.loadSource(effectiveHlsUrl);
      hls.attachMedia(videoEl);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        videoEl.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          // Si el token HLS falla por restricción de red/CORS, caer automáticamente al reproductor embed oficial
          setVidaraInfo((prev) =>
            prev ? { ...prev, streaming_url: null } : null
          );
        }
      });
    } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
      videoEl.src = effectiveHlsUrl;
      videoEl.addEventListener('loadedmetadata', () => {
        videoEl.play().catch(() => {});
      });
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [effectiveHlsUrl]);

  const handleLanguageChange = (code: LanguageCode) => {
    setSelectedLang(code);
    const list = groupedByLang[code] || [];
    if (list.length > 0) {
      setSelectedVideoId(list[0].id);
    }
  };

  const handleNextServer = () => {
    if (currentLangVideos.length <= 1 || !activeVideo) return;
    const idx = currentLangVideos.findIndex((v) => v.id === activeVideo.id);
    const nextIdx = (idx + 1) % currentLangVideos.length;
    setSelectedVideoId(currentLangVideos[nextIdx].id);
  };

  if (loading) {
    return (
      <div className="w-full rounded-2xl bg-zinc-900/90 border border-zinc-800/80 overflow-hidden shadow-2xl">
        <div className="aspect-video w-full flex flex-col items-center justify-center bg-zinc-950 gap-3">
          <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-400 text-sm font-medium">
            Cargando servidores de video...
          </p>
        </div>
      </div>
    );
  }

  if (!videos || videos.length === 0) {
    return (
      <div className="w-full rounded-2xl bg-zinc-900/90 border border-zinc-800/80 overflow-hidden shadow-2xl">
        <div
          className="aspect-video w-full relative flex flex-col items-center justify-center bg-zinc-950 p-6 text-center bg-cover bg-center"
          style={
            backdropUrl
              ? {
                  backgroundImage: `linear-gradient(to bottom, rgba(9,9,11,0.82), rgba(9,9,11,0.95)), url(${backdropUrl})`,
                }
              : undefined
          }
        >
          <AlertCircle className="w-12 h-12 text-amber-500 mb-3" />
          <h3 className="text-lg font-semibold text-white mb-1">
            Sin servidores disponibles por el momento
          </h3>
          <p className="text-sm text-zinc-400 max-w-md">
            No se encontraron enlaces de streaming activos para{' '}
            <span className="text-zinc-200 font-medium">{title}</span>
            {subtitle ? ` (${subtitle})` : ''}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full rounded-2xl bg-zinc-900/95 border border-zinc-800/90 overflow-hidden shadow-2xl transition-all duration-300 ${
        theaterMode ? 'ring-2 ring-red-600/60' : ''
      }`}
    >
      {/* Top Control Bar: Language Tabs & Server Pills */}
      <div className="p-4 sm:p-5 bg-gradient-to-b from-zinc-900 to-zinc-950 border-b border-zinc-800/80 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Language Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 mr-1">
              <Globe className="w-3.5 h-3.5 text-red-500" />
              Idioma:
            </span>
            {availableLangs.map((lang) => {
              const count = groupedByLang[lang.code]?.length || 0;
              const isSelected = selectedLang === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-red-600 text-white shadow-lg shadow-red-600/25 scale-[1.02]'
                      : 'bg-zinc-800/90 text-zinc-300 hover:bg-zinc-700/80 hover:text-white'
                  }`}
                >
                  <span className="text-base leading-none">{lang.flag}</span>
                  <span>{lang.label}</span>
                  <span
                    className={`px-1.5 py-0.5 text-[11px] rounded-full ${
                      isSelected
                        ? 'bg-black/30 text-white'
                        : 'bg-zinc-900 text-zinc-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Quick Actions */}
          <div className="flex items-center gap-2">
            {currentLangVideos.length > 1 && (
              <button
                type="button"
                onClick={handleNextServer}
                title="Probar siguiente servidor si este falla"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-red-400" />
                <span>Cambiar Servidor</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIframeKey((k) => k + 1)}
              title="Recargar reproductor"
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setTheaterMode((t) => !t)}
              title={theaterMode ? 'Salir de modo cine' : 'Modo cine'}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs transition cursor-pointer"
            >
              {theaterMode ? (
                <Minimize2 className="w-3.5 h-3.5 text-red-400" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Server Buttons within Selected Language */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 mr-1">
            <Server className="w-3.5 h-3.5 text-red-500" />
            Servidores:
          </span>
          {currentLangVideos.map((video, idx) => {
            const isSelected = activeVideo?.id === video.id;
            return (
              <button
                key={video.id}
                type="button"
                onClick={() => setSelectedVideoId(video.id)}
                className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-zinc-100 text-zinc-950 border-white font-semibold shadow-md'
                    : 'bg-zinc-900/90 text-zinc-300 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800'
                }`}
              >
                <Play
                  className={`w-3 h-3 ${
                    isSelected ? 'text-red-600 fill-red-600' : 'text-zinc-400'
                  }`}
                />
                <span>{video.serverLabel || `Opción ${idx + 1}`}</span>
                {video.quality && video.quality !== 'Auto' && (
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                      isSelected
                        ? 'bg-red-600 text-white'
                        : 'bg-zinc-800 text-amber-400'
                    }`}
                  >
                    {video.quality}
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1 text-[10px] uppercase px-1.5 py-0.2 rounded ${
                    isSelected
                      ? 'bg-zinc-200 text-zinc-700'
                      : 'bg-zinc-950 text-zinc-500'
                  }`}
                >
                  {video.requiresAuth && !isAuthenticated && (
                    <Lock className="w-2.5 h-2.5 text-amber-500" />
                  )}
                  <span>
                    {video.playerType === 'vidara' ||
                    video.playerType === 'streamwish' ||
                    video.playerType === 'uqload'
                      ? 'DIRECTO'
                      : video.playerType === 'hls'
                      ? 'HLS'
                      : video.playerType === 'mp4'
                      ? 'MP4'
                      : video.playerType === 'youtube'
                      ? 'YT'
                      : 'EMBED'}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Video Container */}
      <div
        className={`relative w-full bg-black ${
          theaterMode ? 'aspect-[21/9] min-h-[420px]' : 'aspect-video'
        }`}
      >
        {activeVideo ? (
          activeVideo.requiresAuth && !isAuthenticated ? (
            /* Auth-Gate Screen for supported_hosts == 1 when user is not logged in */
            <div
              className="w-full h-full relative flex flex-col items-center justify-center bg-zinc-950 p-6 text-center bg-cover bg-center"
              style={
                backdropUrl
                  ? {
                      backgroundImage: `linear-gradient(to bottom, rgba(9,9,11,0.85), rgba(9,9,11,0.96)), url(${backdropUrl})`,
                    }
                  : undefined
              }
            >
              <div className="w-16 h-16 rounded-2xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500 mb-4 shadow-xl">
                <Lock className="w-8 h-8" />
              </div>

              <span className="inline-block px-3 py-1 rounded-full bg-red-600/20 border border-red-500/30 text-[11px] font-bold uppercase tracking-wider text-red-400 mb-2">
                Exclusivo para Usuarios Registrados
              </span>

              <h3 className="text-lg sm:text-2xl font-black text-white mb-1.5">
                Inicia sesión para reproducir en {activeVideo.serverLabel}
              </h3>

              <p className="text-xs sm:text-sm text-zinc-300 max-w-md mb-6">
                Este servidor con extracción directa (Sin Anuncios) solo está
                disponible para usuarios registrados y logueados en Dooplex.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    window.dispatchEvent(new Event('dooplex-open-login'))
                  }
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-red-600/30 transition cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Iniciar Sesión o Registrarse Gratis</span>
                </button>

                {currentLangVideos.some((v) => !v.requiresAuth) && (
                  <button
                    type="button"
                    onClick={() => {
                      const freeServer = currentLangVideos.find(
                        (v) => !v.requiresAuth
                      );
                      if (freeServer) setSelectedVideoId(freeServer.id);
                    }}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs sm:text-sm font-semibold transition cursor-pointer"
                  >
                    <Server className="w-4 h-4 text-zinc-400" />
                    <span>Usar otro servidor (Embed)</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Mode 0: Vidara, StreamWish & Uqload Direct Stream with Pre-Play Thumbnail Cover */}
            {(activeVideo.playerType === 'vidara' ||
              activeVideo.playerType === 'streamwish' ||
              activeVideo.playerType === 'uqload') && (
              <>
                {vidaraLoading ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 gap-3">
                    <div className="w-11 h-11 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs sm:text-sm text-zinc-400">
                      Extrayendo stream directo .m3u8 de {activeVideo.serverLabel}...
                    </p>
                  </div>
                ) : vidaraInfo?.streaming_url ? (
                  !vidaraStarted ? (
                    /* Pre-Play Thumbnail Screen ("thumbnail" before hitting Play) */
                    <button
                      type="button"
                      onClick={() => setVidaraStarted(true)}
                      className="group relative w-full h-full flex flex-col items-center justify-center overflow-hidden bg-zinc-950 cursor-pointer"
                    >
                      {(vidaraInfo.thumbnail || backdropUrl) && (
                        <img
                          src={vidaraInfo.thumbnail || backdropUrl}
                          alt={vidaraInfo.title || title}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/30 group-hover:bg-black/35 transition-colors" />

                      <div className="relative z-10 flex flex-col items-center gap-3 p-4 text-center">
                        <div className="w-20 h-20 rounded-full bg-red-600 group-hover:bg-red-500 text-white flex items-center justify-center shadow-2xl shadow-red-600/50 transform group-hover:scale-110 transition-all duration-300">
                          <Play className="w-9 h-9 fill-white ml-1" />
                        </div>
                        <div className="space-y-1">
                          <span className="inline-block px-3 py-1 rounded-full bg-black/75 border border-zinc-700 text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                            {activeVideo.serverLabel} Stream Directo • Sin Anuncios
                          </span>
                          <p className="text-sm sm:text-base font-bold text-white drop-shadow">
                            Haz clic para reproducir {title}
                          </p>
                        </div>
                      </div>
                    </button>
                  ) : vidaraInfo.streaming_url.toLowerCase().includes('.m3u8') ? (
                    <video
                      key={`vidara-hls-${activeVideo.id}-${iframeKey}`}
                      ref={videoRef}
                      controls
                      autoPlay
                      playsInline
                      poster={vidaraInfo.thumbnail || backdropUrl || undefined}
                      className="w-full h-full object-contain bg-black"
                    />
                  ) : (
                    <video
                      key={`vidara-mp4-${activeVideo.id}-${iframeKey}`}
                      src={vidaraInfo.streaming_url}
                      controls
                      autoPlay
                      playsInline
                      poster={vidaraInfo.thumbnail || backdropUrl || undefined}
                      className="w-full h-full object-contain bg-black"
                    />
                  )
                ) : (
                  /* Fallback to Vidara /e/ iframe if API doesn't return streaming_url */
                  <iframe
                    key={`vidara-fallback-${activeVideo.id}-${iframeKey}`}
                    src={vidaraInfo?.fallback_embed || activeVideo.playbackUrl}
                    title={`${title} - ${activeVideo.serverLabel}`}
                    className="w-full h-full border-0 bg-black"
                    allowFullScreen
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    referrerPolicy="origin"
                  />
                )}
              </>
            )}

            {/* Mode 1: Standard HLS */}
            {activeVideo.playerType === 'hls' && (
              <video
                key={`hls-${activeVideo.id}-${iframeKey}`}
                ref={videoRef}
                controls
                autoPlay
                playsInline
                poster={backdropUrl || undefined}
                className="w-full h-full object-contain bg-black"
              />
            )}

            {/* Mode 2: Standard MP4 */}
            {activeVideo.playerType === 'mp4' && (
              <video
                key={`mp4-${activeVideo.id}-${iframeKey}`}
                src={activeVideo.playbackUrl}
                controls
                autoPlay
                playsInline
                poster={backdropUrl || undefined}
                className="w-full h-full object-contain bg-black"
              />
            )}

            {/* Mode 3 & 4: Embed / YouTube */}
            {(activeVideo.playerType === 'embed' ||
              activeVideo.playerType === 'youtube') && (
              <iframe
                key={`embed-${activeVideo.id}-${iframeKey}`}
                src={activeVideo.playbackUrl}
                title={`${title} - ${activeVideo.serverLabel}`}
                className="w-full h-full border-0 bg-black"
                allowFullScreen
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                referrerPolicy="origin"
              />
            )}
          </>
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-500">
            Selecciona un servidor para reproducir
          </div>
        )}
      </div>

      {/* Footer Info Bar */}
      {activeVideo && (
        <div className="px-4 py-2.5 bg-zinc-950 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-red-500" />
            <span>
              Reproduciendo en{' '}
              <strong className="text-zinc-200">{activeVideo.serverLabel}</strong> (
              {activeVideo.langFlag} {activeVideo.langLabel})
              {(activeVideo.playerType === 'vidara' ||
                activeVideo.playerType === 'streamwish' ||
                activeVideo.playerType === 'uqload') &&
                vidaraInfo?.streaming_url && (
                  <span className="ml-2 text-emerald-400 font-semibold">
                    • Stream Directo HLS
                  </span>
                )}
            </span>
          </div>
          <a
            href={vidaraInfo?.streaming_url || activeVideo.playbackUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-zinc-400 hover:text-red-400 transition"
          >
            <span>Abrir enlace directo</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}
    </div>
  );
}
