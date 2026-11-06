import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Dooplex Streaming — Películas, Series y Animes Online HD',
  description:
    'Plataforma de streaming conectada en tiempo real a la base de datos Dooplex (Movflix). Disfruta de películas, series y animes en Español Latino, Castellano y Subtitulado.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100 antialiased selection:bg-red-600 selection:text-white">
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-zinc-900 bg-zinc-950/90 py-10 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-red-600 flex items-center justify-center text-white font-black text-xs">
                D
              </div>
              <span className="font-bold text-zinc-300">DOOPLEX</span>
              <span>— Películas, Series y Animes Online HD</span>
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <Link href="/" className="hover:text-zinc-300 transition">
                Inicio
              </Link>
              <Link href="/catalog?type=movies" className="hover:text-zinc-300 transition">
                Películas
              </Link>
              <Link href="/catalog?type=series" className="hover:text-zinc-300 transition">
                Series
              </Link>
              <Link href="/catalog?type=animes" className="hover:text-zinc-300 transition">
                Animes
              </Link>
              <Link
                href="/privacy-policy"
                className="text-zinc-400 hover:text-red-400 font-medium transition"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms-and-conditions"
                className="text-zinc-400 hover:text-red-400 font-medium transition"
              >
                Terms and Conditions
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

