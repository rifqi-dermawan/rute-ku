'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HelpCircle, Clock } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function Navbar() {
  const pathname = usePathname()
  const isBookingFlow = pathname?.includes('/booking/')
  const [timeLeft, setTimeLeft] = useState(517) // ~08:37

  useEffect(() => {
    if (!isBookingFlow) return
    const interval = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [isBookingFlow])

  const fmtTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-borderCol">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand & Nav */}
        <div className="flex items-center gap-6 sm:gap-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white shadow-sm">
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
            <span className="text-xl font-black text-ink tracking-tight">
              Rute<span className="text-primary">Ku</span>
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-2">
            <Link
              href="/"
              className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all ${
                pathname === '/' || pathname?.startsWith('/schedules')
                  ? 'bg-primary-tint text-primary'
                  : 'text-ink hover:text-primary'
              }`}
            >
              Cari tiket
            </Link>
            <Link
              href="/history"
              className="px-3 py-1.5 text-xs sm:text-sm font-medium text-ink hover:text-primary transition-colors"
            >
              Riwayat booking
            </Link>
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Header countdown timer badge on booking screens */}
          {isBookingFlow && (
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-primary-tint border border-primary/20 text-primary font-mono text-xs font-bold rounded-full">
              <Clock size={13} className="text-primary" />
              <span>Kursi ditahan {fmtTime(timeLeft)}</span>
            </div>
          )}

          {/* Bantuan Button */}
          <button
            type="button"
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-full text-ink border border-borderCol hover:border-primary hover:text-primary hover:bg-surface transition-all"
          >
            <HelpCircle size={15} />
            <span>Bantuan</span>
          </button>

          {/* User profile avatar badge */}
          <div className="w-8 h-8 rounded-full bg-secondary text-white font-bold text-xs flex items-center justify-center tracking-tight shadow-sm cursor-pointer hover:opacity-90 transition-opacity">
            DS
          </div>
        </div>
      </div>
    </header>
  )
}
