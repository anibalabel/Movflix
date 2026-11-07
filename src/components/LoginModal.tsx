'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  Mail,
  LogIn,
  UserPlus,
  User,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  ArrowLeft,
} from 'lucide-react';

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string }) => void;
          }) => { requestAccessToken: (overrideConfig?: { prompt?: string }) => void };
        };
      };
    };
  }
}

export interface AuthUser {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
  premium?: boolean;
  avatar?: string | null;
  provider_name?: string | null;
}

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: AuthUser) => void;
}

export default function LoginModal({
  isOpen,
  onClose,
  onSuccess,
}: LoginModalProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [forgotStep, setForgotStep] = useState<'verify' | 'reset'>('verify');
  const [resetToken, setResetToken] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleClientId, setGoogleClientId] = useState(
    '946966649680-sobqbid2jil433jlilgiknb2kjulu00d.apps.googleusercontent.com'
  );
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    // Obtener client_id de la configuración del servidor
    fetch('/api/auth/google')
      .then((res) => res.json())
      .then((data) => {
        if (data?.google_client_id) {
          setGoogleClientId(data.google_client_id);
        }
      })
      .catch(() => {});

    // Cargar Google Identity Services script si no existe
    if (!document.getElementById('google-gsi-script')) {
      const script = document.createElement('script');
      script.id = 'google-gsi-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGoogleLogin = () => {
    setError('');
    setSuccessMsg('');

    if (!window.google?.accounts?.oauth2) {
      setError('Cargando servicios de Google, intenta de nuevo en un segundo.');
      return;
    }

    setGoogleLoading(true);
    try {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: 'openid email profile',
        callback: async (tokenResponse) => {
          if (tokenResponse.error || !tokenResponse.access_token) {
            setGoogleLoading(false);
            if (tokenResponse.error !== 'popup_closed_by_user') {
              setError('No se pudo completar el inicio de sesión con Google.');
            }
            return;
          }

          try {
            const res = await fetch('/api/auth/google', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ access_token: tokenResponse.access_token }),
            });
            const data = await res.json();
            if (!res.ok || !data.data) {
              setError(
                data.message ||
                  (data.error === 'email_required'
                    ? 'El correo de Google es obligatorio (email_required)'
                    : 'Error al autenticar con Google')
              );
            } else {
              onSuccess(data.data);
              onClose();
            }
          } catch {
            setError('Error de conexión al validar tu cuenta de Google');
          } finally {
            setGoogleLoading(false);
          }
        },
      });

      tokenClient.requestAccessToken({ prompt: 'select_account' });
    } catch {
      setGoogleLoading(false);
      setError('No se pudo abrir la ventana de Google Sign-In.');
    }
  };

  const switchMode = (newMode: 'login' | 'register' | 'forgot') => {
    setMode(newMode);
    setForgotStep('verify');
    setResetToken('');
    setError('');
    setSuccessMsg('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (mode === 'register') {
      if (password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres');
        return;
      }
      if (password !== confirmPassword) {
        setError('Las contraseñas no coinciden');
        return;
      }
    }

    if (mode === 'forgot') {
      setLoading(true);
      try {
        if (forgotStep === 'verify') {
          const res = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ step: 'verify', email, name }),
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            setError(data.message || 'No se pudo verificar la cuenta');
          } else {
            setResetToken(data.resetToken);
            setForgotStep('reset');
            setSuccessMsg(data.message);
          }
        } else {
          if (password.length < 6) {
            setError('La nueva contraseña debe tener al menos 6 caracteres');
            setLoading(false);
            return;
          }
          if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            setLoading(false);
            return;
          }

          const res = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              step: 'reset',
              email,
              resetToken,
              newPassword: password,
            }),
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            setError(data.message || 'No se pudo restablecer la contraseña');
          } else {
            setMode('login');
            setForgotStep('verify');
            setPassword('');
            setConfirmPassword('');
            setSuccessMsg(data.message);
          }
        }
      } catch {
        setError('Error de conexión con el servidor');
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);

    try {
      const endpoint =
        mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload =
        mode === 'login'
          ? { email, password }
          : { name, email, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || 'Ocurrió un error al procesar la solicitud');
      } else {
        onSuccess(data.data);
        onClose();
      }
    } catch {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 p-6 sm:p-8 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Mode Switcher Tabs (only in login/register modes) */}
        {mode !== 'forgot' ? (
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-zinc-950 border border-zinc-800 mb-6 mt-2">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer ${
                mode === 'login'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/25'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Iniciar Sesión</span>
            </button>

            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer ${
                mode === 'register'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/25'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Registrarse</span>
            </button>
          </div>
        ) : (
          <div className="mb-4 mt-1">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a Iniciar Sesión</span>
            </button>
          </div>
        )}

        <div className="mb-6 text-center">
          {mode === 'forgot' && (
            <div className="w-12 h-12 rounded-2xl bg-red-600/15 border border-red-500/30 flex items-center justify-center mx-auto mb-3 text-red-500">
              <KeyRound className="w-6 h-6" />
            </div>
          )}
          <h2 className="text-2xl font-bold text-white">
            {mode === 'login'
              ? 'Bienvenido a Dooplex'
              : mode === 'register'
              ? 'Crear Cuenta en Dooplex'
              : 'Recuperar Contraseña'}
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            {mode === 'login'
              ? 'Accede con tu cuenta de usuario de Dooplex'
              : mode === 'register'
              ? 'Regístrate gratis en segundos para acceder a la plataforma'
              : forgotStep === 'verify'
              ? 'Ingresa tu correo y nombre de usuario registrado para verificar tu identidad'
              : 'Crea una nueva contraseña segura para tu cuenta'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2.5 text-red-300 text-xs sm:text-sm">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5 text-emerald-300 text-xs sm:text-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {mode !== 'forgot' && (
          <div className="mb-5">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading || loading}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-100 disabled:opacity-60 text-zinc-900 font-bold text-sm shadow-md transition flex items-center justify-center gap-3 cursor-pointer"
            >
              {googleLoading ? (
                <div className="w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              <span>Continuar con Google</span>
            </button>

            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-zinc-800 w-full" />
              <span className="bg-zinc-900 px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                o con tu correo
              </span>
              <div className="border-t border-zinc-800 w-full" />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {(mode === 'register' ||
            (mode === 'forgot' && forgotStep === 'verify')) && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Nombre de Usuario
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre o alias registrado"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-red-500 transition"
                />
              </div>
            </div>
          )}

          {(mode !== 'forgot' || forgotStep === 'verify') && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                {mode === 'login'
                  ? 'Correo Electrónico o Usuario'
                  : 'Correo Electrónico'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={mode === 'login' ? 'text' : 'email'}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@correo.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-red-500 transition"
                />
              </div>
            </div>
          )}

          {(mode !== 'forgot' || forgotStep === 'reset') && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  {mode === 'forgot' ? 'Nueva Contraseña' : 'Contraseña'}
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="text-xs font-semibold text-red-400 hover:text-red-300 hover:underline cursor-pointer"
                  >
                    ¿Has olvidado tu contraseña?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={mode !== 'login' ? 6 : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-red-500 transition"
                />
              </div>
            </div>
          )}

          {(mode === 'register' ||
            (mode === 'forgot' && forgotStep === 'reset')) && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Confirmar {mode === 'forgot' ? 'Nueva ' : ''}Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite tu contraseña"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-red-500 transition"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold text-sm shadow-lg shadow-red-600/25 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {mode === 'login'
                    ? 'Entrar a la Plataforma'
                    : mode === 'register'
                    ? 'Crear mi Cuenta'
                    : forgotStep === 'verify'
                    ? 'Verificar Cuenta'
                    : 'Guardar Nueva Contraseña'}
                </span>
              </>
            )}
          </button>
        </form>

        {/* Bottom Switch Link */}
        {mode !== 'forgot' && (
          <div className="mt-5 pt-4 border-t border-zinc-800/80 text-center text-xs text-zinc-400">
            {mode === 'login' ? (
              <>
                ¿Aún no tienes una cuenta?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="text-red-400 hover:text-red-300 font-bold hover:underline cursor-pointer"
                >
                  Regístrate gratis aquí
                </button>
              </>
            ) : (
              <>
                ¿Ya tienes una cuenta registrada?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-red-400 hover:text-red-300 font-bold hover:underline cursor-pointer"
                >
                  Inicia sesión aquí
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
