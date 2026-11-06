'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import VideoPlayer from '@/components/VideoPlayer';
import MediaCard, { MediaItemSummary } from '@/components/MediaCard';
import { NormalizedVideoLink } from '@/lib/video-utils';
import {
  Star,
  Calendar,
  Eye,
  Clock,
  Film,
  Tv,
  Sparkles,
  Play,
  SkipForward,
  SkipBack,
  Layers,
  ArrowLeft,
  Hash,
} from 'lucide-react';

interface EpisodeItem {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  still_path: string;
  vote_average: number;
  video_count: number;
}

interface SeasonItem {
  id: number;
  season_number: number;
  name: string;
  overview: string;
  poster_path: string;
  episodes: EpisodeItem[];
}

interface MediaDetail {
  id: number;
  tmdb_id: number;
  title: string;
  original_name: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  vote_average: number;
  release_date: string | null;
  runtime: string | null;
  views: number;
  trailer_url: string | null;
  genres: Array<{ id: number; name: string }>;
  mediaType: 'movies' | 'series' | 'animes';
  videos: NormalizedVideoLink[];
  seasons: SeasonItem[];
  related: MediaItemSummary[];
}

export default function WatchPage({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}) {
  const { type, id } = use(params);

  const [detail, setDetail] = useState<MediaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Episode state for Series and Animes
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<EpisodeItem | null>(null);
  const [episodeVideos, setEpisodeVideos] = useState<NormalizedVideoLink[]>([]);
  const [loadingEpisodeVideos, setLoadingEpisodeVideos] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError('');
    fetch(`/api/media/${type}/${id}`)
      .then((res) => res.json())
      .then((json) => {
        if (!json.success || !json.data) {
          setError(json.error || 'No se pudo cargar el contenido');
          return;
        }
        const media: MediaDetail = json.data;
        setDetail(media);

        if (
          (media.mediaType === 'series' || media.mediaType === 'animes') &&
          media.seasons &&
          media.seasons.length > 0
        ) {
          // Pick first season that has episodes, or first season
          const firstSeasonWithEps =
            media.seasons.find((s) => s.episodes && s.episodes.length > 0) ||
            media.seasons[0];
          setSelectedSeasonId(firstSeasonWithEps.id);

          if (firstSeasonWithEps.episodes.length > 0) {
            const firstEpWithVids =
              firstSeasonWithEps.episodes.find((ep) => ep.video_count > 0) ||
              firstSeasonWithEps.episodes[0];
            setSelectedEpisode(firstEpWithVids);
          }
        }
      })
      .catch(() => setError('Error de conexión al cargar los detalles'))
      .finally(() => setLoading(false));
  }, [type, id]);

  // Fetch episode videos whenever selectedEpisode changes
  useEffect(() => {
    if (
      !detail ||
      (detail.mediaType !== 'series' && detail.mediaType !== 'animes') ||
      !selectedEpisode
    ) {
      return;
    }

    setLoadingEpisodeVideos(true);
    fetch(`/api/episodes/${detail.mediaType}/${selectedEpisode.id}/videos`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setEpisodeVideos(json.videos || []);
        } else {
          setEpisodeVideos([]);
        }
      })
      .catch(() => setEpisodeVideos([]))
      .finally(() => setLoadingEpisodeVideos(false));
  }, [detail, selectedEpisode]);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-400 text-sm">
          Preparando reproductor y servidores...
        </p>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="text-2xl font-bold text-white">
          {error || 'Contenido no encontrado'}
        </h1>
        <Link
          href="/catalog"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Catálogo</span>
        </Link>
      </div>
    );
  }

  const currentSeason =
    detail.seasons?.find((s) => s.id === selectedSeasonId) ||
    detail.seasons?.[0] ||
    null;

  const currentEpisodeIndex =
    currentSeason && selectedEpisode
      ? currentSeason.episodes.findIndex((e) => e.id === selectedEpisode.id)
      : -1;

  const prevEpisode =
    currentSeason && currentEpisodeIndex > 0
      ? currentSeason.episodes[currentEpisodeIndex - 1]
      : null;

  const nextEpisode =
    currentSeason &&
    currentEpisodeIndex >= 0 &&
    currentEpisodeIndex < currentSeason.episodes.length - 1
      ? currentSeason.episodes[currentEpisodeIndex + 1]
      : null;

  const activeVideos =
    detail.mediaType === 'movies' ? detail.videos : episodeVideos;

  const playerSubtitle =
    detail.mediaType !== 'movies' && currentSeason && selectedEpisode
      ? `T${currentSeason.season_number}:E${selectedEpisode.episode_number} — ${selectedEpisode.name}`
      : undefined;

  return (
    <div className="pb-16">
      {/* Backdrop Hero Header */}
      <div className="relative w-full overflow-hidden border-b border-zinc-900 bg-zinc-950">
        {detail.backdrop_path && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-25 blur-sm scale-105"
            style={{ backgroundImage: `url(${detail.backdrop_path})` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/85 to-zinc-950/50" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10 space-y-6">
          {/* Back Breadcrumb */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <Link
              href={`/catalog?type=${detail.mediaType}`}
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-zinc-400 hover:text-white transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>
                Volver a{' '}
                {detail.mediaType === 'movies'
                  ? 'Películas'
                  : detail.mediaType === 'series'
                  ? 'Series'
                  : 'Animes'}
              </span>
            </Link>

            {detail.tmdb_id && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-400 font-mono">
                <Hash className="w-3 h-3 text-red-500" />
                TMDB: {detail.tmdb_id}
              </span>
            )}
          </div>

          {/* Info Row */}
          <div className="flex flex-col md:flex-row gap-6 lg:gap-8 items-start">
            {/* Poster */}
            {detail.poster_path && (
              <div className="w-36 sm:w-48 shrink-0 rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl hidden sm:block">
                <img
                  src={detail.poster_path}
                  alt={detail.title}
                  className="w-full h-auto object-cover"
                />
              </div>
            )}

            {/* Metadata */}
            <div className="flex-1 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-red-600 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  {detail.mediaType === 'movies' ? (
                    <>
                      <Film className="w-3.5 h-3.5" /> Película
                    </>
                  ) : detail.mediaType === 'series' ? (
                    <>
                      <Tv className="w-3.5 h-3.5" /> Serie
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" /> Anime
                    </>
                  )}
                </span>

                {detail.vote_average > 0 && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    {detail.vote_average.toFixed(1)}
                  </span>
                )}

                {detail.release_date && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-medium">
                    <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                    {String(detail.release_date).slice(0, 10)}
                  </span>
                )}

                {detail.runtime && detail.runtime !== '0' && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-medium">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    {detail.runtime} min
                  </span>
                )}

                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs">
                  <Eye className="w-3.5 h-3.5" />
                  {detail.views.toLocaleString()} vistas
                </span>
              </div>

              <div>
                <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                  {detail.title}
                </h1>
                {detail.original_name &&
                  detail.original_name !== detail.title && (
                    <p className="text-sm text-zinc-400 mt-0.5">
                      Título original: {detail.original_name}
                    </p>
                  )}
              </div>

              {/* Genres */}
              {detail.genres && detail.genres.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {detail.genres.map((g) => (
                    <Link
                      key={g.id}
                      href={`/catalog?type=${detail.mediaType}&genre=${g.id}`}
                      className="px-3 py-1 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-300 transition"
                    >
                      {g.name}
                    </Link>
                  ))}
                </div>
              )}

              {/* Synopsis */}
              {detail.overview && (
                <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-4xl">
                  {detail.overview}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Player & Episodes Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-10">
        {/* Current Episode Banner for Series / Animes */}
        {detail.mediaType !== 'movies' && currentSeason && selectedEpisode && (
          <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-400">
                <span>{currentSeason.name}</span>
                <span>•</span>
                <span>Episodio {selectedEpisode.episode_number}</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white mt-0.5">
                {selectedEpisode.name}
              </h2>
              {selectedEpisode.overview && (
                <p className="text-xs sm:text-sm text-zinc-400 mt-1 line-clamp-2 max-w-3xl">
                  {selectedEpisode.overview}
                </p>
              )}
            </div>

            {/* Prev / Next Episode Controls */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={!prevEpisode}
                onClick={() => prevEpisode && setSelectedEpisode(prevEpisode)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-xs font-semibold text-white transition cursor-pointer"
              >
                <SkipBack className="w-4 h-4" />
                <span>Anterior</span>
              </button>
              <button
                type="button"
                disabled={!nextEpisode}
                onClick={() => nextEpisode && setSelectedEpisode(nextEpisode)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-xs font-semibold text-white transition cursor-pointer"
              >
                <span>Siguiente Ep.</span>
                <SkipForward className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Integrated Video Player */}
        <VideoPlayer
          videos={activeVideos}
          title={detail.title}
          subtitle={playerSubtitle}
          backdropUrl={detail.backdrop_path}
          loading={loadingEpisodeVideos}
        />

        {/* Seasons & Episodes Selector for Series and Animes */}
        {(detail.mediaType === 'series' || detail.mediaType === 'animes') &&
          detail.seasons &&
          detail.seasons.length > 0 && (
            <section className="space-y-6 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
                <div className="flex items-center gap-2.5">
                  <Layers className="w-5 h-5 text-red-500" />
                  <h3 className="text-xl font-bold text-white">
                    Temporadas y Episodios
                  </h3>
                </div>

                {/* Season Tabs */}
                <div className="flex items-center gap-2 flex-wrap">
                  {detail.seasons.map((season) => {
                    const isSelected = season.id === currentSeason?.id;
                    return (
                      <button
                        key={season.id}
                        type="button"
                        onClick={() => {
                          setSelectedSeasonId(season.id);
                          if (season.episodes.length > 0) {
                            setSelectedEpisode(season.episodes[0]);
                          }
                        }}
                        className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                          isSelected
                            ? 'bg-red-600 text-white shadow-lg shadow-red-600/25'
                            : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-zinc-800'
                        }`}
                      >
                        {season.name || `Temporada ${season.season_number}`} (
                        {season.episodes.length})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Episodes Grid */}
              {currentSeason && currentSeason.episodes.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[540px] overflow-y-auto pr-1">
                  {currentSeason.episodes.map((ep) => {
                    const isPlaying = selectedEpisode?.id === ep.id;
                    return (
                      <button
                        key={ep.id}
                        type="button"
                        onClick={() => {
                          setSelectedEpisode(ep);
                          window.scrollTo({ top: 260, behavior: 'smooth' });
                        }}
                        className={`group flex flex-col text-left rounded-xl overflow-hidden border transition-all cursor-pointer ${
                          isPlaying
                            ? 'bg-red-600/15 border-red-500 ring-1 ring-red-500/50'
                            : 'bg-zinc-900/90 border-zinc-800/90 hover:border-zinc-600 hover:bg-zinc-900'
                        }`}
                      >
                        {/* Episode Still Image */}
                        <div className="relative aspect-video w-full bg-zinc-950 overflow-hidden">
                          {ep.still_path ? (
                            <img
                              src={ep.still_path}
                              alt={ep.name}
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : detail.backdrop_path ? (
                            <img
                              src={detail.backdrop_path}
                              alt={ep.name}
                              loading="lazy"
                              className="w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-700">
                              <Tv className="w-8 h-8" />
                            </div>
                          )}

                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 text-white text-[11px] font-bold">
                            Ep. {ep.episode_number}
                          </div>

                          {ep.video_count > 0 && (
                            <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-emerald-600/90 text-white text-[10px] font-bold">
                              {ep.video_count}{' '}
                              {ep.video_count === 1 ? 'servidor' : 'servidores'}
                            </div>
                          )}

                          <div
                            className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity ${
                              isPlaying
                                ? 'opacity-100'
                                : 'opacity-0 group-hover:opacity-100'
                            }`}
                          >
                            <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg">
                              <Play className="w-4 h-4 fill-white ml-0.5" />
                            </div>
                          </div>
                        </div>

                        {/* Episode Text */}
                        <div className="p-3 flex-1 flex flex-col justify-between">
                          <h4
                            className={`text-xs sm:text-sm font-bold line-clamp-1 ${
                              isPlaying
                                ? 'text-red-400'
                                : 'text-zinc-100 group-hover:text-white'
                            }`}
                          >
                            {ep.episode_number}. {ep.name}
                          </h4>
                          {ep.overview && (
                            <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1">
                              {ep.overview}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-zinc-400 py-6 text-center">
                  No hay episodios registrados en esta temporada.
                </p>
              )}
            </section>
          )}

        {/* Related Content */}
        {detail.related && detail.related.length > 0 && (
          <section className="space-y-4 pt-6">
            <h3 className="text-xl font-bold text-white">
              Contenido Recomendado
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-8 gap-4">
              {detail.related.map((item) => (
                <MediaCard key={`rel-${item.id}`} item={item} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

