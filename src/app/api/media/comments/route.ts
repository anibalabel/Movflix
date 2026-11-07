import { NextRequest, NextResponse } from 'next/server';
import {
  withDb,
  getSessionUserFromRequest,
  normalizeAvatarUrl,
  DEFAULT_AVATAR_PATH,
} from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

export function toCommentableType(rawType: string): string {
  const t = String(rawType || 'movie').trim().toLowerCase();
  if (t === 'serie' || t === 'series' || t === 'app\\serie') return 'App\\Serie';
  if (t === 'anime' || t === 'animes' || t === 'app\\anime') return 'App\\Anime';
  if (t === 'episode' || t === 'episodes' || t === 'app\\episode') return 'App\\Episode';
  if (
    t === 'anime_episode' ||
    t === 'episode_anime' ||
    t === 'app\\animeepisode'
  ) {
    return 'App\\AnimeEpisode';
  }
  if (t === 'reel' || t === 'reels' || t === 'app\\reel') return 'App\\Reel';
  return 'App\\Movie';
}

export function formatRelativeTime(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return 'hace un momento';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'hace un momento';
  const diffSec = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diffSec < 60) return `hace ${diffSec} seg`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `hace ${diffHr} h`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 30) return `hace ${diffDays} d`;
  return date.toLocaleDateString('es-ES');
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mediaId = Number(
    searchParams.get('media_id') || searchParams.get('movie_id') || 0
  );
  const rawType =
    searchParams.get('media_type') || searchParams.get('type') || 'movie';
  const commentableType = toCommentableType(rawType);
  const sessionUser = getSessionUserFromRequest(request);

  if (!mediaId) {
    return NextResponse.json(
      { success: false, message: 'Se requiere media_id' },
      { status: 400 }
    );
  }

  try {
    return await withDb(async (conn) => {
      const [rows] = await conn.query<RowDataPacket[]>(
        `SELECT c.id, c.commentable_type, c.commentable_id, c.comment, c.is_approved,
                c.user_id, c.user_name, c.user_image,
                c.likes_count, c.dislikes_count, c.created_at, c.updated_at,
                u.name AS fallback_user_name, u.avatar AS fallback_user_avatar
         FROM comments c
         LEFT JOIN users u ON u.id = c.user_id
         WHERE c.commentable_type = ? AND c.commentable_id = ? AND c.is_approved = 1
         ORDER BY c.id DESC
         LIMIT 100`,
        [commentableType, mediaId]
      );

      const commentIds = rows.map((r) => Number(r.id));
      const reactionMap = new Map<number, string>();

      if (sessionUser?.id && commentIds.length > 0) {
        const [reRows] = await conn.query<RowDataPacket[]>(
          `SELECT comment_id, reaction
           FROM comment_reactions
           WHERE user_id = ? AND comment_id IN (?)`,
          [sessionUser.id, commentIds]
        );
        for (const r of reRows) {
          reactionMap.set(Number(r.comment_id), String(r.reaction));
        }
      }

      const data = rows.map((r) => {
        const cid = Number(r.id);
        const rawName = String(r.user_name || r.fallback_user_name || 'Usuario').trim();
        const rawImage = String(r.user_image || r.fallback_user_avatar || '').trim();
        return {
          id: cid,
          commentable_type: r.commentable_type,
          commentable_id: Number(r.commentable_id),
          comment: r.comment || '',
          is_approved: Boolean(r.is_approved),
          user_id: Number(r.user_id),
          user_name: rawName || 'Usuario',
          user_image: rawImage ? normalizeAvatarUrl(rawImage) : DEFAULT_AVATAR_PATH,
          likes_count: Number(r.likes_count || 0),
          dislikes_count: Number(r.dislikes_count || 0),
          my_reaction: reactionMap.get(cid) || null,
          time: formatRelativeTime(r.created_at),
          created_at: r.created_at,
          updated_at: r.updated_at,
        };
      });

      return NextResponse.json({
        success: true,
        total: data.length,
        data,
      });
    });
  } catch (error: unknown) {
    console.error('Error in GET /api/media/comments:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : 'Error al obtener comentarios',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const sessionUser = getSessionUserFromRequest(request);
  if (!sessionUser || !sessionUser.id) {
    return NextResponse.json(
      { success: false, message: 'Inicia sesión para publicar un comentario.' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const commentText = String(
      body.comments_message ?? body.comment ?? ''
    ).trim();
    const mediaId = Number(body.media_id ?? body.movie_id ?? 0);
    const rawType = String(body.media_type ?? body.type ?? 'movie');
    const commentableType = toCommentableType(rawType);

    if (!mediaId) {
      return NextResponse.json(
        { success: false, message: 'ID de contenido inválido (media_id).' },
        { status: 400 }
      );
    }

    if (!commentText) {
      return NextResponse.json(
        { success: false, message: 'Escribe un comentario antes de enviar.' },
        { status: 400 }
      );
    }

    if (commentText.length > 1000) {
      return NextResponse.json(
        {
          success: false,
          message: 'El comentario no puede superar los 1000 caracteres.',
        },
        { status: 422 }
      );
    }

    return await withDb(async (conn) => {
      const [userRows] = await conn.query<RowDataPacket[]>(
        'SELECT id, name, email, avatar FROM users WHERE id = ? LIMIT 1',
        [sessionUser.id]
      );
      const dbUser = userRows?.[0];
      const userName = String(
        dbUser?.name ||
          sessionUser.name ||
          sessionUser.username ||
          (dbUser?.email ? String(dbUser.email).split('@')[0] : 'Usuario')
      ).slice(0, 190);
      const userImage = normalizeAvatarUrl(
        dbUser?.avatar || sessionUser.avatar || DEFAULT_AVATAR_PATH
      ).slice(0, 190);

      const [insertRes] = await conn.query<ResultSetHeader>(
        `INSERT INTO comments (
          commentable_type,
          commentable_id,
          user_image,
          user_name,
          comment,
          is_approved,
          user_id,
          likes_count,
          dislikes_count,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, 1, ?, 0, 0, NOW(), NOW())`,
        [
          commentableType,
          mediaId,
          userImage,
          userName,
          commentText,
          sessionUser.id,
        ]
      );

      const nowIso = new Date().toISOString();
      const createdComment = {
        id: insertRes.insertId,
        commentable_type: commentableType,
        commentable_id: mediaId,
        comment: commentText,
        is_approved: true,
        user_id: Number(sessionUser.id),
        user_name: userName,
        user_image: userImage,
        likes_count: 0,
        dislikes_count: 0,
        my_reaction: null,
        time: '1 second ago',
        created_at: nowIso,
        updated_at: nowIso,
      };

      return NextResponse.json(createdComment, { status: 201 });
    });
  } catch (error: unknown) {
    console.error('Error in POST /api/media/comments:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : 'Error al guardar comentario',
      },
      { status: 500 }
    );
  }
}

