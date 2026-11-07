'use client';

import React from 'react';
import Link from 'next/link';
import { Play, Star, Film, Tv, Sparkles } from 'lucide-react';

export interface MediaItemSummary {
  id: number;
  tmdb_id?: number;
  title: string;
  overview?: string;
  poster_path: string;
  backdrop_path?: string;
  vote_average: number;
  release_date?: string | null;
  views?: number;
  video_count?: number;
  season_count?: number;
  quality?: string | null;
  genre?: string | null;
  mediaType: 'movies' | 'series' | 'animes';
}

export default function MediaCard({ item }: { item: MediaItemSummary }) {
  const year = item.release_date
    ? String(item.release_date).slice(0, 4)
    : '';

  const typeBadge =
    item.mediaType === 'movies'
      ? { label: 'Película', icon: Film, color: 'bg-red-600/90' }
      : item.mediaType === 'series'
      ? { label: 'Serie', icon: Tv, color: 'bg-blue-600/90' }
      : { label: 'Anime', icon: Sparkles, color: 'bg-purple-600/90' };

  return (
    <Link
      href={`/watch/${item.mediaType}/${item.id}`}
      className="group relative flex flex-col rounded-2xl overflow-hidden bg-zinc-900/70 border border-zinc-800/80 hover:border-red-500/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-red-950/20"
    >
      {/* Poster Container */}
      <div className="relative aspect-[2/3] w-full bg-zinc-950 overflow-hidden">
        {item.poster_path ? (
          <img
            src={item.poster_path}
            alt={item.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-zinc-900 to-zinc-950">
            <Film className="w-10 h-10 text-zinc-700 mb-2" />
            <span className="text-xs text-zinc-500 font-medium line-clamp-2">
              {item.title}
            </span>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1 pointer-events-none">
          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md shadow ${typeBadge.color}`}
          >
            {typeBadge.label}
          </span>
          {item.vote_average > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-amber-400 text-xs font-bold shadow">
              <Star className="w-3 h-3 fill-amber-400" />
              {item.vote_average.toFixed(1)}
            </span>
          )}
        </div>

        {/* Hover Overlay with Play Icon */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-4">
          <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/40 transform scale-90 group-hover:scale-100 transition-transform duration-300">
            <Play className="w-5 h-5 fill-white ml-0.5" />
          </div>
          <span className="mt-2 text-xs font-semibold text-white tracking-wide">
            Ver Ahora
          </span>
        </div>
      </div>

      {/* Card Footer */}
      <div className="p-3 flex flex-col flex-1 justify-between bg-zinc-900/90">
        <h3
          title={item.title}
          className="text-sm font-semibold text-zinc-100 group-hover:text-red-400 transition-colors line-clamp-1"
        >
          {item.title}
        </h3>
        <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-400">
          <span>{year || 'Catálogo'}</span>
          {item.mediaType === 'movies' && (item.video_count || 0) > 0 && (
            <span className="text-emerald-400 font-medium">
              {item.video_count} {item.video_count === 1 ? 'servidor' : 'servidores'}
            </span>
          )}
          {(item.mediaType === 'series' || item.mediaType === 'animes') &&
            (item.season_count || 0) > 0 && (
              <span className="text-sky-400 font-medium">
                {item.season_count} {item.season_count === 1 ? 'Temp.' : 'Temps.'}
              </span>
            )}
        </div>
      </div>
    </Link>
  );
}

