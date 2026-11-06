import { NextResponse } from 'next/server';
import { pool, normalizeImageUrl } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET() {
  try {
    const [
      [[movieCountRow]],
      [[serieCountRow]],
      [[animeCountRow]],
      [[movieVideoCountRow]],
      [[serieVideoCountRow]],
      [[animeVideoCountRow]],
      [genresRows],
      [heroMovies],
      [heroSeries],
      [latestMovies],
      [latestSeries],
      [latestAnimes],
      [topRatedMovies],
    ] = await Promise.all([
      pool.query<RowDataPacket[]>('SELECT COUNT(*) as total FROM movies WHERE active = 1'),
      pool.query<RowDataPacket[]>('SELECT COUNT(*) as total FROM series WHERE active = 1'),
      pool.query<RowDataPacket[]>('SELECT COUNT(*) as total FROM animes WHERE active = 1'),
      pool.query<RowDataPacket[]>('SELECT COUNT(*) as total FROM movie_videos'),
      pool.query<RowDataPacket[]>('SELECT COUNT(*) as total FROM serie_videos'),
      pool.query<RowDataPacket[]>('SELECT COUNT(*) as total FROM anime_videos'),
      pool.query<RowDataPacket[]>('SELECT id, name FROM genres ORDER BY name ASC'),
      pool.query<RowDataPacket[]>(
        `SELECT m.id, m.tmdb_id, m.title, m.overview, m.poster_path, m.backdrop_path, m.backdrop_path_tv,
                m.vote_average, m.release_date, m.runtime, m.views,
                (SELECT COUNT(*) FROM movie_videos mv WHERE mv.movie_id = m.id) as video_count
         FROM movies m
         WHERE m.active = 1 AND (m.backdrop_path IS NOT NULL OR m.backdrop_path_tv IS NOT NULL)
         ORDER BY m.featured DESC, m.pinned DESC, m.popularity DESC, m.id DESC
         LIMIT 5`
      ),
      pool.query<RowDataPacket[]>(
        `SELECT s.id, s.tmdb_id, s.name as title, s.overview, s.poster_path, s.backdrop_path, s.backdrop_path_tv,
                s.vote_average, s.first_air_date as release_date, s.views
         FROM series s
         WHERE s.active = 1 AND (s.backdrop_path IS NOT NULL OR s.backdrop_path_tv IS NOT NULL)
         ORDER BY s.featured DESC, s.pinned DESC, s.popularity DESC, s.id DESC
         LIMIT 3`
      ),
      pool.query<RowDataPacket[]>(
        `SELECT m.id, m.tmdb_id, m.title, m.overview, m.poster_path, m.backdrop_path, m.vote_average,
                m.release_date, m.views, m.premuim,
                (SELECT COUNT(*) FROM movie_videos mv WHERE mv.movie_id = m.id) as video_count
         FROM movies m
         WHERE m.active = 1
         ORDER BY m.id DESC
         LIMIT 16`
      ),
      pool.query<RowDataPacket[]>(
        `SELECT s.id, s.tmdb_id, s.name as title, s.overview, s.poster_path, s.backdrop_path, s.vote_average,
                s.first_air_date as release_date, s.views, s.premuim,
                (SELECT COUNT(*) FROM seasons sea WHERE sea.serie_id = s.id) as season_count
         FROM series s
         WHERE s.active = 1
         ORDER BY s.id DESC
         LIMIT 16`
      ),
      pool.query<RowDataPacket[]>(
        `SELECT a.id, a.tmdb_id, a.name as title, a.overview, a.poster_path, a.backdrop_path, a.vote_average,
                a.first_air_date as release_date, a.views, a.premuim,
                (SELECT COUNT(*) FROM anime_seasons asea WHERE asea.anime_id = a.id) as season_count
         FROM animes a
         WHERE a.active = 1
         ORDER BY a.id DESC
         LIMIT 16`
      ),
      pool.query<RowDataPacket[]>(
        `SELECT m.id, m.tmdb_id, m.title, m.overview, m.poster_path, m.backdrop_path, m.vote_average,
                m.release_date, m.views, m.premuim,
                (SELECT COUNT(*) FROM movie_videos mv WHERE mv.movie_id = m.id) as video_count
         FROM movies m
         WHERE m.active = 1 AND m.vote_average > 0
         ORDER BY m.vote_average DESC, m.popularity DESC
         LIMIT 16`
      ),
    ]);

    const formatItem = (item: RowDataPacket, mediaType: 'movies' | 'series' | 'animes') => ({
      id: item.id,
      tmdb_id: item.tmdb_id,
      title: item.title || item.name || 'Sin título',
      overview: item.overview || '',
      poster_path: normalizeImageUrl(item.poster_path, 'w500'),
      backdrop_path: normalizeImageUrl(item.backdrop_path_tv || item.backdrop_path, 'original'),
      vote_average: Number(item.vote_average || 0),
      release_date: item.release_date || null,
      runtime: item.runtime || null,
      views: Number(item.views || 0),
      video_count: Number(item.video_count || 0),
      season_count: Number(item.season_count || 0),
      mediaType,
    });

    const heroItems = [
      ...heroMovies.map((m) => formatItem(m, 'movies')),
      ...heroSeries.map((s) => formatItem(s, 'series')),
    ].slice(0, 6);

    return NextResponse.json({
      success: true,
      stats: {
        movies: Number(movieCountRow?.total || 0),
        series: Number(serieCountRow?.total || 0),
        animes: Number(animeCountRow?.total || 0),
        totalVideos:
          Number(movieVideoCountRow?.total || 0) +
          Number(serieVideoCountRow?.total || 0) +
          Number(animeVideoCountRow?.total || 0),
      },
      genres: genresRows,
      hero: heroItems,
      sections: {
        latestMovies: latestMovies.map((m) => formatItem(m, 'movies')),
        latestSeries: latestSeries.map((s) => formatItem(s, 'series')),
        latestAnimes: latestAnimes.map((a) => formatItem(a, 'animes')),
        topRatedMovies: topRatedMovies.map((m) => formatItem(m, 'movies')),
      },
    });
  } catch (error: unknown) {
    console.error('Error in /api/stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Database connection error',
      },
      { status: 500 }
    );
  }
}

