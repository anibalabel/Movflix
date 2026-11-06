import type { Metadata } from 'next';
import Link from 'next/link';
import {
  FileText,
  Scale,
  ShieldAlert,
  Globe,
  UserCheck,
  Copyright,
  Mail,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Términos y Condiciones (Terms and Conditions) — Dooplex',
  description:
    'Términos y Condiciones de uso de la plataforma de entretenimiento y streaming Dooplex.',
};

export default function TermsAndConditionsPage() {
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
          <Scale className="w-4 h-4" />
          <span>Terms and Conditions • Términos y Condiciones</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          Términos y Condiciones de Uso de DooPlex
        </h1>

        <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
          Bienvenido a <strong>DooPlex</strong>. Al acceder y utilizar nuestro sitio web y
          aplicación, aceptas cumplir y quedar vinculado por los siguientes Términos y Condiciones
          de uso. Si no estás de acuerdo con alguna parte de estos términos, te recomendamos no
          utilizar nuestros servicios.
        </p>

        <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-zinc-400">
          <span>Última actualización: Noviembre 2026</span>
          <span>•</span>
          <span>Plataforma: DooPlex Web &amp; App</span>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="space-y-6">
        {/* Section 1 */}
        <section className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-white">
              1. Naturaleza del Servicio
            </h2>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed">
            <strong>DooPlex</strong> es un directorio e índice informativo de contenido audiovisual
            (películas, series y animes) con fines exclusivamente de entretenimiento. Nuestra
            plataforma organiza metadatos públicos (sinopsis, pósters, fechas de estreno y
            calificaciones proporcionadas por servicios como TMDB) junto con enlaces de
            visualización embebidos proporcionados por servidores de terceros en Internet.
          </p>
        </section>

        {/* Section 2 */}
        <section className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Copyright className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-white">
              2. Propiedad Intelectual y Enlaces de Terceros (DMCA)
            </h2>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed">
            <strong>DooPlex no aloja, sube, almacena ni distribuye</strong> ningún archivo de video
            o multimedia en sus propios servidores. Todos los videos accesibles desde el reproductor
            se encuentran alojados en servicios externos e independientes de terceros (tales como
            Vidara, StreamWish, Doodstream, Streamtape, Filemoon, EarnVids, Uqload, VOE, OK.ru,
            entre otros).
          </p>
          <ul className="space-y-2 text-xs sm:text-sm text-zinc-400 pt-1">
            <li>
              • DooPlex no tiene control sobre el contenido alojado en dichos servidores externos ni
              sobre su disponibilidad o legalidad.
            </li>
            <li>
              • Todas las marcas comerciales, logotipos, imágenes promocionales y títulos pertenecen
              a sus respectivos propietarios y estudios.
            </li>
            <li>
              • Si eres titular de derechos de autor y deseas solicitar el retiro de algún enlace
              indexado, puedes contactarnos o acudir directamente al proveedor de alojamiento del
              video externo.
            </li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-white">
              3. Uso Aceptable por Parte del Usuario
            </h2>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed">
            Al utilizar DooPlex, te comprometes a hacer un uso responsable y lícito de la
            plataforma. Queda estrictamente prohibido:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-xs sm:text-sm text-zinc-300">
              • Realizar ataques automatizados (scraping masivo, DDoS o inyección de código) contra
              nuestros servidores o APIs.
            </div>
            <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-xs sm:text-sm text-zinc-300">
              • Intentar vulnerar las cuentas de otros usuarios o del panel de administración.
            </div>
            <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-xs sm:text-sm text-zinc-300">
              • Utilizar la plataforma con fines comerciales no autorizados o redistribuir nuestro
              servicio haciéndolo pasar por propio.
            </div>
            <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-xs sm:text-sm text-zinc-300">
              • Introducir software malicioso, virus o enlaces fraudulentos.
            </div>
          </div>
        </section>

        {/* Section 4 & 5 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-6 space-y-3">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <h2 className="text-lg font-bold text-white">
                4. Exclusión de Garantías
              </h2>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">
              El servicio se proporciona &ldquo;tal cual&rdquo; y &ldquo;según disponibilidad&rdquo;. No garantizamos que
              los servidores externos de video funcionen sin interrupciones ni nos hacemos
              responsables de la publicidad o enlaces que dichos reproductores externos puedan
              mostrar.
            </p>
          </section>

          <section className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-6 space-y-3">
            <div className="flex items-center gap-2.5">
              <RefreshCw className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-bold text-white">
                5. Modificaciones del Servicio
              </h2>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">
              DooPlex se reserva el derecho de modificar, actualizar o suspender temporal o
              permanentemente cualquier sección del catálogo o de estos Términos y Condiciones sin
              previo aviso.
            </p>
          </section>
        </div>

        {/* Section 6: Contact */}
        <section className="rounded-2xl bg-gradient-to-r from-red-950/30 via-zinc-900/80 to-zinc-900/80 border border-red-500/25 p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                6. Contacto y Soporte Legal
              </h2>
              <p className="text-xs text-zinc-400">
                Consultas sobre los Términos y Condiciones
              </p>
            </div>
          </div>

          <p className="text-sm text-zinc-300 leading-relaxed">
            Para cualquier consulta relacionada con estos Términos y Condiciones, reportes técnicos
            o solicitudes legales, puedes comunicarte con nuestro equipo en:
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm font-semibold text-red-400">
              <Mail className="w-4 h-4" />
              <a href="mailto:soporte@movflix.live" className="hover:underline">
                soporte@movflix.live
              </a>
            </div>

            <Link
              href="/privacy-policy"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs sm:text-sm font-semibold text-zinc-200 transition"
            >
              <span>Ver Política de Privacidad</span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

