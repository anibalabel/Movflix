import { NextRequest, NextResponse } from 'next/server';
import { pool, normalizeImageUrl } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = (searchParams.get('type') || 'movies') as 'movies' | 'series' | 'animes';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(60, Math.max(1, parseInt(searchParams.get('limit') || '24', 10)));
    const offset = (page - 1) * limit;
    const search = (searchParams.get('q') || '').trim();
    const genreId = searchParams.get('genre') ? parseInt(searchParams.get('genre')!, 10) : null;
    const sort = searchParams.get('sort') || 'latest';

    const configMap = {
      movies: {
        table: 'movies',
        alias: 'm',
        titleCol: 'title',
        dateCol: 'release_date',
        genreTable: 'movie_genres',
        genreFk: 'movie_id',
        subCountSql: '(SELECT COUNT(*) FROM movie_videos mv WHERE mv.movie_id = m.id) as video_count, 0 as season_count',
      },
      series: {
        table: 'series',
        alias: 'm',
        titleCol: 'name',
        dateCol: 'first_air_date',
        genreTable: 'serie_genres',
        genreFk: 'serie_id',
        subCountSql: '0 as video_count, (SELECT COUNT(*) FROM seasons s WHERE s.serie_id = m.id) as season_count',
      },
      animes: {
        table: 'animes',
        alias: 'm',
        titleCol: 'name',
        dateCol: 'first_air_date',
        genreTable: 'anime_genres',
        genreFk: 'anime_id',
        subCountSql: '0 as video_count, (SELECT COUNT(*) FROM anime_seasons s WHERE s.anime_id = m.id) as season_count',
      },
    };

    if (!configMap[type]) {
      return NextResponse.json({ error: 'Tipo de catálogo inválido' }, { status: 400 });
    }

    const cfg = configMap[type];
    const whereClauses: string[] = ['m.active = 1'];
    const params: (string | number)[] = [];

    let joinClause = '';
    if (genreId && !isNaN(genreId)) {
      joinClause = `INNER JOIN ${cfg.genreTable} gt ON gt.${cfg.genreFk} = m.id`;
      whereClauses.push('gt.genre_id = ?');
      params.push(genreId);
    }

    if (search !== '') {
      whereClauses.push(
        `(m.${cfg.titleCol} LIKE ? OR m.original_name LIKE ? OR CAST(m.tmdb_id AS CHAR) = ?)`
      );
      params.push(`%${search}%`, `%${search}%`, search);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    let orderBySql = 'ORDER BY m.id DESC';
    if (sort === 'rating') {
      orderBySql = 'ORDER BY m.vote_average DESC, m.id DESC';
    } else if (sort === 'popular') {
      orderBySql = 'ORDER BY m.popularity DESC, m.id DESC';
    } else if (sort === 'views') {
      orderBySql = 'ORDER BY m.views DESC, m.id DESC';
    }

    const countQuery = `SELECT COUNT(DISTINCT m.id) as total FROM ${cfg.table} m ${joinClause} ${whereSql}`;
    const [[countRow]] = await pool.query<RowDataPacket[]>(countQuery, params);
    const total = Number(countRow?.total || 0);

    const dataQuery = `
      SELECT DISTINCT
        m.id,
        m.tmdb_id,
        m.${cfg.titleCol} as title,
        m.original_name,
        m.overview,
        m.poster_path,
        m.backdrop_path,
        m.backdrop_path_tv,
        m.vote_average,
        m.${cfg.dateCol} as release_date,
        m.views,
        m.premuim,
        ${cfg.subCountSql}
      FROM ${cfg.table} m
      ${joinClause}
      ${whereSql}
      ${orderBySql}
      LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.query<RowDataPacket[]>(dataQuery, [...params, limit, offset]);

    const data = rows.map((item) => ({
      id: item.id,
      tmdb_id: item.tmdb_id,
      title: item.title || item.original_name || 'Sin título',
      original_name: item.original_name || '',
      overview: item.overview || '',
      poster_path: normalizeImageUrl(item.poster_path, 'w500'),
      backdrop_path: normalizeImageUrl(item.backdrop_path_tv || item.backdrop_path, 'original'),
      vote_average: Number(item.vote_average || 0),
      release_date: item.release_date || null,
      views: Number(item.views || 0),
      video_count: Number(item.video_count || 0),
      season_count: Number(item.season_count || 0),
      mediaType: type,
    }));

    return NextResponse.json({
      success: true,
      type,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data,
    });
  } catch (error: unknown) {
    console.error('Error in /api/catalog:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error consultando el catálogo',
      },
      { status: 500 }
    );
  }
}

