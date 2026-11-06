import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ShieldCheck,
  Server,
  Lock,
  ExternalLink,
  Mail,
  FileText,
  ArrowLeft,
  Info,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Política de Privacidad (Privacy Policy) — Dooplex',
  description:
    'Política de Privacidad y condiciones de uso del servicio de entretenimiento Dooplex.',
};

export default function PrivacyPolicyPage() {
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
          <ShieldCheck className="w-4 h-4" />
          <span>Privacy Policy • Política de Privacidad</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          Política de Privacidad de DooPlex
        </h1>

        <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
          Esta Política de Privacidad describe cómo <strong>DooPlex</strong> (&ldquo;nosotros&rdquo;,
          &ldquo;nuestra aplicación&rdquo;, &ldquo;la plataforma web&rdquo; o &ldquo;el servicio&rdquo;) maneja la
          información en nuestro servicio de películas, series, animes y televisión.
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
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-white">
              1. Información que NO recopilamos
            </h2>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed">
            En <strong>DooPlex</strong> respetamos al máximo tu privacidad. Queremos informar de
            manera transparente a todos nuestros usuarios que:
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <li className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-xs sm:text-sm text-zinc-300">
              • <strong>No almacenamos ni vendemos</strong> datos personales sensibles en nuestros
              servidores.
            </li>
            <li className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-xs sm:text-sm text-zinc-300">
              • <strong>No exigimos registro obligatorio</strong> ni creación de cuentas para
              navegar y reproducir el catálogo público.
            </li>
            <li className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-xs sm:text-sm text-zinc-300">
              • <strong>No rastreamos</strong> tu historial personal de visualización con fines
              publicitarios externos.
            </li>
            <li className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-xs sm:text-sm text-zinc-300">
              • <strong>No utilizamos cookies invasivas</strong> ni tecnologías de espionaje de
              terceros en nuestra interfaz.
            </li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <Server className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-white">
              2. Fuentes de Contenido y Servidores Externos
            </h2>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed">
            Nuestra plataforma <strong>no aloja ningún archivo de video</strong> en servidores
            propios. DooPlex funciona exclusivamente como un índice automatizado de enlaces y
            metadatos (apoyado en bases de datos públicas como TMDB) hacia contenido alojado en
            plataformas de terceros, tales como:
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {[
              'Vidara',
              'StreamWish',
              'Streamtape',
              'Filemoon',
              'Doodstream',
              'EarnVids',
              'SuperVideo',
              'Uqload',
              'VOE',
              'Byse.sx',
              'OK.ru',
            ].map((provider) => (
              <span
                key={provider}
                className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-semibold text-zinc-300"
              >
                {provider}
              </span>
            ))}
          </div>
          <p className="text-xs sm:text-sm text-zinc-400">
            Todo el contenido multimedia se transmite directamente desde dichos proveedores
            externos, quienes son enteramente responsables de los archivos que alojan.
          </p>
        </section>

        {/* Section 3 */}
        <section className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
              <ExternalLink className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-white">
              3. Servicios y Políticas de Terceros
            </h2>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed">
            Al reproducir contenido mediante reproductores incrustados (
            <code className="px-1.5 py-0.5 rounded bg-zinc-950 text-zinc-200 text-xs">
              &lt;iframe&gt;
            </code>
            ) en DooPlex, tu
            navegador se conecta con los servidores de video externos seleccionados. Cada proveedor
            externo cuenta con sus propias condiciones y políticas de privacidad (por ejemplo,
            Streamtape, Filemoon, Doodstream, EarnVids o Vidara). Te recomendamos revisar las
            políticas de privacidad de dichos servicios y utilizar bloqueadores de ventanas
            emergentes si navegas en servidores externos.
          </p>
        </section>

        {/* Section 4 & 5 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-6 space-y-3">
            <div className="flex items-center gap-2.5">
              <FileText className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold text-white">
                4. Permisos Técnicos
              </h2>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">
              Tanto la web como la aplicación únicamente requieren conexión a Internet estándar y
              almacenamiento de sesión local en caso de que inicies sesión voluntariamente con una
              cuenta registrada.
            </p>
          </section>

          <section className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-6 space-y-3">
            <div className="flex items-center gap-2.5">
              <Info className="w-5 h-5 text-sky-400" />
              <h2 className="text-lg font-bold text-white">
                5. Cambios en esta Política
              </h2>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">
              Nos reservamos el derecho de actualizar o mejorar esta Política de Privacidad en
              cualquier momento. Cualquier modificación entrará en vigor inmediatamente tras su
              publicación en esta página.
            </p>
          </section>
        </div>

        {/* Section 6: Contact & Legal Disclaimer */}
        <section className="rounded-2xl bg-gradient-to-r from-red-950/30 via-zinc-900/80 to-zinc-900/80 border border-red-500/25 p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                6. Contacto y Aviso Legal (DMCA)
              </h2>
              <p className="text-xs text-zinc-400">
                Atención a usuarios y titulares de derechos
              </p>
            </div>
          </div>

          <p className="text-sm text-zinc-300 leading-relaxed">
            Si tienes preguntas, dudas o solicitudes relacionadas con esta Política de Privacidad,
            puedes escribirnos directamente a:
          </p>

          <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm font-semibold text-red-400">
            <Mail className="w-4 h-4" />
            <a href="mailto:soporte@docines.xyz" className="hover:underline">
              soporte@docines.xyz
            </a>
          </div>

          <p className="text-xs text-zinc-400 pt-2 border-t border-zinc-800/80 leading-relaxed">
            <strong>Nota Legal:</strong> DooPlex es una plataforma únicamente con fines de
            entretenimiento. No alojamos archivos protegidos por derechos de autor en nuestros
            servidores ni reclamamos propiedad sobre las marcas, pósters o contenidos disponibles a
            través de plataformas de terceros.
          </p>
        </section>
      </div>
    </div>
  );
}

