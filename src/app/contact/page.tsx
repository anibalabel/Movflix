import type { Metadata } from 'next';
import Link from 'next/link';
import FooterContactForm from '@/components/FooterContactForm';
import { ArrowLeft, Mail, MessageSquare, Clock, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contacto y Soporte (Contact Us) — Dooplex',
  description:
    'Ponte en contacto con el equipo de soporte de Dooplex para reportes técnicos, sugerencias o consultas legales.',
};

export default function ContactPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      {/* Top Breadcrumb */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-zinc-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Inicio</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800/90 p-6 sm:p-10 shadow-2xl space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/15 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider">
          <MessageSquare className="w-4 h-4" />
          <span>Contact Us • Centro de Soporte</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          Contacto y Soporte de DooPlex
        </h1>

        <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
          ¿Encontraste algún servidor caído, deseas solicitar una película, serie o anime, o tienes
          una consulta legal? Completa el siguiente formulario o escríbenos directamente a nuestro
          correo oficial.
        </p>

        <div className="pt-2 flex flex-wrap items-center gap-6 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-red-500" />
            <span>
              Correo directo:{' '}
              <a
                href="mailto:soporte@movflix.live"
                className="text-red-400 font-semibold hover:underline"
              >
                soporte@movflix.live
              </a>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>Tiempo de respuesta habitual: 24–48 horas</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            <span>Atención DMCA y Soporte Técnico</span>
          </div>
        </div>
      </div>

      {/* Contact Form Component */}
      <FooterContactForm />
    </div>
  );
}

