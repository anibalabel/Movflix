'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import MediaCard, { MediaItemSummary } from '@/components/MediaCard';
import { AuthUser } from '@/components/LoginModal';
import {
  Heart,
  User,
  Mail,
  ShieldCheck,
  Film,
  Tv,
  Sparkles,
  Trash2,
  Compass,
  LogOut,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface FavoriteMediaItem extends MediaItemSummary {
  favoriteable_type: string;
  favorited_at: string;
}

export default function UserDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [favorites, setFavorites] = useState<FavoriteMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<
    'all' | 'movies' | 'series' | 'animes'
  >('all');

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/favorites');
      if (res.status === 401) {
        setUser(null);
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        setFavorites(data.data || []);
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleRemoveFavorite = async (
    mediaType: 'movies' | 'series' | 'animes',
    mediaId: number
  ) => {
    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaType, mediaId }),
      });
      const data = await res.json();
      if (data.success) {
        setFavorites((prev) =>
          prev.filter(
            (item) => !(item.mediaType === mediaType && item.id === mediaId)
          )
        );
      }
    } catch (err) {
      console.error('Error removing favorite:', err);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  };

  const filteredFavorites = useMemo(() => {
    if (filterType === 'all') return favorites;
    return favorites.filter((f) => f.mediaType === filterType);
  }, [favorites, filterType]);

  const counts = useMemo(() => {
    return {
      all: favorites.length,
      movies: favorites.filter((f) => f.mediaType === 'movies').length,
      series: favorites.filter((f) => f.mediaType === 'series').length,
      animes: favorites.filter((f) => f.mediaType === 'animes').length,
    };
  }, [favorites]);

  if (loading) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-400 text-sm">Cargando tu panel y favoritos...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-red-600/15 border border-red-500/30 flex items-center justify-center mx-auto text-red-500">
          <User className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">
          Inicia sesión para ver tu Panel
        </h1>
        <p className="text-sm text-zinc-400">
          Haz clic en el botón <strong>Acceder</strong> de la barra superior para
          iniciar sesión o crear una cuenta y gestionar tus películas, series y
          animes favoritos.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition"
        >
          <span>Volver al Inicio</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* User Profile Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900/95 to-zinc-950 border border-zinc-800/90 p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center text-white font-black text-2xl sm:text-3xl shadow-xl shadow-red-600/25 shrink-0">
            {String(user.name || user.username || 'U')
              .charAt(0)
              .toUpperCase()}
          </div>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {user.name || user.username}
              </h1>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                  user.role === 'admin'
                    ? 'bg-red-600/20 text-red-400 border border-red-500/30'
                    : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                {user.role === 'admin' ? 'Administrador' : 'Miembro Dooplex'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-zinc-500" />
                {user.email}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5 text-rose-400 font-semibold">
                <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                {favorites.length}{' '}
                {favorites.length === 1 ? 'Favorito guardado' : 'Favoritos guardados'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-center">
          <Link
            href="/catalog"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs sm:text-sm font-semibold transition"
          >
            <Compass className="w-4 h-4 text-red-400" />
            <span>Explorar Catálogo</span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-red-600/20 border border-zinc-800 hover:border-red-500/40 text-zinc-300 hover:text-red-300 text-xs sm:text-sm font-semibold transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>

      {/* Favorites Section */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500">
              <Heart className="w-5 h-5 fill-rose-500" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Mis Favoritos
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400">
                Películas, series y animes sincronizados con tu cuenta en Dooplex
              </p>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-zinc-900 p-1.5 rounded-2xl border border-zinc-800 flex-wrap">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                filterType === 'all'
                  ? 'bg-red-600 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Todos ({counts.all})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('movies')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                filterType === 'movies'
                  ? 'bg-red-600 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Películas ({counts.movies})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType('series')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                filterType === 'series'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Series ({counts.series})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType('animes')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                filterType === 'animes'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Animes ({counts.animes})</span>
            </button>
          </div>
        </div>

        {filteredFavorites.length === 0 ? (
          <div className="rounded-3xl bg-zinc-900/40 border border-zinc-800/80 py-16 px-6 text-center space-y-4">
            <Heart className="w-12 h-12 text-zinc-700 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">
                Aún no tienes títulos en esta lista de favoritos
              </h3>
              <p className="text-sm text-zinc-400 max-w-md mx-auto">
                Al entrar a cualquier película, serie o anime podrás presionar el
                botón <strong>Agregar a Favoritos</strong> para guardarlo aquí.
              </p>
            </div>
            <Link
              href="/catalog"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-red-600/20 transition"
            >
              <Compass className="w-4 h-4" />
              <span>Ir al Catálogo</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredFavorites.map((item) => (
              <div
                key={`${item.mediaType}-${item.id}`}
                className="relative group/fav"
              >
                <MediaCard item={item} />
                <button
                  type="button"
                  onClick={() => handleRemoveFavorite(item.mediaType, item.id)}
                  title="Quitar de Favoritos"
                  className="absolute bottom-14 right-2.5 z-20 p-2 rounded-full bg-black/85 hover:bg-red-600 text-zinc-300 hover:text-white border border-zinc-700 hover:border-red-500 shadow-lg transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

