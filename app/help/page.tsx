'use client'

import { useState } from 'react'
import { Check, Clock, Ban, Search, Plus, Minus, MessageSquare, Mail, X } from 'lucide-react'

const FAQS = [
  {
    q: 'Kursi yang saya pilih tiba-tiba hilang. Kenapa?',
    a: 'Ada pengguna lain yang berhasil menahan kursi itu lebih dulu. Kami akan menampilkan pesan dan tiga kursi kosong terdekat. Kursi lain yang sudah kamu pilih tetap aman.',
    defaultOpen: true,
  },
  {
    q: 'Waktu tahan habis saat saya mengisi data. Apa yang terjadi?',
    a: 'Kursi akan dilepas kembali ke sistem untuk pengguna lain. Namun, data formulir penumpang yang sudah kamu ketik tidak hilang sehingga kamu bisa memilih kursi lagi dengan cepat.',
    defaultOpen: false,
  },
  {
    q: 'Saya sudah bayar, tapi e-tiket belum muncul.',
    a: 'Sistem kami mengecek konfirmasi bank setiap 5 detik. Jika dalam 2 menit tiket belum terbit, cek status di menu Riwayat Booking atau hubungi tim bantuan kami.',
    defaultOpen: false,
  },
  {
    q: 'Bagaimana cara membatalkan dan berapa refund-nya?',
    a: 'Pembatalan >24 jam sebelum berangkat mendapatkan refund 90%. Pembatalan 2–24 jam mendapatkan refund 50%. Kurang dari 2 jam sebelum berangkat tidak dapat di-refund.',
    defaultOpen: false,
  },
  {
    q: 'Bagaimana cara memilih kursi bus?',
    a: 'Anda dapat langsung memilih kursi yang berstatus "Tersedia" pada denah bus interaktif sesuai jumlah penumpang yang dipesan.',
    defaultOpen: false,
  },
]

