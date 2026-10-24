'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HelpCircle, Clock, Sun, Moon, LogIn, LogOut, Ticket, ChevronDown } from 'lucide-react'
import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'

export default function Navbar() {
  const pathname = usePathname()
  const isBookingFlow = pathname?.includes('/booking/')
  const isPaymentStep = pathname?.includes('/payment')
  const isAdmin = pathname?.startsWith('/admin')

  const { user, openAuthModal, logout } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const [mounted, setMounted] = useState(false)
  const [isDark, setIsDark] = useState(false)

  // Close user dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ruteku_theme')
      const dark = stored === 'dark' || document.documentElement.getAttribute('data-theme') === 'dark' || document.documentElement.classList.contains('dark')
      setIsDark(dark)
      const val = dark ? 'dark' : 'light'
      document.documentElement.setAttribute('data-theme', val)
      document.body.setAttribute('data-theme', val)
      if (dark) {
        document.documentElement.classList.add('dark')
        document.body.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
        document.body.classList.remove('dark')
      }
    }
  }, [])

  const toggleTheme = () => {
    const nextDark = !isDark
    setIsDark(nextDark)
    if (typeof window !== 'undefined') {
      const val = nextDark ? 'dark' : 'light'
      localStorage.setItem('ruteku_theme', val)
      document.documentElement.setAttribute('data-theme', val)
      document.body.setAttribute('data-theme', val)
      if (nextDark) {
        document.documentElement.classList.add('dark')
        document.body.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
        document.body.classList.remove('dark')
      }
    }
  }

  if (isAdmin) return null

  const [timeLeft, setTimeLeft] = useState(108) // 01:48 for payment, or 517 for hold

  useEffect(() => {
    if (!isBookingFlow) return
    const interval = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [isBookingFlow])

  const fmtTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const isCariTiketActive = pathname === '/' || pathname?.startsWith('/schedules')
  const isHistoryActive = pathname?.startsWith('/history')
  const isHelpActive = pathname?.startsWith('/help')

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-borderCol print:hidden">
      <div className="max-w-7xl mx-auto px-3 sm:px-8 h-16 flex items-center justify-between gap-2">
        {/* Left: Brand & Nav Links */}
        <div className="flex items-center gap-2.5 sm:gap-6 min-w-0">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white shadow-xs">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 6v6" />
                <path d="M16 6v6" />
                <path d="M4 6h16" />
                <rect x="4" y="3" width="16" height="15" rx="3" />
                <circle cx="7.5" cy="15.5" r="1.5" />
                <circle cx="16.5" cy="15.5" r="1.5" />
                <path d="M4 18v2a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-2" />
                <path d="M17 18v2a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-2" />
              </svg>
            </div>
            <span className="text-lg sm:text-xl font-black text-ink tracking-tight">
              Rute<span className="text-primary">Ku</span>
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/"
              className={`px-2.5 sm:px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                isCariTiketActive
                  ? 'bg-primary-tint text-primary'
                  : 'text-ink hover:text-primary'
              }`}
            >
              <span>Cari</span>
              <span className="hidden sm:inline"> tiket</span>
            </Link>
            <Link
              href="/history"
              className={`px-2.5 sm:px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                isHistoryActive
                  ? 'bg-primary-tint text-primary'
                  : 'text-ink hover:text-primary font-medium'
              }`}
            >
              <span>Riwayat</span>
              <span className="hidden sm:inline"> booking</span>
            </Link>
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
          {/* Header countdown timer badge on booking screens */}
          {isBookingFlow && (
            isPaymentStep ? (
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-[#FEF6EE] border border-[#F9DBAF] text-[#93370D] font-mono text-xs font-bold rounded-full shadow-2xs">
                <Clock size={13} className="text-[#93370D]" />
                <span>Segera habis {fmtTime(timeLeft)}</span>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-primary-tint border border-primary/20 text-primary font-mono text-xs font-bold rounded-full">
                <Clock size={13} className="text-primary" />
                <span>Kursi ditahan {fmtTime(timeLeft)}</span>
              </div>
            )
          )}

          {/* Tombol Masuk & Daftar (terpisah seperti web travel asli) */}
          {!user ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => openAuthModal({ mode: 'login' })}
                className="px-3 sm:px-3.5 py-1.5 text-xs sm:text-sm font-bold rounded-full text-ink dark:text-white hover:text-primary hover:bg-surface dark:hover:bg-white/5 border border-borderCol dark:border-white/10 transition-all cursor-pointer"
              >
                Masuk
              </button>
              <button
                type="button"
                onClick={() => openAuthModal({ mode: 'register' })}
                className="px-3 sm:px-3.5 py-1.5 text-xs sm:text-sm font-bold rounded-full bg-primary hover:bg-primary-dark text-white shadow-2xs transition-all cursor-pointer"
              >
                Daftar
              </button>
            </div>
          ) : (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-bold rounded-full bg-primary-tint/80 dark:bg-primary-dark/40 border border-primary/30 text-primary dark:text-primary-tint hover:bg-primary-tint transition-all cursor-pointer shadow-2xs"
                title={`Akun: ${user.name}`}
              >
                <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:inline max-w-[90px] truncate">{user.name.split(' ')[0]}</span>
                <ChevronDown size={13} className={`transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {showUserMenu && (
                <div 
                  className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#1A2E3B] rounded-xl shadow-xl border border-borderCol dark:border-white/10 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
                  onClick={() => setShowUserMenu(false)}
                >
                  <div className="px-3.5 py-2 border-b border-borderCol/60 dark:border-white/10">
                    <p className="text-xs font-bold text-ink dark:text-white truncate">{user.name}</p>
                    <p className="text-[11px] text-muted dark:text-gray-400 truncate">{user.email || user.phone}</p>
                  </div>

                  <Link
                    href="/history"
                    className="flex items-center gap-2 px-3.5 py-2 text-xs text-ink dark:text-white hover:bg-surface dark:hover:bg-black/20 font-medium transition-colors"
                  >
                    <Ticket size={14} className="text-primary" />
                    <span>Riwayat Booking</span>
                  </Link>

                  <Link
                    href="/help"
                    className="flex items-center gap-2 px-3.5 py-2 text-xs text-ink dark:text-white hover:bg-surface dark:hover:bg-black/20 font-medium transition-colors"
                  >
                    <HelpCircle size={14} className="text-primary" />
                    <span>Pusat Bantuan & FAQ</span>
                  </Link>

                  <div className="border-t border-borderCol/60 dark:border-white/10 my-1" />

                  <button
                    type="button"
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-error hover:bg-red-50 dark:hover:bg-red-950/30 font-semibold transition-colors cursor-pointer text-left"
                  >
                    <LogOut size={14} />
                    <span>Keluar Akun</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Bantuan Button -> links to /help */}
          <Link
            href="/help"
            className={`flex items-center justify-center gap-1.5 p-2 sm:px-3.5 sm:py-1.5 text-xs sm:text-sm font-semibold rounded-full border transition-all cursor-pointer ${
              isHelpActive
                ? 'bg-primary-tint border-primary text-primary font-bold'
                : 'text-ink border-borderCol hover:border-primary hover:text-primary hover:bg-surface'
            }`}
            title="Bantuan & FAQ"
          >
            <HelpCircle size={16} />
            <span className="hidden sm:inline">Bantuan</span>
          </Link>

          {/* Theme Toggle: 1 logo (Bulan / Matahari) dengan efek animasi klik & rotasi */}
          <button
            type="button"
            onClick={toggleTheme}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-borderCol bg-white dark:bg-black text-ink hover:text-primary hover:border-primary hover:bg-surface flex items-center justify-center transition-all duration-300 transform active:scale-75 active:rotate-45 shadow-2xs cursor-pointer group relative overflow-hidden"
            title={mounted ? (isDark ? 'Beralih ke Mode Putih' : 'Beralih ke Mode Dark') : 'Ganti Tema'}
            aria-label="Ganti mode tema"
            suppressHydrationWarning
          >
            <span
              className={`transition-all duration-500 ease-out flex items-center justify-center ${
                mounted && isDark ? 'rotate-180 scale-110 text-amber-400' : 'rotate-0 scale-100 text-secondary'
              }`}
            >
              {mounted && isDark ? (
                <Sun size={16} className="transition-transform duration-300 group-hover:rotate-45" />
              ) : (
                <Moon size={16} className="transition-transform duration-300 group-hover:-rotate-12" />
              )}
            </span>
          </button>
        </div>
      </div>
    </header>
  )
}
