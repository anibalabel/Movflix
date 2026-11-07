import { NextRequest, NextResponse } from 'next/server';
import {
  withDb,
  getSessionUserFromRequest,
  TMDB_API_KEY,
  normalizeImageUrl,
} from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

function normalizeRequestType(rawType: string): 'movie' | 'serie' | 'anime' {
  const t = String(rawType || 'movie').trim().toLowerCase();
  if (t === 'serie' || t === 'series' || t === 'tv') return 'serie';
  if (t === 'anime' || t === 'animes') return 'anime';
  return 'movie';
}

export async function POST(request: NextRequest) {
  const sessionUser = getSessionUserFromRequest(request);
  if (!sessionUser || !sessionUser.id) {
    return NextResponse.json(
      {
        success: false,
        message: 'Debes iniciar sesión para realizar un pedido de contenido.',
      },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    let tmdbId = body.tmdb_id ? Number(body.tmdb_id) : null;
    let movieImdbId = body.movie_imdb_id
      ? String(body.movie_imdb_id).trim()
      : null;
    const type = normalizeRequestType(body.type || 'movie');
    const userNotes = body.user_notes
      ? String(body.user_notes).trim().slice(0, 500)
      : null;

    if (!tmdbId && !movieImdbId) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Debes enviar tmdb_id o movie_imdb_id junto con el tipo de contenido.',
        },
        { status: 422 }
      );
    }

    // Obtener metadatos de TMDB (título, poster, backdrop, fecha, puntuación, payload)
    let requestTitle: string | null = body.request_title
      ? String(body.request_title).trim()
      : null;
    let posterPath: string | null = null;
    let backdropPath: string | null = null;
    let releaseDate: string | null = null;
    let voteAverage: number | null = null;
    let tmdbPayload: string | null = null;

    try {
      const tmdbEndpointType = type === 'movie' ? 'movie' : 'tv';

      if (!tmdbId && movieImdbId) {
        const findRes = await fetch(
          `https://api.themoviedb.org/3/find/${encodeURIComponent(
            movieImdbId
          )}?api_key=${TMDB_API_KEY}&external_source=imdb_id&language=es-MX`
        );
        if (findRes.ok) {
          const findData = await findRes.json();
          const match =
            type === 'movie'
              ? findData.movie_results?.[0]
              : findData.tv_results?.[0] || findData.movie_results?.[0];
          if (match?.id) {
            tmdbId = Number(match.id);
          }
        }
      }

      if (tmdbId) {
        const detailRes = await fetch(
          `https://api.themoviedb.org/3/${tmdbEndpointType}/${tmdbId}?api_key=${TMDB_API_KEY}&language=es-MX&append_to_response=external_ids`
        );
        if (detailRes.ok) {
          const detail = await detailRes.json();
          requestTitle =
            detail.title || detail.name || detail.original_title || requestTitle;
          posterPath = detail.poster_path
            ? `https://image.tmdb.org/t/p/w500${detail.poster_path}`
            : null;
          backdropPath = detail.backdrop_path
            ? `https://image.tmdb.org/t/p/w780${detail.backdrop_path}`
            : null;
          const rawDate = detail.release_date || detail.first_air_date || null;
          releaseDate =
            rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : null;
          voteAverage =
            typeof detail.vote_average === 'number'
              ? Number(detail.vote_average.toFixed(2))
              : null;
          if (!movieImdbId) {
            movieImdbId =
              detail.imdb_id || detail.external_ids?.imdb_id || null;
          }
          tmdbPayload = JSON.stringify(detail);
        }
      }
    } catch {
      // Si falla la consulta externa a TMDB, guardamos el pedido con los datos proporcionados
    }

    return await withDb(async (conn) => {
      // 1. Verificar si ya existe en movies, series o animes (checkContentExists)
      const targetTable =
        type === 'serie' ? 'series' : type === 'anime' ? 'animes' : 'movies';
      const titleCol = type === 'movie' ? 'title' : 'name';
      const watchType =
        type === 'serie' ? 'series' : type === 'anime' ? 'animes' : 'movies';

      if (tmdbId || movieImdbId) {
        const conditions: string[] = [];
        const params: (string | number)[] = [];
        if (tmdbId) {
          conditions.push('tmdb_id = ?');
          params.push(tmdbId);
        }
        if (movieImdbId) {
          conditions.push('imdb_external_id = ?');
          params.push(movieImdbId);
        }

        const [existingMedia] = await conn.query<RowDataPacket[]>(
          `SELECT id, ${titleCol} AS title FROM ${targetTable} WHERE ${conditions.join(
            ' OR '
          )} LIMIT 1`,
          params
        );

        if (existingMedia && existingMedia.length > 0) {
          return NextResponse.json(
            {
              success: false,
              already_exists: true,
              existing_media_id: Number(existingMedia[0].id),
              watch_url: `/watch/${watchType}/${existingMedia[0].id}`,
              message: `"${
                existingMedia[0].title || requestTitle || 'Este título'
              }" ya se encuentra disponible en nuestro catálogo.`,
            },
            { status: 409 }
          );
        }
      }

      // 2. Verificar si ya hay un pedido pendiente para el mismo tmdb_id y type de este usuario
      if (tmdbId) {
        const [existingReq] = await conn.query<RowDataPacket[]>(
          `SELECT id, status FROM movie_requests
           WHERE user_id = ? AND tmdb_id = ? AND type = ?
           LIMIT 1`,
          [sessionUser.id, tmdbId, type]
        );
        if (existingReq && existingReq.length > 0) {
          return NextResponse.json(
            {
              success: false,
              message: `Ya enviaste un pedido para este título (Estado actual: ${existingReq[0].status}).`,
            },
            { status: 409 }
          );
        }
      }

      // 3. Insertar en movie_requests
      const [insertRes] = await conn.query<ResultSetHeader>(
        `INSERT INTO movie_requests (
          user_id,
          movie_imdb_id,
          tmdb_id,
          type,
          status,
          request_title,
          poster_path,
          backdrop_path,
          release_date,
          vote_average,
          tmdb_payload,
          user_notes,
          requested_at,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())`,
        [
          sessionUser.id,
          movieImdbId || null,
          tmdbId || null,
          type,
          requestTitle ? requestTitle.slice(0, 190) : null,
          posterPath ? posterPath.slice(0, 190) : null,
          backdropPath ? backdropPath.slice(0, 190) : null,
          releaseDate,
          voteAverage,
          tmdbPayload,
          userNotes,
        ]
      );

      return NextResponse.json(
        {
          success: true,
          message: '¡Tu pedido ha sido registrado y está pendiente de revisión!',
          data: {
            id: insertRes.insertId,
            user_id: sessionUser.id,
            movie_imdb_id: movieImdbId,
            tmdb_id: tmdbId,
            type,
            status: 'pending',
            request_title: requestTitle,
            poster_path: normalizeImageUrl(posterPath, 'w500'),
            backdrop_path: normalizeImageUrl(backdropPath, 'original'),
            release_date: releaseDate,
            vote_average: voteAverage,
            user_notes: userNotes,
          },
        },
        { status: 201 }
      );
    });
  } catch (error: unknown) {
    console.error('Error in POST /api/movie-requests/submit:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : 'Error al registrar el pedido',
      },
      { status: 500 }
    );
  }
}

