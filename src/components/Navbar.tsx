'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Film,
  Tv,
  Sparkles,
  Search,
  User,
  LogOut,
  Menu,
  X,
  Home,
  ShieldCheck,
} from 'lucide-react';
import LoginModal, { AuthUser } from './LoginModal';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated && d.user) {
          setUser(d.user);
        }
      })
      .catch(() => {});
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      router.push(`/catalog?q=${encodeURIComponent(q)}`);
      setMobileMenuOpen(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  };

  const navLinks = [
    { href: '/', label: 'Inicio', icon: Home },
    { href: '/catalog?type=movies', label: 'Películas', icon: Film },
    { href: '/catalog?type=series', label: 'Series', icon: Tv },
    { href: '/catalog?type=animes', label: 'Animes', icon: Sparkles },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-zinc-950/85 backdrop-blur-xl border-b border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center shadow-lg shadow-red-600/30 group-hover:scale-105 transition">
                <span className="text-white font-black text-lg tracking-tighter">D</span>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-extrabold tracking-tight text-white leading-none">
                  DOO<span className="text-red-500">PLEX</span>
                </span>
                <span className="text-[10px] text-zinc-400 font-medium tracking-widest uppercase">
                  Movflix Streaming
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname.startsWith('/catalog') &&
                      typeof window !== 'undefined' &&
                      window.location.href.includes(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition ${
                      isActive
                        ? 'bg-red-600/15 text-red-400'
                        : 'text-zinc-300 hover:text-white hover:bg-zinc-900'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Search & User Profile */}
          <div className="flex items-center gap-3">
            <form onSubmit={handleSearch} className="hidden sm:block relative w-64 lg:w-80">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar título o TMDB ID..."
                className="w-full pl-10 pr-4 py-2 rounded-full bg-zinc-900/90 border border-zinc-800 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:bg-zinc-900 transition"
              />
            </form>

            {user ? (
              <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full pl-3 pr-2 py-1">
                <div className="flex items-center gap-1.5">
                  {user.role === 'admin' ? (
                    <ShieldCheck className="w-4 h-4 text-red-500" />
                  ) : (
                    <User className="w-4 h-4 text-zinc-400" />
                  )}
                  <span className="text-xs font-semibold text-zinc-200 max-w-[110px] truncate">
                    {user.name}
                  </span>
                  {user.role === 'admin' && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase bg-red-600/20 text-red-400 rounded-full">
                      Admin
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Cerrar sesión"
                  className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setLoginOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-red-600/20 transition cursor-pointer"
              >
                <User className="w-4 h-4" />
                <span>Acceder</span>
              </button>
            )}

            {/* Mobile Hamburger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((o) => !o)}
              className="md:hidden p-2 rounded-xl bg-zinc-900 text-zinc-300 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden px-4 pt-2 pb-4 bg-zinc-950 border-b border-zinc-800 space-y-3">
            <form onSubmit={handleSearch} className="relative w-full">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar películas, series, animes o TMDB ID..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white"
              />
            </form>
            <div className="grid grid-cols-2 gap-2">
              {navLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-zinc-900/80 text-zinc-200 text-sm font-medium hover:bg-zinc-800"
                  >
                    <Icon className="w-4 h-4 text-red-500" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </header>

      <LoginModal
        isOpen={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSuccess={(loggedUser) => setUser(loggedUser)}
      />
    </>
  );
}