export default function HelpPage() {
  const [search, setSearch] = useState('')
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const toggleAccordion = (idx: number) => {
    setOpenIndex(prev => (prev === idx ? null : idx))
  }

  const filteredFaqs = FAQS.filter(
    f => f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-surface pb-20">
      <main className="max-w-4xl mx-auto px-3.5 sm:px-8 py-3.5 sm:py-8 space-y-3.5 sm:space-y-7">
        {/* Title & Search */}
        <div>
          <h1 className="text-xl sm:text-3xl font-black text-ink tracking-tight">
            Ada yang bisa dibantu?
          </h1>

          <div className="mt-4 flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Contoh: kursi hilang, refund, timer"
                className="w-full h-11 px-4 border border-borderCol rounded-input text-ink text-sm bg-white focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            <button
              type="button"
              className="px-6 h-11 bg-primary hover:bg-primary-dark text-white font-bold text-sm rounded-input shadow-2xs transition-colors"
            >
              Cari
            </button>
          </div>
        </div>

        {/* Section 1: Arti Warna & Simbol Kursi */}
        <div className="bg-white border border-borderCol rounded-card p-3.5 sm:p-6 shadow-2xs space-y-3.5 sm:space-y-4">
          <h2 className="text-base font-bold text-ink">Arti warna dan simbol kursi</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {/* Tersedia */}
            <div className="flex items-start gap-3 p-3 rounded-xl border border-borderCol bg-white">
              <div className="w-8 h-8 rounded-lg border border-borderCol bg-white flex-shrink-0" />
              <p className="text-xs text-ink leading-snug">
                <strong className="font-bold">Tersedia.</strong> Bisa kamu pilih.
              </p>
            </div>

            {/* Dipilih */}
            <div className="flex items-start gap-3 p-3 rounded-xl border border-primary/30 bg-primary-tint/40">
              <div className="w-8 h-8 rounded-lg bg-[#4F46E5] text-white flex items-center justify-center flex-shrink-0 shadow-2xs">
                <Check size={14} strokeWidth={3} />
              </div>
              <p className="text-xs text-ink leading-snug">
                <strong className="font-bold">Dipilih (saya).</strong> Kursi yang kamu tahan.
              </p>
            </div>

            {/* Ditahan */}
            <div className="flex items-start gap-3 p-3 rounded-xl border border-[#EDADD6] bg-[#FDF2FA]/60">
              <div className="w-8 h-8 rounded-lg bg-[#FDF2FA] border border-[#EDADD6] text-[#C11574] flex items-center justify-center flex-shrink-0">
                <Clock size={14} />
              </div>
              <p className="text-xs text-ink leading-snug">
                <strong className="font-bold">Ditahan.</strong> Dipegang orang lain selama maksimal 10 menit; bisa tersedia lagi.
              </p>
            </div>

            {/* Terisi */}
            <div className="flex items-start gap-3 p-3 rounded-xl border border-borderCol bg-surface">
              <div className="w-8 h-8 rounded-lg bg-[#0F2A33] text-white flex items-center justify-center flex-shrink-0">
                <X size={14} strokeWidth={2.5} />
              </div>
              <p className="text-xs text-ink leading-snug">
                <strong className="font-bold">Terisi.</strong> Sudah dibayar, tidak bisa dipilih.
              </p>
            </div>

            {/* Tidak tersedia */}
            <div className="flex items-start gap-3 p-3 rounded-xl border border-dashed border-borderCol bg-white">
              <div className="w-8 h-8 rounded-lg bg-surface border border-dashed border-borderCol text-muted flex items-center justify-center flex-shrink-0">
                <Ban size={14} />
              </div>
              <p className="text-xs text-ink leading-snug">
                <strong className="font-bold">Tidak tersedia.</strong> Tidak dijual untuk jadwal ini.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Aturan Tahan Kursi 10 Menit */}
        <div className="bg-[#EBF5F6] border border-primary/20 rounded-card p-3.5 sm:p-6 text-ink space-y-2.5 sm:space-y-3">
          <h2 className="text-base font-bold text-ink">Aturan tahan kursi 10 menit</h2>
          <ul className="space-y-2 text-xs sm:text-sm text-ink leading-relaxed list-disc list-inside">
            <li>Begitu kamu memilih kursi, kursi itu ditahan 10 menit. Orang lain tidak bisa mengambilnya.</li>
            <li>Timer selalu terlihat di pojok atas dan di ringkasan pesanan.</li>
            <li>Jika waktu habis, kamu bisa memperpanjang satu kali (+10 menit) atau memilih ulang. Data penumpang tetap tersimpan.</li>
            <li>Kursi baru resmi milikmu setelah pembayaran berhasil.</li>
          </ul>
        </div>

        {/* Section 3: Pertanyaan yang sering muncul */}
        <div className="bg-white border border-borderCol rounded-card overflow-hidden shadow-2xs">
          <div className="p-3.5 sm:p-6 border-b border-borderCol">
            <h2 className="text-base font-bold text-ink">Pertanyaan yang sering muncul</h2>
          </div>

          <div className="divide-y divide-borderCol">
            {filteredFaqs.map((faq, idx) => {
              const isOpen = openIndex === idx
              return (
                <div key={faq.q} className="p-3.5 sm:p-6">
                  <button
                    type="button"
                    onClick={() => toggleAccordion(idx)}
                    className="w-full flex items-center justify-between text-left gap-4"
                  >
                    <span className="font-bold text-sm text-ink">{faq.q}</span>
                    <span className="text-primary flex-shrink-0">
                      {isOpen ? <Minus size={18} /> : <Plus size={18} />}
                    </span>
                  </button>

                  {isOpen && (
                    <p className="mt-3 text-xs sm:text-sm text-muted leading-relaxed pr-6">
                      {faq.a}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Section 4: Masih butuh bantuan? */}
        <div className="bg-white border border-borderCol rounded-card p-3.5 sm:p-6 shadow-2xs space-y-3.5 sm:space-y-4">
          <h2 className="text-base font-bold text-ink">Masih butuh bantuan?</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-borderCol flex items-start gap-3 hover:border-primary transition-colors cursor-pointer">
              <div className="w-9 h-9 rounded-lg bg-green-50 text-success border border-green-200 flex items-center justify-center flex-shrink-0">
                <MessageSquare size={18} />
              </div>
              <div>
                <span className="font-bold text-sm text-ink block">WhatsApp</span>
                <span className="text-xs text-muted block mt-0.5">+62 812-9988-7766</span>
                <span className="text-[11px] text-muted block mt-1">Setiap hari 07:00–22:00</span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-borderCol flex items-start gap-3 hover:border-primary transition-colors cursor-pointer">
              <div className="w-9 h-9 rounded-lg bg-info/10 text-info border border-info/30 flex items-center justify-center flex-shrink-0">
                <Mail size={18} />
              </div>
              <div>
                <span className="font-bold text-sm text-ink block">Email</span>
                <span className="text-xs text-muted block mt-0.5">bantuan@ruteku.id</span>
                <span className="text-[11px] text-muted block mt-1">Dibalas dalam 1 hari kerja</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted pt-1">
            Sertakan kode booking (contoh RK-7Q4M2X) agar lebih cepat dibantu.
          </p>
        </div>
      </main>
    </div>
  )
}
