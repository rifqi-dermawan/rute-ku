'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Bus, 
  Clock, 
  ShieldCheck, 
  Mail, 
  Phone, 
  MapPin, 
  CheckCircle2, 
  ArrowRight,
  ExternalLink,
  CreditCard,
  QrCode
} from 'lucide-react'

export default function Footer() {
  const pathname = usePathname()
  const isAdmin = pathname?.startsWith('/admin')
  const isSeatPage = pathname?.includes('/booking/') && pathname?.includes('/seat')

  // Dedicated clean administrative footer for the operator dashboard
  if (isAdmin) {
    return (
      <footer className="bg-white border-t border-borderCol py-4 px-4 sm:px-8 mt-auto text-xs text-muted flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-primary flex items-center justify-center text-white text-[10px] font-bold">
            RK
          </div>
          <span className="font-medium text-ink">
            © 2026 RuteKu Operator Console · Sistem Manajemen Reservasi &amp; Kursi Bus
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[11px] bg-green-50 text-success border border-green-200 px-2.5 py-0.5 rounded-full font-semibold">
            ● Sistem Aktif
          </span>
          <Link href="/" className="text-primary font-semibold hover:underline flex items-center gap-1">
            Portal Penumpang <ArrowRight size={12} />
          </Link>
        </div>
      </footer>
    )
  }

  return (
    <footer className={`bg-white border-t border-borderCol mt-auto print:hidden ${isSeatPage ? 'pb-24 lg:pb-0' : ''}`}>
      {/* ── Top Highlights / Trust Bar ─────────────────────────────── */}
      <div className="border-b border-borderCol/70 bg-surface/50 footer-grey-bar">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-primary-tint border border-primary/25 text-primary flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-ink dark:!text-black">Tahan Kursi 10 Menit</h4>
                <p className="text-[11px] text-muted dark:!text-black/85 mt-0.5 leading-snug">
                  Kursi pilihanmu aman ditahan selama transaksi berlangsung tanpa rebutan.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-primary-tint border border-primary/25 text-primary flex items-center justify-center flex-shrink-0">
                <Bus className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-ink dark:!text-black">Denah Kursi Real-Time</h4>
                <p className="text-[11px] text-muted dark:!text-black/85 mt-0.5 leading-snug">
                  Pilih sendiri letak jendela, lorong, atau sleeper sesuai keinginanmu.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-primary-tint border border-primary/25 text-primary flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-ink dark:!text-black">Pembayaran Terverifikasi</h4>
                <p className="text-[11px] text-muted dark:!text-black/85 mt-0.5 leading-snug">
                  Didukung gateway pembayaran resmi dengan QRIS, Virtual Account, &amp; E-Wallet.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-primary-tint border border-primary/25 text-primary flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-ink dark:!text-black">E-Tiket &amp; Barcode Instan</h4>
                <p className="text-[11px] text-muted dark:!text-black/85 mt-0.5 leading-snug">
                  E-tiket resmi terbit langsung setelah pembayaran, tinggal tunjukkan saat naik.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Footer Directory ──────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10">
          {/* Brand Info (2 Columns on Large Screens) */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="inline-flex items-center gap-2.5">
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

            <p className="text-xs text-muted leading-relaxed max-w-sm">
              Platform pemesanan tiket bus antarkota modern dengan sistem pemilihan denah kursi langsung, jaminan anti-rebutan tiket, dan konfirmasi instan di seluruh rute Indonesia.
            </p>

            {/* Contact quick links */}
            <div className="pt-2 space-y-2 text-xs text-muted">
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-primary flex-shrink-0" />
                <span>CS WhatsApp: +62 812-3456-7890 (24 Jam)</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-primary flex-shrink-0" />
                <span>Email: bantuan@ruteku.id</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-primary flex-shrink-0" />
                <span>Jakarta Selatan, DKI Jakarta 12190</span>
              </div>
            </div>
          </div>

          {/* Quick Nav Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-ink uppercase tracking-wider">
              Menu Utama
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/" className="text-muted hover:text-primary transition-colors flex items-center gap-1">
                  <span>Cari Tiket Bus</span>
                </Link>
              </li>
              <li>
                <Link href="/schedules" className="text-muted hover:text-primary transition-colors flex items-center gap-1">
                  <span>Jadwal Keberangkatan</span>
                </Link>
              </li>
              <li>
                <Link href="/history" className="text-muted hover:text-primary transition-colors flex items-center gap-1">
                  <span>Riwayat Pemesanan</span>
                </Link>
              </li>
              <li>
                <Link href="/help" className="text-muted hover:text-primary transition-colors flex items-center gap-1">
                  <span>Pusat Bantuan &amp; FAQ</span>
                </Link>
              </li>
              <li>
                <Link href="/special-states" className="text-muted hover:text-primary transition-colors flex items-center gap-1">
                  <span>Status Khusus &amp; Simulasi</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Popular Routes */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-ink uppercase tracking-wider">
              Rute Favorit
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/schedules?from=Jakarta&to=Bandung&date=2026-10-10&passengers=1" className="text-muted hover:text-primary transition-colors">
                  Jakarta → Bandung
                </Link>
              </li>
              <li>
                <Link href="/schedules?from=Surabaya&to=Yogyakarta&date=2026-10-10&passengers=1" className="text-muted hover:text-primary transition-colors">
                  Surabaya → Yogyakarta
                </Link>
              </li>
              <li>
                <Link href="/schedules?from=Bandung&to=Yogyakarta&date=2026-10-10&passengers=1" className="text-muted hover:text-primary transition-colors">
                  Bandung → Yogyakarta
                </Link>
              </li>
              <li>
                <Link href="/schedules?from=Jakarta&to=Semarang&date=2026-10-10&passengers=1" className="text-muted hover:text-primary transition-colors">
                  Jakarta → Semarang
                </Link>
              </li>
              <li>
                <Link href="/schedules?from=Jakarta&to=Surabaya&date=2026-10-10&passengers=1" className="text-muted hover:text-primary transition-colors">
                  Jakarta → Surabaya
                </Link>
              </li>
            </ul>
          </div>

          {/* Payment & Partners */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-ink uppercase tracking-wider">
              Metode Pembayaran
            </h4>
            <p className="text-[11px] text-muted leading-relaxed">
              Transaksi aman didukung gateway Midtrans dengan berbagai metode resmi:
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="px-2 py-1 bg-surface border border-borderCol rounded text-[10px] font-semibold text-ink">
                QRIS
              </span>
              <span className="px-2 py-1 bg-surface border border-borderCol rounded text-[10px] font-semibold text-ink">
                GoPay
              </span>
              <span className="px-2 py-1 bg-surface border border-borderCol rounded text-[10px] font-semibold text-ink">
                BCA VA
              </span>
              <span className="px-2 py-1 bg-surface border border-borderCol rounded text-[10px] font-semibold text-ink">
                Mandiri
              </span>
              <span className="px-2 py-1 bg-surface border border-borderCol rounded text-[10px] font-semibold text-ink">
                BNI VA
              </span>
              <span className="px-2 py-1 bg-surface border border-borderCol rounded text-[10px] font-semibold text-ink">
                BRI VA
              </span>
              <span className="px-2 py-1 bg-surface border border-borderCol rounded text-[10px] font-semibold text-ink">
                Indomaret
              </span>
              <span className="px-2 py-1 bg-surface border border-borderCol rounded text-[10px] font-semibold text-ink">
                Alfamart
              </span>
            </div>

            <h4 className="text-xs font-bold text-ink uppercase tracking-wider pt-2">
              Mitra Bus Resmi
            </h4>
            <p className="text-[11px] text-muted">
              Nusa Trans · Lintas Rasa · Cipta Wisata · Rosalia Indah
            </p>
          </div>
        </div>
      </div>

      {/* ── Bottom Legal & Copyright Bar ────────────────────────────── */}
      <div className="border-t border-borderCol bg-surface/70 footer-grey-bar">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted dark:!text-black">
          <p className="dark:!text-black">
            © {new Date().getFullYear()} <span className="font-bold text-ink dark:!text-black">RuteKu</span> (PT RuteKu Transportasi Indonesia). Seluruh hak cipta dilindungi.
          </p>

          <div className="flex items-center gap-4 flex-wrap dark:!text-black">
            <Link href="/help" className="hover:text-primary dark:!text-black dark:hover:!text-primary transition-colors">
              Kebijakan Privasi
            </Link>
            <span className="dark:!text-black">·</span>
            <Link href="/help" className="hover:text-primary dark:!text-black dark:hover:!text-primary transition-colors">
              Syarat &amp; Ketentuan
            </Link>
            <span className="dark:!text-black">·</span>
            <Link href="/help" className="hover:text-primary dark:!text-black dark:hover:!text-primary transition-colors">
              Pusat Panduan
            </Link>
            <span className="dark:!text-black">·</span>
            <Link href="/admin" className="text-muted/60 dark:!text-black/80 hover:text-primary dark:hover:!text-primary transition-colors" title="Akses Petugas">
              Petugas
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
