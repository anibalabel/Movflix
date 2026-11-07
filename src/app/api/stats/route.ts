import { NextResponse } from 'next/server';
import { withDb, normalizeImageUrl, isDatabaseConfigured } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      {
        success: false,
        needsSetup: true,
        error: 'La base de datos no está configurada. Completa la instalación en /setup.',
      },
      { status: 503 }
    );
  }

  try {
    return await withDb(async (conn) => {
      const [[countsRow]] = await conn.query<RowDataPacket[]>(
        `SELECT
          (SELECT COUNT(*) FROM movies WHERE active = 1) as movies,
          (SELECT COUNT(*) FROM series WHERE active = 1) as series,
          (SELECT COUNT(*) FROM animes WHERE active = 1) as animes,
          (SELECT COUNT(*) FROM movie_videos) +
          (SELECT COUNT(*) FROM serie_videos) +
          (SELECT COUNT(*) FROM anime_videos) as totalVideos`
      );

      const [genresRows] = await conn.query<RowDataPacket[]>(
        'SELECT id, name FROM genres ORDER BY name ASC'
      );

      // 1. Consultar directamente la tabla `featureds` de Dooplex para el Slider "Destacado Dooplex"
      const [featuredRows] = await conn.query<RowDataPacket[]>(
        `SELECT id, featured_id, title, poster_path, backdrop_path, backdrop_path_tv,
                release_date, overview, quality, vote_average, type, genre, premuim, position, custom, custom_link
         FROM featureds
         WHERE featured_id IS NOT NULL
         ORDER BY position ASC, id DESC`
      );

      const [latestMovies] = await conn.query<RowDataPacket[]>(
        `SELECT m.id, m.tmdb_id, m.title, m.overview, m.poster_path, m.backdrop_path, m.vote_average,
                m.release_date, m.views, m.premuim,
                (SELECT COUNT(*) FROM movie_videos mv WHERE mv.movie_id = m.id) as video_count
         FROM movies m
         WHERE m.active = 1
         ORDER BY m.id DESC
         LIMIT 16`
      );

      const [latestSeries] = await conn.query<RowDataPacket[]>(
        `SELECT s.id, s.tmdb_id, s.name as title, s.overview, s.poster_path, s.backdrop_path, s.vote_average,
                s.first_air_date as release_date, s.views, s.premuim,
                (SELECT COUNT(*) FROM seasons sea WHERE sea.serie_id = s.id) as season_count
         FROM series s
         WHERE s.active = 1
         ORDER BY s.id DESC
         LIMIT 16`
      );

      const [latestAnimes] = await conn.query<RowDataPacket[]>(
        `SELECT a.id, a.tmdb_id, a.name as title, a.overview, a.poster_path, a.backdrop_path, a.vote_average,
                a.first_air_date as release_date, a.views, a.premuim,
                (SELECT COUNT(*) FROM anime_seasons asea WHERE asea.anime_id = a.id) as season_count
         FROM animes a
         WHERE a.active = 1
         ORDER BY a.id DESC
         LIMIT 16`
      );

      const [topRatedMovies] = await conn.query<RowDataPacket[]>(
        `SELECT m.id, m.tmdb_id, m.title, m.overview, m.poster_path, m.backdrop_path, m.vote_average,
                m.release_date, m.views, m.premuim,
                (SELECT COUNT(*) FROM movie_videos mv WHERE mv.movie_id = m.id) as video_count
         FROM movies m
         WHERE m.active = 1 AND m.vote_average > 0
         ORDER BY m.vote_average DESC, m.popularity DESC
         LIMIT 16`
      );

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

      const mapFeaturedType = (rawType: string | null): 'movies' | 'series' | 'animes' => {
        const t = String(rawType || '').toLowerCase();
        if (t.includes('serie') || t.includes('tv')) return 'series';
        if (t.includes('anime')) return 'animes';
        return 'movies';
      };

      const heroItems = featuredRows.map((f) => ({
        id: Number(f.featured_id),
        featured_row_id: Number(f.id),
        title: f.title || 'Sin título',
        overview: f.overview || '',
        poster_path: normalizeImageUrl(f.poster_path, 'w500'),
        backdrop_path: normalizeImageUrl(f.backdrop_path_tv || f.backdrop_path, 'original'),
        vote_average: Number(f.vote_average || 0),
        release_date: f.release_date || null,
        quality: f.quality || null,
        genre: f.genre || null,
        position: Number(f.position || 0),
        mediaType: mapFeaturedType(f.type),
      }));

      return NextResponse.json({
        success: true,
        stats: {
          movies: Number(countsRow?.movies || 0),
          series: Number(countsRow?.series || 0),
          animes: Number(countsRow?.animes || 0),
          totalVideos: Number(countsRow?.totalVideos || 0),
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
