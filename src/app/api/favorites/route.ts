import { NextRequest, NextResponse } from 'next/server';
import { withDb, normalizeImageUrl } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

function getSessionUser(request: NextRequest): { id: number; name: string; email: string; role: string } | null {
  const cookie = request.cookies.get('dooplex_session')?.value;
  if (!cookie) return null;
  try {
    return JSON.parse(Buffer.from(cookie, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

function toFavoriteableType(mediaType: string): string {
  if (mediaType === 'series' || mediaType === 'App\\Serie') return 'App\\Serie';
  if (mediaType === 'animes' || mediaType === 'App\\Anime') return 'App\\Anime';
  return 'App\\Movie';
}

export async function GET(request: NextRequest) {
  const user = getSessionUser(request);
  if (!user || !user.id) {
    return NextResponse.json(
      { success: false, authenticated: false, error: 'No has iniciado sesión' },
      { status: 401 }
    );
  }

  try {
    return await withDb(async (conn) => {
      const [favRows] = await conn.query<RowDataPacket[]>(
        `SELECT user_id, favoriteable_type, favoriteable_id, created_at
         FROM favorites
         WHERE user_id = ?
         ORDER BY created_at DESC`,
        [user.id]
      );

      const movieIds: number[] = [];
      const serieIds: number[] = [];
      const animeIds: number[] = [];

      for (const row of favRows) {
        const ft = String(row.favoriteable_type || '').toLowerCase();
        const fid = Number(row.favoriteable_id);
        if (!fid) continue;
        if (ft.includes('movie')) movieIds.push(fid);
        else if (ft.includes('serie')) serieIds.push(fid);
        else if (ft.includes('anime')) animeIds.push(fid);
      }

      const moviesMap = new Map<number, RowDataPacket>();
      const seriesMap = new Map<number, RowDataPacket>();
      const animesMap = new Map<number, RowDataPacket>();

      if (movieIds.length > 0) {
        const [mRows] = await conn.query<RowDataPacket[]>(
          `SELECT m.id, m.tmdb_id, m.title, m.overview, m.poster_path, m.backdrop_path,
                  m.vote_average, m.release_date, m.views,
                  (SELECT COUNT(*) FROM movie_videos mv WHERE mv.movie_id = m.id) as video_count
           FROM movies m
           WHERE m.id IN (?)`,
          [movieIds]
        );
        for (const m of mRows) moviesMap.set(Number(m.id), m);
      }

      if (serieIds.length > 0) {
        const [sRows] = await conn.query<RowDataPacket[]>(
          `SELECT s.id, s.tmdb_id, s.name as title, s.overview, s.poster_path, s.backdrop_path,
                  s.vote_average, s.first_air_date as release_date, s.views,
                  (SELECT COUNT(*) FROM seasons sea WHERE sea.serie_id = s.id) as season_count
           FROM series s
           WHERE s.id IN (?)`,
          [serieIds]
        );
        for (const s of sRows) seriesMap.set(Number(s.id), s);
      }

      if (animeIds.length > 0) {
        const [aRows] = await conn.query<RowDataPacket[]>(
          `SELECT a.id, a.tmdb_id, a.name as title, a.overview, a.poster_path, a.backdrop_path,
                  a.vote_average, a.first_air_date as release_date, a.views,
                  (SELECT COUNT(*) FROM anime_seasons asea WHERE asea.anime_id = a.id) as season_count
           FROM animes a
           WHERE a.id IN (?)`,
          [animeIds]
        );
        for (const a of aRows) animesMap.set(Number(a.id), a);
      }

      const items = [];
      for (const row of favRows) {
        const ft = String(row.favoriteable_type || '').toLowerCase();
        const fid = Number(row.favoriteable_id);
        let item: RowDataPacket | undefined;
        let mediaType: 'movies' | 'series' | 'animes' = 'movies';

        if (ft.includes('movie')) {
          item = moviesMap.get(fid);
          mediaType = 'movies';
        } else if (ft.includes('serie')) {
          item = seriesMap.get(fid);
          mediaType = 'series';
        } else if (ft.includes('anime')) {
          item = animesMap.get(fid);
          mediaType = 'animes';
        }

        if (item) {
          items.push({
            id: Number(item.id),
            tmdb_id: item.tmdb_id,
            title: item.title || 'Sin título',
            overview: item.overview || '',
            poster_path: normalizeImageUrl(item.poster_path, 'w500'),
            backdrop_path: normalizeImageUrl(item.backdrop_path, 'original'),
            vote_average: Number(item.vote_average || 0),
            release_date: item.release_date || null,
            views: Number(item.views || 0),
            video_count: Number(item.video_count || 0),
            season_count: Number(item.season_count || 0),
            mediaType,
            favoriteable_type: row.favoriteable_type,
            favorited_at: row.created_at,
          });
        }
      }

      return NextResponse.json({
        success: true,
        user,
        total: items.length,
        data: items,
      });
    });
  } catch (error: unknown) {
    console.error('Error in GET /api/favorites:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al obtener favoritos',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const user = getSessionUser(request);
  if (!user || !user.id) {
    return NextResponse.json(
      { success: false, message: 'Inicia sesión para guardar en tus favoritos' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const mediaType = String(body.mediaType || 'movies');
    const mediaId = Number(body.mediaId);

    if (!mediaId) {
      return NextResponse.json(
        { success: false, message: 'ID de contenido inválido' },
        { status: 400 }
      );
    }

    const favType = toFavoriteableType(mediaType);

    return await withDb(async (conn) => {
      const [existing] = await conn.query<RowDataPacket[]>(
        `SELECT user_id FROM favorites
         WHERE user_id = ? AND favoriteable_type = ? AND favoriteable_id = ?
         LIMIT 1`,
        [user.id, favType, mediaId]
      );

      if (existing && existing.length > 0) {
        await conn.query(
          `DELETE FROM favorites
           WHERE user_id = ? AND favoriteable_type = ? AND favoriteable_id = ?`,
          [user.id, favType, mediaId]
        );
        return NextResponse.json({
          success: true,
          favorited: false,
          message: 'Eliminado de tus favoritos',
        });
      } else {
        await conn.query(
          `INSERT INTO favorites (user_id, favoriteable_type, favoriteable_id, created_at, updated_at)
           VALUES (?, ?, ?, NOW(), NOW())`,
          [user.id, favType, mediaId]
        );
        return NextResponse.json({
          success: true,
          favorited: true,
          message: 'Agregado a tus favoritos',
        });
      }
    });
  } catch (error: unknown) {
    console.error('Error in POST /api/favorites:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Error al actualizar favoritos',
      },
      { status: 500 }
    );
  }
}

