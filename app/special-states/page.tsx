'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertCircle, Clock, WifiOff, Check } from 'lucide-react'

export default function SpecialStatesPage() {
  const [extended, setExtended] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [connectionSuccess, setConnectionSuccess] = useState(false)
  const [selectedAltSeat, setSelectedAltSeat] = useState<string | null>(null)

  const handleReconnect = () => {
    setIsReconnecting(true)
    setTimeout(() => {
      setIsReconnecting(false)
      setConnectionSuccess(true)
    }, 1200)
  }

  return (
    <div className="min-h-screen bg-surface pb-20">
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        {/* Title */}
        <div>
          <span className="block text-xs font-bold text-red-600 uppercase tracking-widest mb-1">
            LAYAR 10 · STATE KHUSUS
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-ink tracking-tight">
            Empat kondisi tak terduga, tiap kali ada jalan keluar
          </h1>
        </div>

        {/* 2x2 Grid of Special States */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 1. Kursi Direbut Pengguna Lain */}
          <div className="bg-white border border-borderCol rounded-card p-6 shadow-2xs space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <span className="text-xs font-bold text-muted uppercase tracking-wider block">
                1 · KURSI DIREBUT PENGGUNA LAIN
              </span>

              {/* Red notification banner */}
              <div className="p-4 rounded-xl bg-red-50/70 border border-red-200 text-error space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertCircle size={18} className="flex-shrink-0 mt-0.5 text-error" />
                  <div>
                    <strong className="block text-sm font-bold text-error">
                      Kursi 5B baru saja diambil pengguna lain
                    </strong>
                    <p className="text-xs text-ink/80 mt-0.5">
                      Kursi 5A kamu tetap aman. Ini kursi kosong terdekat:
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  {['6B', '6A', '5D'].map(seat => (
                    <button
                      key={seat}
                      type="button"
                      onClick={() => setSelectedAltSeat(seat)}
                      className={`px-3 py-1.5 rounded-input text-xs font-bold border transition-all ${
                        selectedAltSeat === seat
                          ? 'bg-primary text-white border-primary'
                          : 'border-borderCol bg-white text-ink hover:border-primary hover:text-primary'
                      }`}
                    >
                      Pilih {seat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mini Bus Grid Illustration */}
              <div className="bg-surface border border-borderCol rounded-xl p-4 flex justify-center">
                <div className="space-y-2">
                  {/* Row 4 */}
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <div className="w-8 h-8 rounded-lg bg-[#FDF2FA] border border-[#EDADD6] text-[#C11574] flex items-center justify-center">
                      <Clock size={12} />
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-[#FDF2FA] border border-[#EDADD6] text-[#C11574] flex items-center justify-center">
                      <Clock size={12} />
                    </div>
                    <span className="w-5 text-center text-muted font-normal text-[11px]">4</span>
                    <div className="w-8 h-8 rounded-lg bg-white border border-borderCol text-ink flex items-center justify-center">
                      4C
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-[#0F2A33] text-white flex items-center justify-center">
                      ✕
                    </div>
                  </div>

                  {/* Row 5 */}
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <div className="w-8 h-8 rounded-lg bg-[#4F46E5] text-white flex items-center justify-center flex-col">
                      <Check size={10} strokeWidth={3} />
                      <span className="text-[9px]">5A</span>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-[#FDF2FA] border-2 border-error text-error flex items-center justify-center ring-2 ring-error/20 animate-pulse">
                      <Clock size={12} />
                    </div>
                    <span className="w-5 text-center text-muted font-normal text-[11px]">5</span>
                    <div className="w-8 h-8 rounded-lg bg-[#0F2A33] text-white flex items-center justify-center">
                      ✕
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-white border border-borderCol text-ink flex items-center justify-center">
                      5D
                    </div>
                  </div>

                  {/* Row 6 */}
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <div className="w-8 h-8 rounded-lg bg-white border border-borderCol text-ink flex items-center justify-center">
                      6A
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-white border border-borderCol text-ink flex items-center justify-center">
                      6B
                    </div>
                    <span className="w-5 text-center text-muted font-normal text-[11px]">6</span>
                    <div className="w-8 h-8 rounded-lg bg-white border border-borderCol text-ink flex items-center justify-center">
                      6C
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-[#FDF2FA] border border-[#EDADD6] text-[#C11574] flex items-center justify-center">
                      <Clock size={12} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted leading-relaxed">
              Kursi 5B diberi garis merah tebal sebentar, lalu menjadi &quot;Ditahan&quot;. Pilihan 5A tidak hilang dan timer tetap berjalan.
            </p>
          </div>

          {/* 2. Waktu Tahan Kursi Habis */}
          <div className="bg-white border border-borderCol rounded-card p-6 shadow-2xs space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <span className="text-xs font-bold text-muted uppercase tracking-wider block">
                2 · WAKTU TAHAN KURSI HABIS
              </span>

              {/* Modal Card Representation */}
              <div className="p-6 bg-secondary rounded-2xl flex items-center justify-center">
                <div className="bg-white rounded-xl p-5 w-full max-w-sm text-center shadow-lg space-y-3">
                  <div className="w-10 h-10 rounded-full bg-warning/10 text-warning flex items-center justify-center mx-auto">
                    <Clock size={20} />
                  </div>
                  <h3 className="font-black text-ink text-base">Waktu tahan kursi habis</h3>
                  <p className="text-xs text-muted leading-relaxed">
                    Kursi 5A dan 5B akan dilepas. Data penumpang yang sudah kamu isi tetap tersimpan.
                  </p>
                  <div className="pt-2 space-y-2">
                    <button
                      type="button"
                      disabled={extended}
                      onClick={() => setExtended(true)}
                      className="w-full py-2 bg-primary hover:bg-primary-dark disabled:bg-borderCol disabled:text-muted text-white text-xs font-bold rounded-input transition-colors shadow-2xs"
                    >
                      {extended ? 'Perpanjang sekali (sudah dipakai)' : 'Perpanjang sekali (+10 menit)'}
                    </button>
                    <Link
                      href="/booking/sch-002/seat"
                      className="block w-full py-2 border border-borderCol hover:border-primary text-ink hover:text-primary text-xs font-bold rounded-input transition-colors"
                    >
                      Pilih ulang kursi
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted leading-relaxed">
              Jika perpanjangan sudah dipakai, tombol pertama nonaktif dan berbunyi &quot;Perpanjang sekali (sudah dipakai)&quot;. Jika terjadi saat pembayaran dan transfer sudah dikirim, kursi tetap ditahan sampai bank mengonfirmasi.
            </p>
          </div>

          {/* 3. Koneksi Terputus */}
          <div className="bg-white border border-borderCol rounded-card p-6 shadow-2xs space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <span className="text-xs font-bold text-muted uppercase tracking-wider block">
                3 · KONEKSI TERPUTUS
              </span>

              <div className="p-5 rounded-xl bg-info/10 border border-info/30 text-ink space-y-3">
                <div className="flex items-start gap-3">
                  <WifiOff size={22} className="text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-sm font-bold text-ink">
                      Koneksi terputus
                    </strong>
                    <p className="text-xs text-muted mt-0.5">
                      Pilihan kursimu masih tersimpan di perangkat ini. Kami mencoba menyambung lagi otomatis.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleReconnect}
                  disabled={isReconnecting || connectionSuccess}
                  className="px-4 py-2 bg-primary hover:bg-primary-dark disabled:bg-borderCol text-white text-xs font-bold rounded-input shadow-2xs transition-colors"
                >
                  {isReconnecting ? 'Menyambungkan...' : connectionSuccess ? 'Tersambung Kembali!' : 'Coba lagi'}
                </button>
              </div>

              {/* Frozen seats preview */}
              <div className="p-4 bg-surface/80 border border-dashed border-borderCol rounded-xl space-y-3 opacity-70">
                <div className="flex justify-center gap-2">
                  <span className="px-3 py-1.5 rounded-lg border border-borderCol bg-white text-xs font-mono font-bold">5A</span>
                  <span className="px-3 py-1.5 rounded-lg border border-borderCol bg-white text-xs font-mono font-bold">5B</span>
                  <span className="px-3 py-1.5 rounded-lg border border-borderCol bg-white text-xs font-mono font-bold">5C</span>
                  <span className="px-3 py-1.5 rounded-lg border border-borderCol bg-white text-xs font-mono font-bold">5D</span>
                </div>
                <button
                  type="button"
                  disabled
                  className="w-full py-2.5 bg-borderCol text-muted text-xs font-bold rounded-input cursor-not-allowed"
                >
                  Lanjut (menunggu koneksi)
                </button>
              </div>
            </div>

            <p className="text-xs text-muted leading-relaxed">
              Denah dibekukan · terakhir diperbarui 14:02. Memilih atau melepas kursi dinonaktifkan sampai tersambung.
            </p>
          </div>

          {/* 4. Kursi Habis */}
          <div className="bg-white border border-borderCol rounded-card p-6 shadow-2xs space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <span className="text-xs font-bold text-muted uppercase tracking-wider block">
                4 · KURSI HABIS
              </span>

              {/* Notice Card */}
              <div className="p-4 rounded-xl bg-surface border border-borderCol space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-red-50 text-error border border-red-200 text-xs font-bold">
                    ✕ Penuh
                  </span>
                  <span className="text-xs font-bold text-ink">14:00 → 17:30 · Nusa Trans</span>
                </div>
                <p className="text-xs text-muted">
                  Semua kursi terisi atau sedang ditahan. Kursi yang ditahan bisa kembali tersedia.
                </p>
              </div>

              {/* Alternate Schedules */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold text-ink block">Jadwal lain di hari yang sama</span>

                <div className="p-3 rounded-xl border border-borderCol flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-ink block">11:30 → 15:00</span>
                    <span className="text-[11px] text-warning font-semibold">Hampir penuh · sisa 3 kursi</span>
                  </div>
                  <Link
                    href="/booking/sch-003/seat"
                    className="px-3.5 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-input text-xs font-bold transition-colors"
                  >
                    Pilih
                  </Link>
                </div>

                <div className="p-3 rounded-xl border border-borderCol flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-ink block">19:00 → 22:30</span>
                    <span className="text-[11px] text-success font-semibold">Sisa 12 kursi</span>
                  </div>
                  <Link
                    href="/booking/sch-005/seat"
                    className="px-3.5 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-input text-xs font-bold transition-colors"
                  >
                    Pilih
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  href="/"
                  className="py-2 text-center border border-borderCol hover:border-primary text-ink hover:text-primary rounded-input text-xs font-bold transition-colors"
                >
                  Ubah tanggal
                </Link>
                <button
                  type="button"
                  className="py-2 border border-primary text-primary hover:bg-primary-tint/30 rounded-input text-xs font-bold transition-colors"
                >
                  Kabari saya jika ada kursi
                </button>
              </div>
            </div>

            <p className="text-xs text-muted leading-relaxed">
              Menyediakan alternatif cerdas secara otomatis untuk mencegah pengguna putus asa saat jadwal pilihan telah penuh.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
