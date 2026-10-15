'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HelpCircle, Clock } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function Navbar() {
  const pathname = usePathname()
  const isBookingFlow = pathname?.includes('/booking/')
  const isPaymentStep = pathname?.includes('/payment')
  const isAdmin = pathname?.startsWith('/admin')

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
    <header className="sticky top-0 z-50 bg-white border-b border-borderCol">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand & Nav Links */}
        <div className="flex items-center gap-6 sm:gap-8">
          <Link href="/" className="flex items-center gap-2.5">
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
            <span className="text-xl font-black text-ink tracking-tight">
              Rute<span className="text-primary">Ku</span>
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-2">
            <Link
              href="/"
              className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all ${
                isCariTiketActive
                  ? 'bg-primary-tint text-primary'
                  : 'text-ink hover:text-primary'
              }`}
            >
              Cari tiket
            </Link>
            <Link
              href="/history"
              className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all ${
                isHistoryActive
                  ? 'bg-primary-tint text-primary'
                  : 'text-ink hover:text-primary font-medium'
              }`}
            >
              Riwayat booking
            </Link>
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Header countdown timer badge on booking screens */}
          {isBookingFlow && (
            isPaymentStep ? (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-[#FEF6EE] border border-[#F9DBAF] text-[#93370D] font-mono text-xs font-bold rounded-full shadow-2xs">
                <Clock size={13} className="text-[#93370D]" />
                <span>Segera habis {fmtTime(timeLeft)}</span>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-primary-tint border border-primary/20 text-primary font-mono text-xs font-bold rounded-full">
                <Clock size={13} className="text-primary" />
                <span>Kursi ditahan {fmtTime(timeLeft)}</span>
              </div>
            )
          )}

          {/* Bantuan Button -> links to /help */}
          <Link
            href="/help"
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-full border transition-all ${
              isHelpActive
                ? 'bg-primary-tint border-primary text-primary font-bold'
                : 'text-ink border-borderCol hover:border-primary hover:text-primary hover:bg-surface'
            }`}
          >
            <HelpCircle size={15} />
            <span>Bantuan</span>
          </Link>

          {/* User profile avatar badge — akses rahasia ke /admin ("yang tau tau aja") */}
          <Link
            href="/admin"
            className="w-8 h-8 rounded-full bg-secondary text-white font-bold text-xs flex items-center justify-center tracking-tight shadow-sm hover:opacity-90 transition-opacity"
            title="Akun Petugas"
          >
            DS
          </Link>
        </div>
      </div>
    </header>
  )
}
