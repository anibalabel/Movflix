import { NextRequest, NextResponse } from 'next/server';
import { withDb, getSessionUserFromRequest } from '@/lib/db';
import { RowDataPacket } from 'mysql2/promise';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ commentId: string }> }
) {
  const sessionUser = getSessionUserFromRequest(request);
  if (!sessionUser || !sessionUser.id) {
    return NextResponse.json(
      { success: false, message: 'Inicia sesión para reaccionar a comentarios.' },
      { status: 401 }
    );
  }

  const { commentId: rawId } = await context.params;
  const commentId = Number(rawId);
  if (!commentId) {
    return NextResponse.json(
      { success: false, message: 'ID de comentario inválido.' },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const reaction = String(body.reaction || '').trim().toLowerCase();
    if (reaction !== 'like' && reaction !== 'dislike') {
      return NextResponse.json(
        { success: false, message: "La reacción debe ser 'like' o 'dislike'." },
        { status: 400 }
      );
    }

    return await withDb(async (conn) => {
      const [existing] = await conn.query<RowDataPacket[]>(
        `SELECT id, reaction FROM comment_reactions
         WHERE comment_id = ? AND user_id = ?
         LIMIT 1`,
        [commentId, sessionUser.id]
      );

      let myReaction: 'like' | 'dislike' | null = reaction;

      if (existing && existing.length > 0) {
        const currentReaction = String(existing[0].reaction);
        if (currentReaction === reaction) {
          // Si ya tenía la misma reacción, la quita
          await conn.query('DELETE FROM comment_reactions WHERE id = ?', [
            existing[0].id,
          ]);
          myReaction = null;
        } else {
          // Cambia de like a dislike o viceversa
          await conn.query(
            'UPDATE comment_reactions SET reaction = ?, updated_at = NOW() WHERE id = ?',
            [reaction, existing[0].id]
          );
          myReaction = reaction;
        }
      } else {
        await conn.query(
          `INSERT INTO comment_reactions (comment_id, user_id, reaction, created_at, updated_at)
           VALUES (?, ?, ?, NOW(), NOW())`,
          [commentId, sessionUser.id, reaction]
        );
        myReaction = reaction;
      }

      // Recalcular contadores en `comments`
      const [counts] = await conn.query<RowDataPacket[]>(
        `SELECT
           SUM(CASE WHEN reaction = 'like' THEN 1 ELSE 0 END) AS likes_count,
           SUM(CASE WHEN reaction = 'dislike' THEN 1 ELSE 0 END) AS dislikes_count
         FROM comment_reactions
         WHERE comment_id = ?`,
        [commentId]
      );

      const likesCount = Number(counts?.[0]?.likes_count || 0);
      const dislikesCount = Number(counts?.[0]?.dislikes_count || 0);

      await conn.query(
        `UPDATE comments
         SET likes_count = ?, dislikes_count = ?, updated_at = NOW()
         WHERE id = ?`,
        [likesCount, dislikesCount, commentId]
      );

      return NextResponse.json({
        success: true,
        comment_id: commentId,
        likes_count: likesCount,
        dislikes_count: dislikesCount,
        my_reaction: myReaction,
      });
    });
  } catch (error: unknown) {
    console.error('Error in POST /api/media/comments/[commentId]:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : 'Error al procesar reacción',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ commentId: string }> }
) {
  const sessionUser = getSessionUserFromRequest(request);
  if (!sessionUser || !sessionUser.id) {
    return NextResponse.json(
      { success: false, message: 'No autorizado' },
      { status: 401 }
    );
  }

  const { commentId: rawId } = await context.params;
  const commentId = Number(rawId);
  if (!commentId) {
    return NextResponse.json(
      { success: false, message: 'ID de comentario inválido' },
      { status: 400 }
    );
  }

  try {
    return await withDb(async (conn) => {
      const [rows] = await conn.query<RowDataPacket[]>(
        'SELECT id, user_id FROM comments WHERE id = ? LIMIT 1',
        [commentId]
      );

      if (!rows || rows.length === 0) {
        return NextResponse.json(
          { success: false, message: 'Comentario no encontrado' },
          { status: 404 }
        );
      }

      const isOwner = Number(rows[0].user_id) === Number(sessionUser.id);
      const isAdmin = sessionUser.role === 'admin';

      if (!isOwner && !isAdmin) {
        return NextResponse.json(
          { success: false, message: 'No tienes permiso para eliminar este comentario' },
          { status: 403 }
        );
      }

      await conn.query('DELETE FROM comment_reactions WHERE comment_id = ?', [
        commentId,
      ]);
      await conn.query('DELETE FROM comments WHERE id = ?', [commentId]);

      return NextResponse.json({
        success: true,
        message: 'Comentario eliminado correctamente',
      });
    });
  } catch (error: unknown) {
    console.error('Error in DELETE /api/media/comments/[commentId]:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : 'Error al eliminar comentario',
      },
      { status: 500 }
    );
  }
}

