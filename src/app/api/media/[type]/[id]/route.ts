import { NextRequest, NextResponse } from 'next/server';
import { pool, normalizeImageUrl, TMDB_API_KEY } from '@/lib/db';
import { classifyVideoLink, RawVideoLink } from '@/lib/video-utils';
import { RowDataPacket } from 'mysql2';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ type: string; id: string }> }
) {
  try {
    const { type, id } = await context.params;
    const { searchParams } = new URL(request.url);
    const byTmdb = searchParams.get('by') === 'tmdb';

    if (!['movies', 'series', 'animes'].includes(type)) {
      return NextResponse.json({ error: 'Tipo de contenido inválido' }, { status: 400 });
    }

    const tableMap = {
      movies: {
        table: 'movies',
        titleCol: 'title',
        dateCol: 'release_date',
        genreTable: 'movie_genres',
        genreFk: 'movie_id',
        tmdbType: 'movie',
      },
      series: {
        table: 'series',
        titleCol: 'name',
        dateCol: 'first_air_date',
        genreTable: 'serie_genres',
        genreFk: 'serie_id',
        tmdbType: 'tv',
      },
      animes: {
        table: 'animes',
        titleCol: 'name',
        dateCol: 'first_air_date',
        genreTable: 'anime_genres',
        genreFk: 'anime_id',
        tmdbType: 'tv',
      },
    } as const;

    const cfg = tableMap[type as 'movies' | 'series' | 'animes'];
    const lookupCol = byTmdb ? 'tmdb_id' : 'id';

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM ${cfg.table} WHERE ${lookupCol} = ? LIMIT 1`,
      [id]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'Contenido no encontrado' }, { status: 404 });
    }

    const rawItem = rows[0];
    const itemId = rawItem.id;

    // Fetch genres
    const [genreRows] = await pool.query<RowDataPacket[]>(
      `SELECT g.id, g.name
       FROM genres g
       INNER JOIN ${cfg.genreTable} mg ON mg.genre_id = g.id
       WHERE mg.${cfg.genreFk} = ?`,
      [itemId]
    );

    let title = rawItem[cfg.titleCol] || rawItem.original_name || 'Sin título';
    let overview = rawItem.overview || '';
    let poster_path = normalizeImageUrl(rawItem.poster_path, 'w500');
    let backdrop_path = normalizeImageUrl(
      rawItem.backdrop_path_tv || rawItem.backdrop_path,
      'original'
    );
    let vote_average = Number(rawItem.vote_average || 0);
    let release_date = rawItem[cfg.dateCol] || null;
    let runtime = rawItem.runtime || null;

    // Optional TMDB visual enrichment if fields are missing
    if (rawItem.tmdb_id && (!overview || !poster_path || !backdrop_path)) {
      try {
        const tmdbRes = await fetch(
          `https://api.themoviedb.org/3/${cfg.tmdbType}/${rawItem.tmdb_id}?language=es-MX&api_key=${TMDB_API_KEY}`
        );
        if (tmdbRes.ok) {
          const tmdbData = await tmdbRes.json();
          if (!overview && tmdbData.overview) overview = tmdbData.overview;
          if (!poster_path && tmdbData.poster_path) {
            poster_path = normalizeImageUrl(tmdbData.poster_path, 'w500');
          }
          if (!backdrop_path && tmdbData.backdrop_path) {
            backdrop_path = normalizeImageUrl(tmdbData.backdrop_path, 'original');
          }
          if (!vote_average && tmdbData.vote_average) {
            vote_average = Number(tmdbData.vote_average);
          }
          if (!release_date) {
            release_date = tmdbData.release_date || tmdbData.first_air_date || null;
          }
          if (!runtime && tmdbData.runtime) {
            runtime = String(tmdbData.runtime);
          }
        }
      } catch {
        // Ignore TMDB enrichment network errors
      }
    }

    // Increment view counter asynchronously
    pool
      .query(`UPDATE ${cfg.table} SET views = COALESCE(views, 0) + 1 WHERE id = ?`, [itemId])
      .catch(() => {});

    // Fetch videos or seasons/episodes depending on type
    let videos = [] as ReturnType<typeof classifyVideoLink>[];
    let seasons = [] as Array<{
      id: number;
      season_number: number;
      name: string;
      overview: string;
      poster_path: string;
      episodes: Array<{
        id: number;
        episode_number: number;
        name: string;
        overview: string;
        still_path: string;
        vote_average: number;
        video_count: number;
      }>;
    }>;

    if (type === 'movies') {
      const [videoRows] = await pool.query<RowDataPacket[]>(
        `SELECT id, server, header, link, lang, quality, video_name, hd, embed, youtubelink, hls, supported_hosts
         FROM movie_videos
         WHERE movie_id = ? AND link IS NOT NULL AND link != ''
         ORDER BY id ASC`,
        [itemId]
      );
      videos = (videoRows as RawVideoLink[]).map(classifyVideoLink);
    } else if (type === 'series') {
      const [seasonRows] = await pool.query<RowDataPacket[]>(
        `SELECT id, season_number, name, overview, poster_path
         FROM seasons
         WHERE serie_id = ?
         ORDER BY season_number ASC, id ASC`,
        [itemId]
      );

      if (seasonRows.length > 0) {
        const seasonIds = seasonRows.map((s) => s.id);
        const [episodeRows] = await pool.query<RowDataPacket[]>(
          `SELECT e.id, e.season_id, e.episode_number, e.name, e.overview, e.still_path, e.still_path_tv, e.vote_average,
                  (SELECT COUNT(*) FROM serie_videos sv WHERE sv.episode_id = e.id AND sv.link IS NOT NULL AND sv.link != '') as video_count
           FROM episodes e
           WHERE e.season_id IN (?)
           ORDER BY e.episode_number ASC, e.id ASC`,
          [seasonIds]
        );

        seasons = seasonRows.map((s) => ({
          id: s.id,
          season_number: Number(s.season_number || 1),
          name: s.name || `Temporada ${s.season_number || 1}`,
          overview: s.overview || '',
          poster_path: normalizeImageUrl(s.poster_path, 'w500'),
          episodes: episodeRows
            .filter((e) => e.season_id === s.id)
            .map((e) => ({
              id: e.id,
              episode_number: Number(e.episode_number || 1),
              name: e.name || `Episodio ${e.episode_number || 1}`,
              overview: e.overview || '',
              still_path: normalizeImageUrl(e.still_path_tv || e.still_path, 'w500'),
              vote_average: Number(e.vote_average || 0),
              video_count: Number(e.video_count || 0),
            })),
        }));
      }
    } else if (type === 'animes') {
      const [seasonRows] = await pool.query<RowDataPacket[]>(
        `SELECT id, season_number, name, overview, poster_path
         FROM anime_seasons
         WHERE anime_id = ?
         ORDER BY season_number ASC, id ASC`,
        [itemId]
      );

      if (seasonRows.length > 0) {
        const seasonIds = seasonRows.map((s) => s.id);
        const [episodeRows] = await pool.query<RowDataPacket[]>(
          `SELECT e.id, e.anime_season_id, e.episode_number, e.name, e.overview, e.still_path, e.still_path_tv, e.vote_average,
                  (SELECT COUNT(*) FROM anime_videos av WHERE av.anime_episode_id = e.id AND av.link IS NOT NULL AND av.link != '') as video_count
           FROM anime_episodes e
           WHERE e.anime_season_id IN (?)
           ORDER BY e.episode_number ASC, e.id ASC`,
          [seasonIds]
        );

        seasons = seasonRows.map((s) => ({
          id: s.id,
          season_number: Number(s.season_number || 1),
          name: s.name || `Temporada ${s.season_number || 1}`,
          overview: s.overview || '',
          poster_path: normalizeImageUrl(s.poster_path, 'w500'),
          episodes: episodeRows
            .filter((e) => e.anime_season_id === s.id)
            .map((e) => ({
              id: e.id,
              episode_number: Number(e.episode_number || 1),
              name: e.name || `Episodio ${e.episode_number || 1}`,
              overview: e.overview || '',
              still_path: normalizeImageUrl(e.still_path_tv || e.still_path, 'w500'),
              vote_average: Number(e.vote_average || 0),
              video_count: Number(e.video_count || 0),
            })),
        }));
      }
    }

    // Fetch related content
    const [relatedRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, tmdb_id, ${cfg.titleCol} as title, poster_path, backdrop_path, vote_average, ${cfg.dateCol} as release_date
       FROM ${cfg.table}
       WHERE active = 1 AND id != ?
       ORDER BY popularity DESC, id DESC
       LIMIT 8`,
      [itemId]
    );

    const related = relatedRows.map((r) => ({
      id: r.id,
      tmdb_id: r.tmdb_id,
      title: r.title || 'Sin título',
      poster_path: normalizeImageUrl(r.poster_path, 'w500'),
      backdrop_path: normalizeImageUrl(r.backdrop_path, 'original'),
      vote_average: Number(r.vote_average || 0),
      release_date: r.release_date || null,
      mediaType: type,
    }));

    return NextResponse.json({
      success: true,
      data: {
        id: itemId,
        tmdb_id: rawItem.tmdb_id,
        title,
        original_name: rawItem.original_name || '',
        overview,
        poster_path,
        backdrop_path,
        vote_average,
        release_date,
        runtime,
        views: Number(rawItem.views || 0) + 1,
        trailer_url: rawItem.trailer_url || null,
        genres: genreRows,
        mediaType: type,
        videos,
        seasons,
        related,
      },
    });
  } catch (error: unknown) {
    console.error('Error in /api/media/[type]/[id]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al cargar detalles del contenido',
      },
      { status: 500 }
    );
  }
}

