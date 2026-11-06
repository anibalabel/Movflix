'use client';

import React, { useState } from 'react';
import { Send, CheckCircle2, AlertCircle, Mail, MessageSquare } from 'lucide-react';

export default function FooterContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('Soporte Técnico');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setLoading(true);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus({ type: 'success', text: data.message });
        setName('');
        setEmail('');
        setMessage('');
      } else {
        setStatus({
          type: 'error',
          text: data.message || 'Ocurrió un error al enviar el mensaje.',
        });
      }
    } catch {
      setStatus({
        type: 'error',
        text: 'Error de conexión. Puedes escribirnos directamente a soporte@movflix.live',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800/90 p-5 sm:p-6 shadow-xl">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-red-600/15 border border-red-500/30 flex items-center justify-center text-red-500">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white leading-tight">
              Formulario de Contacto y Soporte
            </h3>
            <p className="text-xs text-zinc-400">
              ¿Enlace caído, sugerencia o consulta? Escríbenos directamente
            </p>
          </div>
        </div>

        <a
          href="mailto:soporte@movflix.live"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 transition"
        >
          <Mail className="w-3.5 h-3.5" />
          <span>soporte@movflix.live</span>
        </a>
      </div>

      {status && (
        <div
          className={`mb-4 p-3 rounded-xl border flex items-center gap-2 text-xs sm:text-sm ${
            status.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          {status.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{status.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre"
            className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition"
          />

          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition"
          />

          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs sm:text-sm text-zinc-200 focus:outline-none focus:border-red-500 transition"
          >
            <option value="Soporte Técnico">Soporte Técnico</option>
            <option value="Reportar Video Caído">Reportar Video Caído</option>
            <option value="Pedir Película / Serie">Pedir Película / Serie</option>
            <option value="DMCA / Legal">DMCA / Legal</option>
            <option value="Otro">Otro asunto</option>
          </select>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            required
            maxLength={190}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Escribe aquí tu mensaje o reporte (máx. 190 caracteres)..."
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition"
          />

          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-red-600/20 transition flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Enviar Mensaje</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

