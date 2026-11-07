'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Film,
  Tv,
  Sparkles,
  Search,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquarePlus,
  PlusCircle,
  AlertCircle,
  Star,
} from 'lucide-react';

interface TmdbSearchResult {
  tmdb_id: number;
  title: string;
  overview: string;
  poster_path: string;
  release_date: string;
  vote_average: number;
  type: 'movie' | 'serie' | 'anime';
}

interface UserMovieRequest {
  id: number;
  tmdb_id: number | null;
  movie_imdb_id: string | null;
  type: 'movie' | 'serie' | 'anime';
  status: 'pending' | 'approved' | 'rejected';
  request_title: string;
  poster_path: string;
  release_date: string | null;
  vote_average: number;
  user_notes: string | null;
  admin_notes: string | null;
  created_media_id: number | null;
  requested_at: string;
}

export default function RequestsAndSuggestionsPanel() {
  const [activeTab, setActiveTab] = useState<'requests' | 'suggestions'>(
    'requests'
  );

  // Movie Requests state
  const [reqType, setReqType] = useState<'movie' | 'serie' | 'anime'>('movie');
  const [searchQuery, setSearchQuery] = useState('');
  const [tmdbResults, setTmdbResults] = useState<TmdbSearchResult[]>([]);
  const [searchingTmdb, setSearchingTmdb] = useState(false);
  const [selectedTmdb, setSelectedTmdb] = useState<TmdbSearchResult | null>(
    null
  );
  const [manualTmdbId, setManualTmdbId] = useState('');
  const [manualImdbId, setManualImdbId] = useState('');
  const [userNotes, setUserNotes] = useState('');
  const [reqSubmitting, setReqSubmitting] = useState(false);
  const [reqStatus, setReqStatus] = useState<{
    type: 'success' | 'error';
    text: string;
    watchUrl?: string;
  } | null>(null);
  const [myRequests, setMyRequests] = useState<UserMovieRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  // Suggestions state
  const [sugTitle, setSugTitle] = useState('');
  const [sugMessage, setSugMessage] = useState('');
  const [sugSubmitting, setSugSubmitting] = useState(false);
  const [sugStatus, setSugStatus] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const loadMyRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const res = await fetch('/api/movie-requests');
      const data = await res.json();
      if (data?.success && Array.isArray(data.data)) {
        setMyRequests(data.data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    loadMyRequests();
  }, [loadMyRequests]);

  const handleTmdbSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchingTmdb(true);
    setReqStatus(null);
    try {
      const res = await fetch(
        `/api/movie-requests?tmdb_search=${encodeURIComponent(
          searchQuery.trim()
        )}&type=${reqType}`
      );
      const data = await res.json();
      setTmdbResults(data.results || []);
    } catch {
      setTmdbResults([]);
    } finally {
      setSearchingTmdb(false);
    }
  };

  const handleSubmitMovieRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setReqStatus(null);

    const tmdbIdToSend = selectedTmdb?.tmdb_id || Number(manualTmdbId) || null;
    const imdbIdToSend = manualImdbId.trim() || null;

    if (!tmdbIdToSend && !imdbIdToSend) {
      setReqStatus({
        type: 'error',
        text: 'Busca y selecciona un título arriba o ingresa su TMDB ID / IMDb ID.',
      });
      return;
    }

    setReqSubmitting(true);
    try {
      const res = await fetch('/api/movie-requests/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdb_id: tmdbIdToSend,
          movie_imdb_id: imdbIdToSend,
          type: reqType,
          user_notes: userNotes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setReqStatus({
          type: 'error',
          text: data.message || 'No se pudo enviar el pedido.',
          watchUrl: data.watch_url,
        });
      } else {
        setReqStatus({
          type: 'success',
          text: data.message || '¡Pedido enviado con éxito!',
        });
        setSelectedTmdb(null);
        setManualTmdbId('');
        setManualImdbId('');
        setUserNotes('');
        setTmdbResults([]);
        setSearchQuery('');
        loadMyRequests();
      }
    } catch {
      setReqStatus({
        type: 'error',
        text: 'Error de conexión al enviar el pedido.',
      });
    } finally {
      setReqSubmitting(false);
    }
  };

  const handleSubmitSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setSugStatus(null);
    if (!sugTitle.trim() || !sugMessage.trim()) return;

    setSugSubmitting(true);
    try {
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: sugTitle.trim(),
          message: sugMessage.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setSugStatus({
          type: 'error',
          text: data.message || 'No se pudo enviar la sugerencia.',
        });
      } else {
        setSugStatus({
          type: 'success',
          text:
            data.response_message ||
            '¡Gracias! Tu sugerencia ha sido registrada.',
        });
        setSugTitle('');
        setSugMessage('');
      }
    } catch {
      setSugStatus({
        type: 'error',
        text: 'Error de conexión al enviar tu sugerencia.',
      });
    } finally {
      setSugSubmitting(false);
    }
  };

  return (
    <section className="rounded-3xl bg-zinc-900/60 border border-zinc-800/80 p-6 sm:p-8 space-y-6">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600/15 border border-red-500/30 flex items-center justify-center text-red-500">
            {activeTab === 'requests' ? (
              <PlusCircle className="w-5 h-5" />
            ) : (
              <MessageSquarePlus className="w-5 h-5" />
            )}
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              {activeTab === 'requests'
                ? 'Pedidos de Películas, Series y Animes'
                : 'Caja de Sugerencias'}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              {activeTab === 'requests'
                ? 'Solicita nuevo contenido con datos de TMDB y sigue el estado de tus pedidos'
                : 'Envíanos tus ideas o sugerencias para mejorar la plataforma'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-zinc-950 p-1.5 rounded-2xl border border-zinc-800 self-start sm:self-center">
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'requests'
                ? 'bg-red-600 text-white shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Pedir Contenido ({myRequests.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('suggestions')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'suggestions'
                ? 'bg-red-600 text-white shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            <span>Sugerencias</span>
          </button>
        </div>
      </div>

      {activeTab === 'requests' ? (
        <div className="space-y-8">
          {/* Type Selector + TMDB Search */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mr-2">
                1. Tipo de contenido:
              </span>
              <button
                type="button"
                onClick={() => {
                  setReqType('movie');
                  setTmdbResults([]);
                  setSelectedTmdb(null);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  reqType === 'movie'
                    ? 'bg-red-600 border-red-500 text-white'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>Película</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setReqType('serie');
                  setTmdbResults([]);
                  setSelectedTmdb(null);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  reqType === 'serie'
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <Tv className="w-3.5 h-3.5" />
                <span>Serie</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setReqType('anime');
                  setTmdbResults([]);
                  setSelectedTmdb(null);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  reqType === 'anime'
                    ? 'bg-purple-600 border-purple-500 text-white'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Anime</span>
              </button>
            </div>

            {/* TMDB Search Bar */}
            <form onSubmit={handleTmdbSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="2. Busca el nombre de la película, serie o anime en TMDB..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-red-500 transition"
                />
              </div>
              <button
                type="submit"
                disabled={searchingTmdb}
                className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs sm:text-sm font-bold transition cursor-pointer shrink-0"
              >
                {searchingTmdb ? 'Buscando...' : 'Buscar en TMDB'}
              </button>
            </form>

            {/* TMDB Search Results */}
            {tmdbResults.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 pt-2">
                {tmdbResults.map((item) => {
                  const isSelected = selectedTmdb?.tmdb_id === item.tmdb_id;
                  return (
                    <button
                      key={item.tmdb_id}
                      type="button"
                      onClick={() => {
                        setSelectedTmdb(item);
                        setManualTmdbId(String(item.tmdb_id));
                      }}
                      className={`text-left rounded-xl overflow-hidden border p-1.5 transition cursor-pointer ${
                        isSelected
                          ? 'bg-red-600/20 border-red-500 ring-2 ring-red-500/40'
                          : 'bg-zinc-950 border-zinc-800 hover:border-zinc-600'
                      }`}
                    >
                      <div className="aspect-[2/3] rounded-lg bg-zinc-900 overflow-hidden mb-1.5">
                        {item.poster_path ? (
                          <img
                            src={item.poster_path}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-700 text-xs">
                            Sin Poster
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-bold text-white line-clamp-1">
                        {item.title}
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        TMDB #{item.tmdb_id}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {reqStatus && (
            <div
              className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-2.5 text-xs sm:text-sm ${
                reqStatus.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-red-500/10 border-red-500/30 text-red-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {reqStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <span>{reqStatus.text}</span>
              </div>
              {reqStatus.watchUrl && (
                <Link
                  href={reqStatus.watchUrl}
                  className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition"
                >
                  Ver ahora en el Catálogo
                </Link>
              )}
            </div>
          )}

          {/* Submit Request Form */}
          <form
            onSubmit={handleSubmitMovieRequest}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-2 border-t border-zinc-800/60"
          >
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                TMDB ID o IMDb ID
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={manualTmdbId}
                  onChange={(e) => setManualTmdbId(e.target.value)}
                  placeholder="TMDB (ej. 550)"
                  className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-red-500 transition"
                />
                <input
                  type="text"
                  value={manualImdbId}
                  onChange={(e) => setManualImdbId(e.target.value)}
                  placeholder="IMDb (tt0137523)"
                  className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-red-500 transition"
                />
              </div>
            </div>

            <div className="md:col-span-2 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
              <div className="flex-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Nota adicional (opcional, máx. 500 caracteres)
                </label>
                <input
                  type="text"
                  maxLength={500}
                  value={userNotes}
                  onChange={(e) => setUserNotes(e.target.value)}
                  placeholder="Ej: En Full HD 1080p audio latino por favor"
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-red-500 transition"
                />
              </div>
              <button
                type="submit"
                disabled={reqSubmitting}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-lg shadow-red-600/20 transition cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4" />
                <span>{reqSubmitting ? 'Enviando...' : 'Enviar Pedido'}</span>
              </button>
            </div>
          </form>

          {/* List of User's Movie Requests */}
          <div className="space-y-3 pt-4 border-t border-zinc-800/80">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
              Historial de mis Pedidos ({myRequests.length})
            </h3>

            {loadingRequests ? (
              <div className="text-xs text-zinc-500 py-4">
                Cargando tus pedidos...
              </div>
            ) : myRequests.length === 0 ? (
              <div className="text-xs sm:text-sm text-zinc-500 py-6 text-center bg-zinc-950/50 rounded-2xl border border-zinc-800/60">
                Aún no has realizado pedidos de películas, series o animes.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {myRequests.map((req) => {
                  const watchPath =
                    req.type === 'serie'
                      ? 'series'
                      : req.type === 'anime'
                      ? 'animes'
                      : 'movies';
                  return (
                    <div
                      key={req.id}
                      className="p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800 flex items-center gap-3.5"
                    >
                      <div className="w-14 h-20 rounded-xl bg-zinc-900 overflow-hidden shrink-0 border border-zinc-800">
                        {req.poster_path ? (
                          <img
                            src={req.poster_path}
                            alt={req.request_title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-700">
                            <Film className="w-5 h-5" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold text-white truncate">
                            {req.request_title}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${
                              req.status === 'approved'
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : req.status === 'rejected'
                                ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                                : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {req.status === 'approved' ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Aprobado</span>
                              </>
                            ) : req.status === 'rejected' ? (
                              <>
                                <XCircle className="w-3 h-3" />
                                <span>Rechazado</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3" />
                                <span>Pendiente</span>
                              </>
                            )}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                          <span className="uppercase font-semibold text-zinc-300">
                            {req.type}
                          </span>
                          {req.vote_average > 0 && (
                            <span className="inline-flex items-center gap-1 text-amber-400">
                              <Star className="w-3 h-3 fill-amber-400" />
                              {req.vote_average.toFixed(1)}
                            </span>
                          )}
                          {req.tmdb_id && <span>• TMDB #{req.tmdb_id}</span>}
                        </div>

                        {req.user_notes && (
                          <p className="text-xs text-zinc-400 line-clamp-1">
                            Nota: {req.user_notes}
                          </p>
                        )}
                        {req.admin_notes && (
                          <p className="text-xs text-emerald-400 font-medium line-clamp-1">
                            Respuesta Admin: {req.admin_notes}
                          </p>
                        )}
                        {req.status === 'approved' && req.created_media_id && (
                          <Link
                            href={`/watch/${watchPath}/${req.created_media_id}`}
                            className="inline-block text-xs font-bold text-red-400 hover:text-red-300 hover:underline pt-0.5"
                          >
                            Ver ahora en Dooplex →
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Suggestions Form */
        <form onSubmit={handleSubmitSuggestion} className="space-y-4 max-w-2xl">
          {sugStatus && (
            <div
              className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs sm:text-sm ${
                sugStatus.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-red-500/10 border-red-500/30 text-red-300'
              }`}
            >
              {sugStatus.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{sugStatus.text}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              Título de la Sugerencia
            </label>
            <input
              type="text"
              required
              maxLength={190}
              value={sugTitle}
              onChange={(e) => setSugTitle(e.target.value)}
              placeholder="Ej: Agreguen Spider-Man 4 / Mejorar reproductor"
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-red-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              Mensaje o Descripción
            </label>
            <textarea
              rows={3}
              required
              maxLength={190}
              value={sugMessage}
              onChange={(e) => setSugMessage(e.target.value)}
              placeholder="Ej: Por favor súbanla en audio latino 1080p..."
              className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-red-500 transition resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={sugSubmitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-lg shadow-red-600/20 transition cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>
              {sugSubmitting ? 'Enviando...' : 'Enviar Sugerencia'}
            </span>
          </button>
        </form>
      )}
    </section>
  );
}

