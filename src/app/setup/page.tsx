'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Database,
  Server,
  KeyRound,
  User,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Film,
  Tv,
  Sparkles,
  Users,
  Settings2,
} from 'lucide-react';

interface SetupStatusResponse {
  installed: boolean;
  connected: boolean;
  connectionError?: string | null;
  source: 'runtime' | 'file' | 'cookie' | 'edge-cache' | 'env' | 'none';
  isAdmin: boolean;
  requiresUnlock?: boolean;
  currentConfig: {
    host: string;
    port: number;
    database: string;
    user: string;
  } | null;
  stats: {
    movies: number;
    series: number;
    animes: number;
    users: number;
  } | null;
}

export default function SetupPage() {
  const router = useRouter();
  const [status, setStatus] = useState<SetupStatusResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [showReconfigureForm, setShowReconfigureForm] = useState(false);

  // Form fields
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState('3306');
  const [database, setDatabase] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Action states
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'warning';
    message: string;
    stats?: { movies: number; series: number; animes: number; users: number };
  } | null>(null);

  const fetchStatus = async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch('/api/setup', { cache: 'no-store' });
      const data: SetupStatusResponse = await res.json();
      setStatus(data);
      if (!data.installed || !data.connected) {
        setShowReconfigureForm(true);
      }
    } catch {
      setShowReconfigureForm(true);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleAction = async (action: 'test' | 'save', e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFeedback(null);

    if (!host.trim() || !database.trim() || !username.trim()) {
      setFeedback({
        type: 'error',
        message: 'Por favor completa el Host, Nombre de la Base de Datos y Usuario.',
      });
      return;
    }

    if (action === 'test') setTesting(true);
    else setSaving(true);

    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          host: host.trim(),
          port: Number(port) || 3306,
          database: database.trim(),
          username: username.trim(),
          password,
          currentPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setFeedback({
          type: 'error',
          message: data.error || 'No se pudo establecer la conexión con la base de datos.',
        });
        return;
      }

      if (action === 'test') {
        setFeedback({
          type: data.missingCoreTables?.length > 0 ? 'warning' : 'success',
          message: data.message,
          stats: data.stats,
        });
      } else {
        setFeedback({
          type: 'success',
          message: data.message,
          stats: data.stats,
        });
        await fetchStatus();
        setShowReconfigureForm(false);
        setTimeout(() => {
          window.location.href = '/';
        }, 1200);
      }
    } catch {
      setFeedback({
        type: 'error',
        message: 'Error de red al intentar verificar la configuración.',
      });
    } finally {
      setTesting(false);
      setSaving(false);
    }
  };

  if (loadingStatus) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4 px-4">
        <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
        <p className="text-zinc-400 text-sm">Verificando estado de instalación...</p>
      </div>
    );
  }

  const isAlreadyInstalledAndConnected = Boolean(status?.installed && status?.connected);

  return (
    <div className="min-h-[85vh] py-12 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-3 mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 shadow-xl shadow-red-600/25 mb-2">
          <Database className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {isAlreadyInstalledAndConnected
            ? 'Configuración de Base de Datos'
            : 'Instalador Inicial de Base de Datos'}
        </h1>
        <p className="text-sm text-zinc-400 max-w-xl mx-auto">
          {isAlreadyInstalledAndConnected
            ? 'Tu plataforma ya se encuentra instalada y conectada a tu base de datos MySQL. Desde aquí puedes verificar su estado o cambiar de servidor.'
            : 'Conecta tu base de datos MySQL existente para activar el catálogo de películas, series, animes y usuarios.'}
        </p>
      </div>

      {/* Estado actual cuando ya está instalado */}
      {status?.installed && (
        <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800 p-6 mb-6 space-y-5 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {status.connected ? (
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">
                    {status.connected
                      ? 'Sistema Instalado y Conectado'
                      : 'Configuración Detectada (Sin Conexión)'}
                  </h2>
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                      status.connected
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {status.connected ? 'Activo' : 'Revisar credenciales'}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                   credenciales protegidas localmente (ocultas de GitHub)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {status.connected && (
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition shadow-lg shadow-red-600/25"
                >
                  Ir al Catálogo
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
              <button
                type="button"
                onClick={() => {
                  setShowReconfigureForm((prev) => !prev);
                  setFeedback(null);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition"
              >
                <Settings2 className="w-4 h-4" />
                {showReconfigureForm ? 'Ocultar Formulario' : 'Cambiar Base de Datos'}
              </button>
            </div>
          </div>

          {status.connectionError && (
            <div className="rounded-xl bg-red-950/40 border border-red-500/30 p-3.5 text-xs text-red-300 font-mono break-all">
              Error de conexión actual: {status.connectionError}
            </div>
          )}

          {status.currentConfig && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="rounded-xl bg-zinc-950/70 border border-zinc-800/80 p-3">
                <span className="text-[11px] text-zinc-500 block">Servidor Host</span>
                <span className="text-xs font-mono font-semibold text-zinc-200 truncate block mt-0.5">
                  {status.currentConfig.host}:{status.currentConfig.port}
                </span>
              </div>
              <div className="rounded-xl bg-zinc-950/70 border border-zinc-800/80 p-3">
                <span className="text-[11px] text-zinc-500 block">Base de Datos</span>
                <span className="text-xs font-mono font-semibold text-zinc-200 truncate block mt-0.5">
                  {status.currentConfig.database}
                </span>
              </div>
              <div className="rounded-xl bg-zinc-950/70 border border-zinc-800/80 p-3">
                <span className="text-[11px] text-zinc-500 block">Usuario</span>
                <span className="text-xs font-mono font-semibold text-zinc-200 truncate block mt-0.5">
                  {status.currentConfig.user}
                </span>
              </div>
              <div className="rounded-xl bg-zinc-950/70 border border-zinc-800/80 p-3">
                <span className="text-[11px] text-zinc-500 block">Contraseña</span>
                <span className="text-xs font-mono font-semibold text-emerald-400 block mt-0.5">
                  •••••••• (Oculta)
                </span>
              </div>
            </div>
          )}

          {status.stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="flex items-center gap-2.5 rounded-xl bg-zinc-950/50 border border-zinc-800/60 px-3.5 py-2.5">
                <Film className="w-4 h-4 text-red-400 shrink-0" />
                <div>
                  <div className="text-sm font-bold text-white">{status.stats.movies}</div>
                  <div className="text-[11px] text-zinc-400">Películas</div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl bg-zinc-950/50 border border-zinc-800/60 px-3.5 py-2.5">
                <Tv className="w-4 h-4 text-blue-400 shrink-0" />
                <div>
                  <div className="text-sm font-bold text-white">{status.stats.series}</div>
                  <div className="text-[11px] text-zinc-400">Series</div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl bg-zinc-950/50 border border-zinc-800/60 px-3.5 py-2.5">
                <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                <div>
                  <div className="text-sm font-bold text-white">{status.stats.animes}</div>
                  <div className="text-[11px] text-zinc-400">Animes</div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl bg-zinc-950/50 border border-zinc-800/60 px-3.5 py-2.5">
                <Users className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-sm font-bold text-white">{status.stats.users}</div>
                  <div className="text-[11px] text-zinc-400">Usuarios</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Formulario de Instalación / Reconfiguración */}
      {showReconfigureForm && (
        <form
          onSubmit={(e) => handleAction('save', e)}
          className="rounded-2xl bg-zinc-900/90 border border-zinc-800 p-6 sm:p-8 space-y-6 shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white">
                {isAlreadyInstalledAndConnected
                  ? 'Reconfigurar Conexión MySQL'
                  : 'Datos de Conexión MySQL'}
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Introduce las credenciales de tu base de datos existente. Se guardarán localmente sin exponerse en Git.
              </p>
            </div>
            <ShieldCheck className="w-6 h-6 text-red-500 shrink-0" />
          </div>

          {/* Verificación de seguridad si ya está instalado */}
          {status?.requiresUnlock && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-200/90">
                  <strong>Protección de Instalación Activa:</strong> Como la base de datos ya está conectada, confirma la contraseña actual de la base de datos para poder sobrescribir la configuración.
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-amber-300 mb-1.5">
                  Contraseña Actual de la Base de Datos (Autorización)
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Ingresa la contraseña actual para autorizar el cambio"
                  className="w-full rounded-xl bg-zinc-950 border border-amber-500/40 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Host */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Host del Servidor MySQL *
              </label>
              <div className="relative">
                <Server className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="localhost o mysql.tudominio.com"
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition"
                />
              </div>
            </div>

            {/* Puerto */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Puerto *
              </label>
              <input
                type="number"
                required
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="3306"
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition"
              />
            </div>
          </div>

          {/* Nombre de la Base de Datos */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Nombre de la Base de Datos *
            </label>
            <div className="relative">
              <Database className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={database}
                onChange={(e) => setDatabase(e.target.value)}
                placeholder="Ej: dooplex_db"
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Usuario */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Usuario de la Base de Datos *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ej: root o usuario_mysql"
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition"
                />
              </div>
            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Contraseña de la Base de Datos
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contraseña MySQL"
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 pl-10 pr-10 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Mensaje de resultado de Prueba o Guardado */}
          {feedback && (
            <div
              className={`rounded-xl p-4 border text-xs space-y-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                  : feedback.type === 'warning'
                  ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                  : 'bg-red-950/40 border-red-500/40 text-red-200'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold text-sm">
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>

              {feedback.stats && (
                <div className="pt-1 flex flex-wrap gap-3 text-[11px] text-zinc-300">
                  <span>Películas: <strong>{feedback.stats.movies}</strong></span>
                  <span>Series: <strong>{feedback.stats.series}</strong></span>
                  <span>Animes: <strong>{feedback.stats.animes}</strong></span>
                  <span>Usuarios: <strong>{feedback.stats.users}</strong></span>
                </div>
              )}
            </div>
          )}

          {/* Botones de Acción */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={testing || saving}
              onClick={() => handleAction('test')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 text-sm font-semibold border border-zinc-700 transition"
            >
              {testing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Probando conexión...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Probar Conexión
                </>
              )}
            </button>

            <button
              type="submit"
              disabled={testing || saving}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-50 text-white text-sm font-bold shadow-lg shadow-red-600/25 transition"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Guardando e Instalando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Guardar e Instalar
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

