'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import MediaCard, { MediaItemSummary } from '@/components/MediaCard';
import {
  Film,
  Tv,
  Sparkles,
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

function CatalogContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialType =
    (searchParams.get('type') as 'movies' | 'series' | 'animes') || 'movies';
  const initialQuery = searchParams.get('q') || '';
  const initialGenre = searchParams.get('genre') || '';
  const initialSort = searchParams.get('sort') || 'latest';
  const initialPage = parseInt(searchParams.get('page') || '1', 10) || 1;

  const [type, setType] = useState<'movies' | 'series' | 'animes'>(initialType);
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [genre, setGenre] = useState(initialGenre);
  const [sort, setSort] = useState(initialSort);
  const [page, setPage] = useState(initialPage);

  const [items, setItems] = useState<MediaItemSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [genresList, setGenresList] = useState<Array<{ id: number; name: string }>>([]);
  const [loading, setLoading] = useState(true);

  // Sync URL searchParams changes
  useEffect(() => {
    const t = (searchParams.get('type') as 'movies' | 'series' | 'animes') || 'movies';
    const q = searchParams.get('q') || '';
    const g = searchParams.get('genre') || '';
    const s = searchParams.get('sort') || 'latest';
    setType(t);
    setSearchInput(q);
    setDebouncedQuery(q);
    setGenre(g);
    setSort(s);
    setPage(1);
  }, [searchParams]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Load genres once
  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then((d) => {
        if (d.genres) setGenresList(d.genres);
      })
      .catch(() => {});
  }, []);

  // Load catalog items
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      type,
      page: String(page),
      limit: '24',
      sort,
    });
    if (debouncedQuery) params.set('q', debouncedQuery);
    if (genre) params.set('genre', genre);

    fetch(`/api/catalog?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setItems(json.data || []);
          setTotal(json.total || 0);
          setTotalPages(json.totalPages || 1);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [type, page, debouncedQuery, genre, sort]);

  const handleTypeSelect = (newType: 'movies' | 'series' | 'animes') => {
    setType(newType);
    setPage(1);
    router.push(`/catalog?type=${newType}`, { scroll: false });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header & Type Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Catálogo Completo Dooplex
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Explora {total.toLocaleString()}{' '}
            {type === 'movies'
              ? 'películas'
              : type === 'series'
              ? 'series'
              : 'animes'}{' '}
            disponibles en la base de datos
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 bg-zinc-900 p-1.5 rounded-2xl border border-zinc-800 self-start">
          <button
            type="button"
            onClick={() => handleTypeSelect('movies')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              type === 'movies'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/25'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Film className="w-4 h-4" />
            <span>Películas</span>
          </button>
          <button
            type="button"
            onClick={() => handleTypeSelect('series')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              type === 'series'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Tv className="w-4 h-4" />
            <span>Series</span>
          </button>
          <button
            type="button"
            onClick={() => handleTypeSelect('animes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              type === 'animes'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/25'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Animes</span>
          </button>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Search Input */}
        <div className="md:col-span-6 relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Filtrar por título, nombre original o TMDB ID..."
            className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Genre Select */}
        <div className="md:col-span-3">
          <select
            value={genre}
            onChange={(e) => {
              setGenre(e.target.value);
              setPage(1);
            }}
            className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-200 focus:outline-none focus:border-red-500 transition"
          >
            <option value="">Todos los géneros</option>
            {genresList.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Select */}
        <div className="md:col-span-3 flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-zinc-400 shrink-0 hidden sm:block" />
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
            className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-200 focus:outline-none focus:border-red-500 transition"
          >
            <option value="latest">Más recientes primero</option>
            <option value="popular">Más populares</option>
            <option value="rating">Mejor puntuación TMDB</option>
            <option value="views">Más reproducidos</option>
          </select>
        </div>
      </div>

      {/* Results Grid */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-400 text-sm">Cargando resultados...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="py-20 text-center rounded-2xl bg-zinc-900/40 border border-zinc-800/80 p-8">
          <p className="text-lg font-semibold text-white">
            No se encontraron resultados
          </p>
          <p className="text-sm text-zinc-400 mt-1">
            Intenta con otro término de búsqueda o cambia de categoría (Películas / Series / Animes).
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {items.map((item) => (
              <MediaCard key={`${item.mediaType}-${item.id}`} item={item} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pt-8 flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => {
                  setPage((p) => Math.max(1, p - 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 border border-zinc-800 text-sm font-medium text-white transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Anterior</span>
              </button>

              <span className="px-4 py-2 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs sm:text-sm text-zinc-300 font-semibold">
                Página <strong className="text-white">{page}</strong> de{' '}
                <strong className="text-white">{totalPages}</strong>
              </span>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => {
                  setPage((p) => Math.min(totalPages, p + 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 border border-zinc-800 text-sm font-medium text-white transition cursor-pointer"
              >
                <span>Siguiente</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function CatalogPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CatalogContent />
    </Suspense>
  );
}

