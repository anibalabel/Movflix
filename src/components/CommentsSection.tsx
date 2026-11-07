'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Send,
  Trash2,
  AlertCircle,
} from 'lucide-react';

export interface CommentItem {
  id: number;
  commentable_type: string;
  commentable_id: number;
  comment: string;
  is_approved: boolean;
  user_id: number;
  user_name: string;
  user_image: string;
  likes_count: number;
  dislikes_count: number;
  my_reaction: 'like' | 'dislike' | null;
  time: string;
  created_at?: string;
}

interface CommentsSectionProps {
  mediaId: number;
  mediaType: string; // 'movies' | 'series' | 'animes'
}

export default function CommentsSection({
  mediaId,
  mediaType,
}: CommentsSectionProps) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>('user');

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, commentsRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch(
          `/api/media/comments?media_id=${mediaId}&media_type=${encodeURIComponent(
            mediaType
          )}`
        ),
      ]);
      const meData = await meRes.json();
      if (meData?.authenticated && meData.user?.id) {
        setCurrentUserId(Number(meData.user.id));
        setCurrentUserRole(meData.user.role || 'user');
      } else {
        setCurrentUserId(null);
      }

      const data = await commentsRes.json();
      if (data?.success && Array.isArray(data.data)) {
        setComments(data.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [mediaId, mediaType]);

  useEffect(() => {
    if (mediaId) {
      fetchComments();
    }
  }, [mediaId, fetchComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmed = commentText.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/media/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comments_message: trimmed,
          media_id: mediaId,
          media_type: mediaType,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Inicia sesión para publicar un comentario.');
      } else {
        setComments((prev) => [data as CommentItem, ...prev]);
        setCommentText('');
      }
    } catch {
      setError('Error de conexión al publicar el comentario.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReaction = async (
    commentId: number,
    reaction: 'like' | 'dislike'
  ) => {
    setError('');
    try {
      const res = await fetch(`/api/media/comments/${commentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reaction }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Inicia sesión para dar Me gusta / No me gusta.');
        return;
      }
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? {
                ...c,
                likes_count: data.likes_count,
                dislikes_count: data.dislikes_count,
                my_reaction: data.my_reaction,
              }
            : c
        )
      );
    } catch {
      setError('No se pudo registrar tu reacción.');
    }
  };

  const handleDelete = async (commentId: number) => {
    try {
      const res = await fetch(`/api/media/comments/${commentId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      }
    } catch {
      // ignore
    }
  };

  return (
    <section className="rounded-3xl bg-zinc-900/60 border border-zinc-800/80 p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600/15 border border-red-500/30 flex items-center justify-center text-red-500">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white">
              Comentarios de la Comunidad ({comments.length})
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              Comparte tu opinión y reacciona a los comentarios de otros usuarios
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2.5 text-red-300 text-xs sm:text-sm">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* New Comment Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          rows={3}
          maxLength={1000}
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Escribe tu comentario sobre este título (máx. 1000 caracteres)..."
          className="w-full px-4 py-3 rounded-2xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-red-500 transition resize-none"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">
            {commentText.length} / 1000 caracteres
          </span>
          <button
            type="submit"
            disabled={submitting || !commentText.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-lg shadow-red-600/20 transition cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>{submitting ? 'Publicando...' : 'Publicar Comentario'}</span>
          </button>
        </div>
      </form>

      {/* Comments List */}
      {loading ? (
        <div className="space-y-3 pt-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-20 rounded-2xl bg-zinc-950/60 border border-zinc-800/60 animate-pulse"
            />
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="py-10 text-center text-zinc-500 text-sm">
          Aún no hay comentarios. ¡Sé el primero en comentar!
        </div>
      ) : (
        <div className="space-y-3.5 pt-2">
          {comments.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-zinc-950/75 border border-zinc-800/80 flex items-start gap-3.5"
            >
              <img
                src={item.user_image || '/api/avatars/image/avatar_default.png'}
                alt={item.user_name}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    '/api/avatars/image/avatar_default.png';
                }}
                className="w-10 h-10 rounded-full object-cover border border-zinc-700 shrink-0"
              />
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white truncate">
                      {item.user_name}
                    </span>
                    <span className="text-xs text-zinc-500">• {item.time}</span>
                  </div>

                  {(currentUserId === item.user_id ||
                    currentUserRole === 'admin') && (
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      title="Eliminar comentario"
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <p className="text-sm text-zinc-300 whitespace-pre-line break-words">
                  {item.comment}
                </p>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => handleReaction(item.id, 'like')}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                      item.my_reaction === 'like'
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>{item.likes_count}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReaction(item.id, 'dislike')}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                      item.my_reaction === 'dislike'
                        ? 'bg-red-500/15 border-red-500/40 text-red-400'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                    <span>{item.dislikes_count}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

