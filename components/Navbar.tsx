import Link from 'next/link';
import { HelpCircle, MapPin } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 bg-white border-b border-borderCol shadow-sm">
      {/* Logo */}
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-white">
            <MapPin size={16} strokeWidth={2.5} />
          </span>
          <span className="text-xl font-extrabold text-primary tracking-tight">
            Rute<span className="text-secondary">Ku</span>
          </span>
        </Link>

        {/* Menu utama */}
        <div className="hidden sm:flex gap-6 text-sm font-medium text-muted">
          <Link
            href="/"
            className="hover:text-primary transition-colors duration-150"
          >
            Cari Tiket
          </Link>
          <Link
            href="/history"
            className="hover:text-primary transition-colors duration-150"
          >
            Riwayat Booking
          </Link>
        </div>
      </div>

      {/* Tombol Bantuan */}
      <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full text-ink border border-borderCol bg-white hover:bg-surface hover:border-primary hover:text-primary transition-all duration-150">
        <HelpCircle size={15} />
        Bantuan
      </button>
    </nav>
  );
}
