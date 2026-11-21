'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { APP_DOWNLOAD_CONFIG } from '@/lib/app-downloads';
import {
  Smartphone,
  Tv,
  Download,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Zap,
  Heart,
  Cast,
  QrCode,
  ArrowRight,
  Play,
  Star,
  Globe,
  Layers,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';

export default function AppsDownloadPage() {
  const [showQrModal, setShowQrModal] = useState(false);
  const [showTvQrModal, setShowTvQrModal] = useState(false);
  const [copiedTvLink, setCopiedTvLink] = useState(false);
  const [copiedTvCode, setCopiedTvCode] = useState(false);

  const playStoreUrl = APP_DOWNLOAD_CONFIG.googlePlayUrl;
  const androidTvUrl = APP_DOWNLOAD_CONFIG.androidTvUrl;
  const downloaderCode = APP_DOWNLOAD_CONFIG.androidTvDownloaderCode;
  const hasTvDirectLink =
    Boolean(androidTvUrl) && androidTvUrl !== '#android-tv-link' && androidTvUrl.startsWith('http');

  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=12&data=${encodeURIComponent(
    playStoreUrl
  )}`;

  const tvQrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=12&data=${encodeURIComponent(
    androidTvUrl
  )}`;

  const handleCopyTvLink = async () => {
    try {
      await navigator.clipboard.writeText(androidTvUrl);
      setCopiedTvLink(true);
      setTimeout(() => setCopiedTvLink(false), 2500);
    } catch {
      // ignore
    }
  };

  const handleCopyTvCode = async () => {
    if (!downloaderCode) return;
    try {
      await navigator.clipboard.writeText(downloaderCode);
      setCopiedTvCode(true);
      setTimeout(() => setCopiedTvCode(false), 2500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden pb-20">
      {/* Ambient Background Glows */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[480px] bg-gradient-to-tr from-red-600/20 via-rose-600/15 to-blue-600/15 blur-[130px] rounded-full" />
      <div className="pointer-events-none absolute top-[45%] -right-40 w-[500px] h-[500px] bg-blue-600/10 blur-[140px] rounded-full" />
      <div className="pointer-events-none absolute top-[55%] -left-40 w-[500px] h-[500px] bg-red-600/10 blur-[140px] rounded-full" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-16 space-y-16">
        {/* Hero Header + Device Showcase */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          {/* Left Column: Copy & Primary CTAs */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold tracking-wider uppercase shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Aplicaciones Oficiales MovFlix</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.08]">
              Todo tu entretenimiento en{' '}
              <span className="bg-gradient-to-r from-red-500 via-rose-400 to-amber-400 bg-clip-text text-transparent">
                Android y Smart TV
              </span>
            </h1>

            <p className="text-zinc-300 text-sm sm:text-base lg:text-lg max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Disfruta de películas, series y animes en máxima calidad con nuestras aplicaciones nativas. Sincroniza tus favoritos, comentarios y perfil automáticamente entre la web, tu teléfono y tu televisor.
            </p>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
              {/* Official Google Play Button */}
              <a
                href={playStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative inline-flex items-center gap-3.5 px-6 py-3.5 rounded-2xl bg-white text-zinc-950 hover:bg-zinc-100 transition-all duration-200 shadow-xl shadow-white/10 hover:scale-[1.02]"
              >
                {/* Google Play Colored SVG */}
                <svg className="w-7 h-7 shrink-0" viewBox="0 0 512 512" fill="none">
                  <path
                    d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8zM104.6 499l280.8-161.2-60.1-60.1L104.6 499z"
                    fill="url(#paint0_linear_play)"
                  />
                  <defs>
                    <linearGradient
                      id="paint0_linear_play"
                      x1="25.3"
                      y1="0"
                      x2="485"
                      y2="512"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="#00C6FF" />
                      <stop offset="0.35" stopColor="#00E676" />
                      <stop offset="0.7" stopColor="#FFEA00" />
                      <stop offset="1" stopColor="#FF1744" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="text-left">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 leading-none">
                    Disponible en
                  </span>
                  <span className="block text-base font-black tracking-tight text-zinc-900 mt-0.5">
                    Google Play
                  </span>
                </div>
                <ExternalLink className="w-4 h-4 text-zinc-400 group-hover:text-zinc-700 transition ml-1" />
              </a>

              {/* Android TV Anchor / Download Button */}
              <a
                href={hasTvDirectLink ? androidTvUrl : '#plataformas'}
                target={hasTvDirectLink ? '_blank' : undefined}
                rel={hasTvDirectLink ? 'noopener noreferrer' : undefined}
                className="inline-flex items-center gap-3.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition-all duration-200 shadow-xl shadow-blue-600/25 hover:scale-[1.02]"
              >
                <Tv className="w-7 h-7 shrink-0 text-blue-100" />
                <div className="text-left">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-blue-200 leading-none">
                    Edición Smart TV
                  </span>
                  <span className="block text-base font-black tracking-tight text-white mt-0.5">
                    Android TV &amp; Fire TV
                  </span>
                </div>
              </a>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 pt-3 text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Verificada por Google Play Protect</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Reproductor HLS de Alta Velocidad</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span>100% Gratuita</span>
              </div>
            </div>
          </div>

          {/* Right Column: Visual TV + Phone Mockup */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            <div className="relative w-full max-w-lg">
              {/* Smart TV Mockup Frame */}
              <div className="relative rounded-2xl bg-zinc-900 border-4 border-zinc-800 shadow-2xl shadow-black/80 overflow-hidden aspect-video p-4 flex flex-col justify-between bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(220,38,38,0.22),transparent_60%)]" />
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-red-600 flex items-center justify-center text-white font-black text-xs">
                      M
                    </div>
                    <span className="text-xs font-extrabold tracking-wider text-white">
                      MOV<span className="text-red-500">FLIX</span>{' '}
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 ml-1">
                        ANDROID TV
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-medium">
                    <span className="text-white font-bold">Inicio</span>
                    <span>Películas</span>
                    <span>Series</span>
                    <span>Animes</span>
                  </div>
                </div>

                {/* Fake Featured Content on TV */}
                <div className="relative z-10 my-auto space-y-2 max-w-[75%]">
                  <span className="inline-block text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-red-600 text-white">
                    Estreno 4K HDR
                  </span>
                  <div className="text-base sm:text-lg font-black text-white leading-tight">
                    Experiencia de Cine en tu Televisor
                  </div>
                  <p className="text-[11px] text-zinc-400 line-clamp-2">
                    Navegación optimizada para control remoto, cambio de audio instantáneo y reproducción continua.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white text-zinc-950 text-[10px] font-bold">
                      <Play className="w-3 h-3 fill-zinc-950" /> Reproducir
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800/90 text-zinc-200 text-[10px] font-semibold border border-zinc-700">
                      + Mi Lista
                    </span>
                  </div>
                </div>

                {/* Mini Poster Row on TV */}
                <div className="relative z-10 grid grid-cols-5 gap-2 pt-2">
                  {[
                    'from-red-600/40 to-rose-900/40 border-red-500/50',
                    'from-blue-600/30 to-indigo-900/40 border-zinc-800',
                    'from-purple-600/30 to-fuchsia-900/40 border-zinc-800',
                    'from-amber-600/30 to-orange-900/40 border-zinc-800',
                    'from-emerald-600/30 to-teal-900/40 border-zinc-800',
                  ].map((cls, i) => (
                    <div
                      key={i}
                      className={`h-10 rounded-lg bg-gradient-to-br ${cls} border flex items-end p-1.5`}
                    >
                      <div className="w-full h-1.5 rounded-full bg-white/30" />
                    </div>
                  ))}
                </div>
              </div>
              {/* TV Stand */}
              <div className="mx-auto w-24 h-2 bg-zinc-800 rounded-b-lg" />
              <div className="mx-auto w-40 h-1.5 bg-zinc-700 rounded-full" />

              {/* Floating Smartphone Mockup */}
              <div className="absolute -bottom-6 -right-2 sm:-right-6 w-36 sm:w-44 rounded-3xl bg-zinc-950 border-4 border-zinc-800 shadow-2xl shadow-black p-3 space-y-2.5">
                <div className="w-12 h-1 bg-zinc-800 rounded-full mx-auto" />
                <div className="rounded-xl bg-gradient-to-br from-red-600/30 via-rose-900/30 to-zinc-900 border border-red-500/30 p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-red-400 uppercase">Móvil</span>
                    <Smartphone className="w-3 h-3 text-zinc-400" />
                  </div>
                  <div className="text-xs font-extrabold text-white leading-tight">
                    MovFlix App
                  </div>
                  <div className="text-[9px] text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Play Store Oficial
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <div className="h-11 rounded-lg bg-zinc-900 border border-zinc-800" />
                  <div className="h-11 rounded-lg bg-zinc-900 border border-zinc-800" />
                  <div className="h-11 rounded-lg bg-zinc-900 border border-zinc-800" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main Download Cards Section */}
        <section id="plataformas" className="space-y-6 pt-4">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Elige tu Dispositivo
            </h2>
            <p className="text-sm text-zinc-400">
              Selecciona la versión ideal para tu teléfono Android, tablet o televisor inteligente.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-2">
            {/* CARD 1: ANDROID MÓVIL & TABLET (GOOGLE PLAY) */}
            <div className="relative rounded-3xl bg-gradient-to-b from-zinc-900/95 to-zinc-950 border border-zinc-800/90 hover:border-red-500/40 transition-all duration-300 p-6 sm:p-8 flex flex-col justify-between shadow-2xl overflow-hidden group">
              <div className="pointer-events-none absolute -top-24 -right-24 w-56 h-56 bg-red-600/15 blur-3xl rounded-full group-hover:bg-red-600/25 transition" />

              <div className="space-y-6 relative z-10">
                {/* Top Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center shadow-lg shadow-red-600/30 shrink-0">
                      <Smartphone className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" /> Disponible en Play Store
                      </span>
                      <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
                        Android Móvil y Tablet
                      </h3>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowQrModal((prev) => !prev)}
                    title="Mostrar código QR"
                    className="p-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 transition cursor-pointer"
                  >
                    <QrCode className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-sm text-zinc-300 leading-relaxed">
                  Descarga la aplicación oficial directamente desde <strong>Google Play Store</strong>. Instalación segura con actualizaciones automáticas, notificaciones de estrenos y soporte completo para Chromecast.
                </p>

                {/* Optional inline QR drawer */}
                {showQrModal && (
                  <div className="rounded-2xl bg-zinc-950/90 border border-zinc-800 p-4 flex flex-col sm:flex-row items-center gap-4 animate-in fade-in duration-200">
                    <img
                      src={qrCodeImageUrl}
                      alt="Código QR Google Play"
                      className="w-28 h-28 rounded-xl bg-white p-1.5 shrink-0"
                    />
                    <div className="space-y-1 text-center sm:text-left">
                      <div className="text-sm font-bold text-white">
                        Escanea con la cámara de tu móvil
                      </div>
                      <p className="text-xs text-zinc-400">
                        Te llevará directamente a la ficha oficial de <strong>MovFlix</strong> en la tienda Google Play Store.
                      </p>
                    </div>
                  </div>
                )}

                {/* Feature Checklist */}
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm text-zinc-300">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-red-500 shrink-0" />
                    <span>Descarga oficial en Google Play</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-red-500 shrink-0" />
                    <span>Sincroniza Favoritos y Cuenta</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-red-500 shrink-0" />
                    <span>Envío a TV con Chromecast</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-red-500 shrink-0" />
                    <span>Comentarios y Pedidos en vivo</span>
                  </li>
                </ul>
              </div>

              {/* Action Footer */}
              <div className="pt-8 mt-6 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
                <div className="text-xs text-zinc-400 text-center sm:text-left">
                  <span className="block text-zinc-200 font-semibold">
                    Paquete: {APP_DOWNLOAD_CONFIG.packageName}
                  </span>
                  <span>Requiere Android 6.0 o superior</span>
                </div>

                <a
                  href={playStoreUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-sm font-bold shadow-lg shadow-red-600/25 transition"
                >
                  <span>Descargar en Google Play</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* CARD 2: ANDROID TV / GOOGLE TV / FIRE TV */}
            <div className="relative rounded-3xl bg-gradient-to-b from-zinc-900/95 to-zinc-950 border border-zinc-800/90 hover:border-blue-500/40 transition-all duration-300 p-6 sm:p-8 flex flex-col justify-between shadow-2xl overflow-hidden group">
              <div className="pointer-events-none absolute -top-24 -right-24 w-56 h-56 bg-blue-600/15 blur-3xl rounded-full group-hover:bg-blue-600/25 transition" />

              <div className="space-y-6 relative z-10">
                {/* Top Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-600/30 shrink-0">
                      <Tv className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
                        <Sparkles className="w-3 h-3" /> Descarga Directa APK • Smart TV
                      </span>
                      <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
                        Android TV, Google TV y Fire TV
                      </h3>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowTvQrModal((prev) => !prev)}
                    title="Mostrar código QR para Android TV"
                    className="p-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 transition cursor-pointer"
                  >
                    <QrCode className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-sm text-zinc-300 leading-relaxed">
                  Versión diseñada exclusivamente para pantallas grandes y manejo con <strong>control remoto</strong>. Compatible con televisores Sony, TCL, Xiaomi, Hisense, Chromecast con Google TV, Xiaomi Mi Box y Amazon Fire TV Stick.
                </p>

                {showTvQrModal && (
                  <div className="rounded-2xl bg-zinc-950/90 border border-zinc-800 p-4 flex flex-col sm:flex-row items-center gap-4 animate-in fade-in duration-200">
                    <img
                      src={tvQrCodeImageUrl}
                      alt="Código QR Android TV APK"
                      className="w-28 h-28 rounded-xl bg-white p-1.5 shrink-0"
                    />
                    <div className="space-y-1 text-center sm:text-left">
                      <div className="text-sm font-bold text-white">
                        Descarga directa del APK para TV
                      </div>
                      <p className="text-xs text-zinc-400">
                        Escanea para descargar <code className="text-blue-300">app-streamnexus.apk</code> en tu teléfono y enviarlo a tu televisor con <em>Send Files to TV</em>.
                      </p>
                    </div>
                  </div>
                )}

                {/* Enlace directo copiable para Downloader */}
                <div className="rounded-2xl bg-zinc-950/80 border border-zinc-800/90 p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block">
                      URL Directa (Downloader / Navegador TV)
                    </span>
                    <span className="text-xs font-mono text-zinc-200 truncate block mt-0.5">
                      {androidTvUrl}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyTvLink}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition cursor-pointer"
                  >
                    {copiedTvLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Link</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Feature Checklist */}
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm text-zinc-300">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>Navegación 100% con Control Remoto</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>Calidad Full HD / 4K sin cortes</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>Compatible con TV Box y Fire Stick</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                    <span> Cambio rápido de idioma (Latino/Sub)</span>
                  </li>
                </ul>

                {downloaderCode && (
                  <div className="rounded-2xl bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-blue-600/15 border border-orange-500/40 p-4 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-orange-400">
                          Instalación Rápida en TV • Downloader by AFTVnews
                        </span>
                        <div className="text-xs text-zinc-200">
                          Abre la app <strong>Downloader</strong> en tu Android TV / Fire TV e ingresa el código:
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono text-lg sm:text-xl font-black text-white tracking-widest bg-zinc-950/90 px-4 py-1.5 rounded-xl border border-orange-400/50 shadow-inner">
                          {downloaderCode}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyTvCode}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition cursor-pointer shadow-md shadow-orange-600/20"
                        >
                          {copiedTvCode ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copiar</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Footer */}
              <div className="pt-8 mt-6 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
                <div className="text-xs text-zinc-400 text-center sm:text-left">
                  <span className="block text-zinc-200 font-semibold">
                    Archivo: app-streamnexus.apk
                  </span>
                  <span>Android TV OS / Google TV / Fire OS</span>
                </div>

                {hasTvDirectLink ? (
                  <a
                    href={androidTvUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold shadow-lg shadow-blue-600/25 transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>Descargar para Android TV</span>
                  </a>
                ) : (
                  <a
                    href={playStoreUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold shadow-lg shadow-blue-600/25 transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>Descargar APK / Android TV</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Ecosystem Benefits Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800/80 p-5 space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 text-red-400 flex items-center justify-center">
              <Heart className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white">Una Sola Cuenta</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Inicia sesión con tu correo o cuenta de Google y mantén tu avatar, lista de favoritos y comentarios sincronizados con la web.
            </p>
          </div>

          <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800/80 p-5 space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
              <Cast className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white">Soporte Multi-Pantalla</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Empieza a ver una película en tu teléfono camino a casa y continúa en tu Android TV en pantalla grande.
            </p>
          </div>

          <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800/80 p-5 space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white">Catálogo Actualizado al Día</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Todos los estrenos de películas, series y animes se publican al instante tanto en la web como en las aplicaciones.
            </p>
          </div>

          <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800/80 p-5 space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white">Pide tu Contenido</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              ¿No encuentras una película o serie? Solicítala desde la app o desde tu panel web y recibe aviso cuando esté lista.
            </p>
          </div>
        </section>

        {/* Bottom Call to Action */}
        <section className="rounded-3xl bg-gradient-to-r from-red-950/60 via-zinc-900 to-blue-950/60 border border-zinc-800 p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-xl sm:text-2xl font-black text-white">
              ¿Prefieres seguir viendo desde el navegador?
            </h3>
            <p className="text-sm text-zinc-300">
              Nuestro reproductor web también está optimizado para PC, Mac, iPhone y iPad sin instalar nada.
            </p>
          </div>
          <Link
            href="/catalog?type=movies"
            className="shrink-0 inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold border border-zinc-700 transition"
          >
            <span>Explorar Catálogo Web</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      </div>
    </div>
  );
}

