import { NextRequest, NextResponse } from 'next/server';
import {
  withDb,
  getSessionUserFromRequest,
  TMDB_API_KEY,
  normalizeImageUrl,
} from '@/lib/db';
import { RowDataPacket } from 'mysql2/promise';
export { POST } from '@/app/api/movie-requests/submit/route';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tmdbSearch = (searchParams.get('tmdb_search') || '').trim();
  const type = (searchParams.get('type') || 'movie').trim().toLowerCase();

  // Modo búsqueda en vivo en TMDB para ayudar al usuario a elegir la película/serie/anime a pedir
  if (tmdbSearch) {
    try {
      const endpoint = type === 'movie' ? 'movie' : 'tv';
      const url = `https://api.themoviedb.org/3/search/${endpoint}?api_key=${TMDB_API_KEY}&language=es-MX&query=${encodeURIComponent(
        tmdbSearch
      )}&page=1`;
      const res = await fetch(url);
      if (!res.ok) {
        return NextResponse.json({ success: true, results: [] });
      }
      const data = await res.json();
      const results = (data.results || []).slice(0, 8).map((item: Record<string, unknown>) => ({
        tmdb_id: Number(item.id),
        title: String(item.title || item.name || 'Sin título'),
        overview: String(item.overview || ''),
        poster_path: item.poster_path
          ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
          : '',
        release_date: String(item.release_date || item.first_air_date || ''),
        vote_average: Number(item.vote_average || 0),
        type: type === 'serie' || type === 'series' ? 'serie' : type === 'anime' ? 'anime' : 'movie',
      }));
      return NextResponse.json({ success: true, results });
    } catch {
      return NextResponse.json({ success: true, results: [] });
    }
  }

  const sessionUser = getSessionUserFromRequest(request);
  if (!sessionUser || !sessionUser.id) {
    return NextResponse.json(
      { success: false, message: 'Inicia sesión para ver tus pedidos' },
      { status: 401 }
    );
  }

  try {
    return await withDb(async (conn) => {
      const [rows] = await conn.query<RowDataPacket[]>(
        `SELECT id, user_id, movie_imdb_id, tmdb_id, type, status,
                request_title, poster_path, backdrop_path, release_date,
                vote_average, user_notes, admin_notes, created_media_id,
                requested_at, processed_at, created_at, updated_at
         FROM movie_requests
         WHERE user_id = ?
         ORDER BY requested_at DESC, id DESC
         LIMIT 50`,
        [sessionUser.id]
      );

      const data = rows.map((r) => ({
        id: Number(r.id),
        user_id: Number(r.user_id),
        movie_imdb_id: r.movie_imdb_id,
        tmdb_id: r.tmdb_id ? Number(r.tmdb_id) : null,
        type: r.type || 'movie',
        status: r.status || 'pending',
        request_title: r.request_title || `TMDB #${r.tmdb_id || r.movie_imdb_id}`,
        poster_path: normalizeImageUrl(r.poster_path, 'w500'),
        backdrop_path: normalizeImageUrl(r.backdrop_path, 'original'),
        release_date: r.release_date,
        vote_average: Number(r.vote_average || 0),
        user_notes: r.user_notes || null,
        admin_notes: r.admin_notes || null,
        created_media_id: r.created_media_id ? Number(r.created_media_id) : null,
        requested_at: r.requested_at || r.created_at,
        processed_at: r.processed_at || null,
      }));

      return NextResponse.json({
        success: true,
        total: data.length,
        data,
      });
    });
  } catch (error: unknown) {
    console.error('Error in GET /api/movie-requests:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : 'Error al obtener tus pedidos',
      },
      { status: 500 }
    );
  }
}

