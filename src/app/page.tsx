'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import MediaCard, { MediaItemSummary } from '@/components/MediaCard';
import {
  Play,
  Star,
  Film,
  Tv,
  Sparkles,
  Server,
  ChevronRight,
  ChevronLeft,
  Flame,
  Calendar,
} from 'lucide-react';

interface HomeStatsResponse {
  success: boolean;
  stats: {
    movies: number;
    series: number;
    animes: number;
    totalVideos: number;
  };
  genres: Array<{ id: number; name: string }>;
  hero: MediaItemSummary[];
  sections: {
    latestMovies: MediaItemSummary[];
    latestSeries: MediaItemSummary[];
    latestAnimes: MediaItemSummary[];
    topRatedMovies: MediaItemSummary[];
  };
}

export default function HomePage() {
  const [data, setData] = useState<HomeStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [heroIndex, setHeroIndex] = useState(0);

  const loadStats = () => {
    setLoading(true);
    setErrorMsg(null);
    fetch('/api/stats')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setData(json);
        } else {
          setErrorMsg(json.error || 'No se pudo cargar el catálogo');
        }
      })
      .catch((err) => {
        console.error(err);
        setErrorMsg('Error de conexión con la API del catálogo');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadStats();
  }, []);

  // Auto-rotate hero slider every 7s
  useEffect(() => {
    if (!data?.hero || data.hero.length <= 1) return;
    const timer = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % data.hero.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [data?.hero]);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-400 text-sm font-medium">
          Cargando catálogo de Dooplex...
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center gap-4">
        <div className="max-w-md rounded-2xl bg-zinc-900/90 border border-zinc-800 p-6 space-y-4">
          <h2 className="text-lg font-bold text-white">
            No se pudo conectar con el catálogo
          </h2>
          {errorMsg && (
            <p className="text-xs text-red-400 bg-red-950/30 border border-red-500/20 rounded-xl p-3 font-mono break-all">
              {errorMsg}
            </p>
          )}
          <button
            type="button"
            onClick={loadStats}
            className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition cursor-pointer"
          >
            Reintentar conexión
          </button>
        </div>
      </div>
    );
  }

  const activeHero = data?.hero?.[heroIndex] || null;

  return (
    <div className="space-y-12 pb-12">
      {/* Hero Banner */}
      {activeHero && (
        <section className="relative w-full min-h-[500px] lg:min-h-[600px] flex items-end overflow-hidden bg-zinc-950 border-b border-zinc-900">
          {/* Backdrop Image */}
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-700 scale-105"
            style={{
              backgroundImage: activeHero.backdrop_path
                ? `url(${activeHero.backdrop_path})`
                : activeHero.poster_path
                ? `url(${activeHero.poster_path})`
                : undefined,
            }}
          />
          {/* Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/75 to-zinc-950/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-transparent" />

          {/* Hero Content */}
          <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 lg:py-16 flex flex-col md:flex-row items-end justify-between gap-8">
            <div className="max-w-2xl space-y-4">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="px-3 py-1 rounded-full bg-red-600 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-red-600/30">
                  Destacado Dooplex
                </span>
                <span className="px-2.5 py-1 rounded-full bg-zinc-900/90 border border-zinc-700 text-zinc-200 text-xs font-semibold uppercase">
                  {activeHero.mediaType === 'movies'
                    ? 'Película'
                    : activeHero.mediaType === 'series'
                    ? 'Serie TV'
                    : 'Anime'}
                </span>
                {activeHero.vote_average > 0 && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/70 border border-amber-500/30 text-amber-400 text-xs font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    {activeHero.vote_average.toFixed(1)}
                  </span>
                )}
                {activeHero.release_date && (
                  <span className="flex items-center gap-1 text-xs text-zinc-300 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                    {String(activeHero.release_date).slice(0, 4)}
                  </span>
                )}
              </div>

              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                {activeHero.title}
              </h1>

              {activeHero.overview && (
                <p className="text-sm sm:text-base text-zinc-300 line-clamp-3 leading-relaxed">
                  {activeHero.overview}
                </p>
              )}

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Link
                  href={`/watch/${activeHero.mediaType}/${activeHero.id}`}
                  className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-xl shadow-red-600/30 transition transform hover:scale-[1.02]"
                >
                  <Play className="w-5 h-5 fill-white" />
                  <span>Reproducir Ahora</span>
                </Link>
                <Link
                  href={`/ catalog?type=${activeHero.mediaType}`.replace(' ', '')}
                  className="flex items-center gap-2 px-5 py-3.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-200 font-semibold text-sm transition"
                >
                  <span>Explorar Catálogo</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Hero Slider Controls */}
            {data?.hero && data.hero.length > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setHeroIndex(
                      (prev) => (prev - 1 + data.hero.length) % data.hero.length
                    )
                  }
                  className="p-2.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700 text-white transition cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-1.5 px-2">
                  {data.hero.map((item, idx) => (
                    <button
                      key={`${item.mediaType}-${item.id}`}
                      type="button"
                      onClick={() => setHeroIndex(idx)}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        idx === heroIndex
                          ? 'w-7 bg-red-600'
                          : 'w-2 bg-zinc-600 hover:bg-zinc-400'
                      }`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setHeroIndex((prev) => (prev + 1) % data.hero.length)
                  }
                  className="p-2.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700 text-white transition cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Live Database Stats Strip */}
        {data?.stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/catalog?type=movies"
              className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 hover:border-red-500/40 flex items-center gap-4 transition group"
            >
              <div className="w-12 h-12 rounded-xl bg-red-600/15 border border-red-500/20 flex items-center justify-center text-red-500 group-hover:scale-110 transition">
                <Film className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-white">
                  {data.stats.movies.toLocaleString()}
                </p>
                <p className="text-xs text-zinc-400 font-medium">
                  Películas en Catálogo
                </p>
              </div>
            </Link>

            <Link
              href="/catalog?type=series"
              className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 hover:border-blue-500/40 flex items-center gap-4 transition group"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-600/15 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition">
                <Tv className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-white">
                  {data.stats.series.toLocaleString()}
                </p>
                <p className="text-xs text-zinc-400 font-medium">
                  Series Disponibles
                </p>
              </div>
            </Link>

            <Link
              href="/catalog?type=animes"
              className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 hover:border-purple-500/40 flex items-center gap-4 transition group"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-600/15 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-white">
                  {data.stats.animes.toLocaleString()}
                </p>
                <p className="text-xs text-zinc-400 font-medium">
                  Animes en Emisión
                </p>
              </div>
            </Link>

            <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-600/15 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Server className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-white">
                  {data.stats.totalVideos.toLocaleString()}
                </p>
                <p className="text-xs text-zinc-400 font-medium">
                  Servidores de Video Activos
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Genre Quick Filter Bar */}
        {data?.genres && data.genres.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            {data.genres.map((g) => (
              <Link
                key={g.id}
                href={`/catalog?type=movies&genre=${g.id}`}
                className="shrink-0 px-3.5 py-1.5 rounded-full bg-zinc-900 hover:bg-red-600 text-zinc-300 hover:text-white border border-zinc-800 hover:border-red-500 text-xs font-medium transition"
              >
                {g.name}
              </Link>
            ))}
          </div>
        )}

        {/* Section 1: Latest Movies */}
        {data?.sections.latestMovies && data.sections.latestMovies.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Film className="w-5 h-5 text-red-500" />
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  Películas Recientes
                </h2>
              </div>
              <Link
                href="/catalog?type=movies"
                className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-red-400 hover:text-red-300 transition"
              >
                <span>Ver todas ({data.stats.movies})</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
              {data.sections.latestMovies.map((item) => (
                <MediaCard key={`movie-${item.id}`} item={item} />
              ))}
            </div>
          </section>
        )}

        {/* Section 2: Latest Series */}
        {data?.sections.latestSeries && data.sections.latestSeries.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Tv className="w-5 h-5 text-blue-400" />
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  Series Actualizadas
                </h2>
              </div>
              <Link
                href="/catalog?type=series"
                className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-blue-400 hover:text-blue-300 transition"
              >
                <span>Ver todas ({data.stats.series})</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
              {data.sections.latestSeries.map((item) => (
                <MediaCard key={`serie-${item.id}`} item={item} />
              ))}
            </div>
          </section>
        )}

        {/* Section 3: Animes */}
        {data?.sections.latestAnimes && data.sections.latestAnimes.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  Animes Destacados
                </h2>
              </div>
              <Link
                href="/catalog?type=animes"
                className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-purple-400 hover:text-purple-300 transition"
              >
                <span>Ver todos ({data.stats.animes})</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
              {data.sections.latestAnimes.map((item) => (
                <MediaCard key={`anime-${item.id}`} item={item} />
              ))}
            </div>
          </section>
        )}

        {/* Section 4: Top Rated Movies */}
        {data?.sections.topRatedMovies && data.sections.topRatedMovies.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Flame className="w-5 h-5 text-amber-500" />
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  Mejor Valoradas en TMDB
                </h2>
              </div>
              <Link
                href="/catalog?type=movies&sort=rating"
                className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-amber-400 hover:text-amber-300 transition"
              >
                <span>Ver ranking</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
              {data.sections.topRatedMovies.map((item) => (
                <MediaCard key={`top-${item.id}`} item={item} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

