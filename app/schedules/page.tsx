'use client'

import { use, useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Stepper from '@/components/Stepper'
import { ArrowRight, SlidersHorizontal, Search, RefreshCw, X, AlertCircle } from 'lucide-react'

const CITIES = ['Jakarta', 'Bandung', 'Yogyakarta', 'Surabaya', 'Malang', 'Semarang', 'Solo', 'Denpasar']

/* ─── Mock Data ──────────────────────────────────────────────── */
const SCHEDULES = [
  {
    id: 'sch-001', dep: '05:30', arr: '09:00', dur: '3j30m',
    bus: 'Lintas Rasa', cls: 'Executive 2–2',
    fac: ['AC', 'Colokan', 'Bagasi 20 kg'],
    left: 14, price: 105000,
  },
  {
    id: 'sch-002', dep: '08:00', arr: '11:30', dur: '3j30m',
    bus: 'Nusa Trans', cls: 'Executive 2–2',
    fac: ['AC', 'Colokan', 'Bagasi 20 kg'],
    left: 21, price: 125000,
  },
  {
    id: 'sch-003', dep: '11:30', arr: '15:00', dur: '3j30m',
    bus: 'Cipta Wisata', cls: 'Executive 2–2',
    fac: ['AC', 'Colokan', 'Bagasi 20 kg'],
    left: 3, price: 125000,
  },
  {
    id: 'sch-004', dep: '14:00', arr: '17:30', dur: '3j30m',
    bus: 'Nusa Trans', cls: 'Executive 2–2',
    fac: ['AC', 'Colokan'],
    left: 0, price: 125000,
  },
  {
    id: 'sch-005', dep: '19:00', arr: '22:30', dur: '3j30m',
    bus: 'Lintas Rasa', cls: 'Sleeper 2–1',
    fac: ['AC', 'Colokan', 'Selimut'],
    left: 12, price: 165000,
  },
]

const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`

function seatBadge(left: number) {
  if (left === 0) return { label: '✕  Penuh', bg: 'bg-red-50 text-error border-red-200' }
  if (left <= 5)  return { label: `⚠ Hampir penuh · sisa ${left}`, bg: 'bg-warning/10 text-warning border-warning/30' }
  return { label: `Sisa ${left} kursi`, bg: 'bg-green-50 text-success border-green-200' }
}

/* ─── Page ───────────────────────────────────────────────────── */
function SchedulesContent({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; date?: string; passengers?: string }>
}) {
  const sp = use(searchParams)
  const from       = sp.from       ?? ''
  const to         = sp.to         ?? ''
  const date       = sp.date       ?? ''
  const passengers = sp.passengers ?? ''

  const router = useRouter()

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('ruteku_last_schedule_id')
      } catch {}
    }
  }, [])

  // Inline search modification panel
  const isSearchIncomplete = !from || !to || !date || !passengers
  const [isEditingSearch, setIsEditingSearch] = useState(!from || !to || !date || !passengers)
  const [editFrom, setEditFrom] = useState(from)
  const [editTo, setEditTo] = useState(to)
  const [editDate, setEditDate] = useState(date)
  const [editPassengers, setEditPassengers] = useState(passengers)
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})
  const [validationWarning, setValidationWarning] = useState<string | null>(
    !from || !to || !date || !passengers
      ? 'Kota asal, tujuan, tanggal berangkat, dan jumlah penumpang wajib diisi terlebih dahulu sebelum memilih jadwal bus.'
      : null
  )

  useEffect(() => {
    setEditFrom(from)
    setEditTo(to)
    setEditDate(date)
    setEditPassengers(passengers)
    if (!from || !to || !date || !passengers) {
      setIsEditingSearch(true)
      setValidationWarning('Kota asal, tujuan, tanggal berangkat, dan jumlah penumpang wajib diisi terlebih dahulu sebelum memilih jadwal bus.')
    } else {
      setValidationWarning(null)
      setEditErrors({})
    }
  }, [from, to, date, passengers])

  // Filter state
  const [timeFilter,  setTimeFilter]  = useState<'pagi' | 'siang' | 'sore' | null>(null)
  const [classFilter, setClassFilter] = useState<'exec' | 'sleep' | null>(null)
  const [sort,        setSort]        = useState('earliest')

  const handleTimeChange = (slot: 'pagi' | 'siang' | 'sore', checked: boolean) => {
    // Hanya 1 jam berangkat yang bisa dicentang; jika memilih opsi lain berpindah ke yang terakhir diklik
    setTimeFilter(checked ? slot : null)
  }

  const handleClassChange = (cls: 'exec' | 'sleep', checked: boolean) => {
    // Hanya 1 kelas bus yang bisa dicentang; jika memilih opsi lain berpindah ke yang terakhir diklik
    setClassFilter(checked ? cls : null)
  }

  const fmtDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })
    } catch { return d }
  }

  const handleApplyNewSearch = (e: React.FormEvent) => {
    e.preventDefault()

    const errs: Record<string, string> = {}
    if (!editFrom.trim()) errs['from'] = 'Kota asal wajib diisi terlebih dahulu'
    if (!editTo.trim()) errs['to'] = 'Kota tujuan wajib diisi terlebih dahulu'
    else if (editFrom && editTo && editFrom === editTo) {
      errs['to'] = 'Kota asal dan tujuan tidak boleh sama'
    }
    if (!editDate.trim()) errs['date'] = 'Tanggal berangkat wajib diisi terlebih dahulu'
    if (!editPassengers || String(editPassengers).trim() === '') {
      errs['passengers'] = 'Jumlah penumpang wajib diisi terlebih dahulu'
    }

    setEditErrors(errs)

    if (Object.keys(errs).length > 0) {
      setValidationWarning('Kota asal, tujuan, tanggal berangkat, dan jumlah penumpang wajib diisi terlebih dahulu sebelum mencari jadwal bus.')
      return
    }

    setEditErrors({})
    setValidationWarning(null)
    setIsEditingSearch(false)
    router.push(
      `/schedules?from=${encodeURIComponent(editFrom)}&to=${encodeURIComponent(editTo)}&date=${encodeURIComponent(editDate)}&passengers=${encodeURIComponent(editPassengers)}`
    )
  }

  const handleSelectSchedule = (s: typeof SCHEDULES[0]) => {
    if (s.left === 0) return

    const isMissing = !from || !to || !date || !passengers
    if (isMissing) {
      const errs: Record<string, string> = {}
      if (!editFrom.trim()) errs['from'] = 'Kota asal wajib diisi terlebih dahulu'
      if (!editTo.trim()) errs['to'] = 'Kota tujuan wajib diisi terlebih dahulu'
      else if (editFrom && editTo && editFrom === editTo) {
        errs['to'] = 'Kota asal dan tujuan tidak boleh sama'
      }
      if (!editDate.trim()) errs['date'] = 'Tanggal berangkat wajib diisi terlebih dahulu'
      if (!editPassengers || String(editPassengers).trim() === '') {
        errs['passengers'] = 'Jumlah penumpang wajib diisi terlebih dahulu'
      }

      setEditErrors(errs)
      setValidationWarning('Kota asal, tujuan, tanggal berangkat, dan jumlah penumpang wajib diisi terlebih dahulu sebelum memilih jadwal bus.')
      setIsEditingSearch(true)
      const banner = document.getElementById('schedules-validation-banner')
      if (banner) {
        banner.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
      return // BLOCKS NAVIGATION
    }

    router.push(
      `/booking/${s.id}/seat?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${encodeURIComponent(date)}&passengers=${encodeURIComponent(passengers)}&dep=${encodeURIComponent(s.dep)}&arr=${encodeURIComponent(s.arr)}&dur=${encodeURIComponent(s.dur)}&bus=${encodeURIComponent(s.bus)}&cls=${encodeURIComponent(s.cls)}&price=${s.price}`
    )
  }

  const filtered = SCHEDULES.filter(s => {
    const h = parseInt(s.dep)
    if (timeFilter === 'pagi'  && !(h >= 5  && h < 11)) return false
    if (timeFilter === 'siang' && !(h >= 11 && h < 15)) return false
    if (timeFilter === 'sore'  && !(h >= 15))           return false
    if (classFilter === 'exec'  && !s.cls.includes('Executive')) return false
    if (classFilter === 'sleep' && !s.cls.includes('Sleeper'))   return false
    return true
  }).sort((a, b) => {
    if (sort === 'cheapest') return a.price - b.price
    if (sort === 'seats')    return b.left - a.left
    return a.dep.localeCompare(b.dep)
  })

  const resetFilter = () => {
    setTimeFilter(null)
    setClassFilter(null)
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-surface pb-12" suppressHydrationWarning>
        <Stepper currentStep={1} />
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-5 flex items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-ink flex items-center gap-2 flex-wrap">
              {from} <ArrowRight size={18} className="text-muted flex-shrink-0" /> {to}
            </h1>
            <p className="text-sm text-muted mt-0.5" suppressHydrationWarning>
              {passengers} penumpang
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface pb-12" suppressHydrationWarning>
      <Stepper currentStep={1} />

      {/* ── Route header ─────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-5 flex items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-ink flex items-center gap-2 flex-wrap">
            {from && to ? (
              <>
                {from} <ArrowRight size={18} className="text-muted flex-shrink-0" /> {to}
              </>
            ) : (
              'Pilih Rute & Jadwal Bus'
            )}
          </h1>
          <p className="text-sm text-muted mt-0.5" suppressHydrationWarning>
            {date ? fmtDate(date) : 'Tanggal belum dipilih'} · {passengers ? `${passengers} penumpang` : 'Penumpang belum dipilih'}
          </p>
        </div>
        <button
          type="button"
          suppressHydrationWarning
          onClick={() => setIsEditingSearch(!isEditingSearch)}
          className={`flex-shrink-0 px-4 py-2 text-sm font-semibold rounded-full transition-all border ${
            isEditingSearch
              ? 'bg-ink text-white border-ink'
              : 'border-primary text-primary hover:bg-primary-tint/40'
          }`}
        >
          {isEditingSearch ? '✕ Tutup form' : 'Ubah pencarian'}
        </button>
      </div>

      {/* ── Validation Warning Banner ────────────────────────── */}
      {validationWarning && (
        <div id="schedules-validation-banner" className="max-w-5xl mx-auto px-4 sm:px-8 mb-4 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="p-4 rounded-xl bg-red-50 border-2 border-red-300 text-red-900 shadow-2xs flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-sm text-red-950">
                Wajib Diisi Terlebih Dahulu
              </p>
              <p className="text-red-800 leading-relaxed">
                {validationWarning}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Inline Search Editor Panel ───────────────────────── */}
      {isEditingSearch && (
        <div className="max-w-5xl mx-auto px-4 sm:px-8 mb-6 animate-in fade-in slide-in-from-top-2 duration-200">
          <form
            onSubmit={handleApplyNewSearch}
            className="bg-white border-2 border-primary/40 rounded-2xl p-5 shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between border-b border-borderCol pb-2.5">
              <span className="font-bold text-sm text-ink flex items-center gap-2">
                <Search size={16} className="text-primary" />
                Ubah Kota Asal, Tujuan, Tanggal, &amp; Penumpang
              </span>
              <span className="text-xs text-muted">Hasil jadwal akan diperbarui otomatis</span>
            </div>

            {Object.keys(editErrors).length > 0 && (
              <div className="p-3 bg-red-50 border border-red-300 rounded-xl text-xs text-red-900 flex items-center gap-2">
                <AlertCircle size={15} className="text-red-600 flex-shrink-0" />
                <span className="font-semibold">Wajib diisi terlebih dahulu: Mohon lengkapi seluruh kolom yang ditandai merah.</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Dari <span className="text-error">*</span>
                </label>
                <select
                  value={editFrom}
                  onChange={e => {
                    setEditFrom(e.target.value)
                    if (editErrors['from']) setEditErrors(prev => ({ ...prev, from: '' }))
                  }}
                  className={`w-full h-10 px-3 border rounded-xl bg-surface text-ink text-sm font-semibold outline-none transition-all ${
                    editErrors['from'] ? 'border-error ring-1 ring-error' : 'border-borderCol focus:border-primary'
                  }`}
                >
                  <option value="">Pilih kota asal</option>
                  {CITIES.map(c => (
                    <option key={c} value={c} disabled={c === editTo}>{c}</option>
                  ))}
                </select>
                {editErrors['from'] && (
                  <p className="text-[11px] text-error font-medium mt-1">{editErrors['from']}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Ke <span className="text-error">*</span>
                </label>
                <select
                  value={editTo}
                  onChange={e => {
                    setEditTo(e.target.value)
                    if (editErrors['to']) setEditErrors(prev => ({ ...prev, to: '' }))
                  }}
                  className={`w-full h-10 px-3 border rounded-xl bg-surface text-ink text-sm font-semibold outline-none transition-all ${
                    editErrors['to'] ? 'border-error ring-1 ring-error' : 'border-borderCol focus:border-primary'
                  }`}
                >
                  <option value="">Pilih kota tujuan</option>
                  {CITIES.map(c => (
                    <option key={c} value={c} disabled={c === editFrom}>{c}</option>
                  ))}
                </select>
                {editErrors['to'] && (
                  <p className="text-[11px] text-error font-medium mt-1">{editErrors['to']}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Tanggal <span className="text-error">*</span>
                </label>
                <input
                  type="date"
                  value={editDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => {
                    setEditDate(e.target.value)
                    if (editErrors['date']) setEditErrors(prev => ({ ...prev, date: '' }))
                  }}
                  className={`w-full h-10 px-3 border rounded-xl bg-surface text-ink text-sm font-semibold outline-none transition-all ${
                    editErrors['date'] ? 'border-error ring-1 ring-error' : 'border-borderCol focus:border-primary'
                  }`}
                />
                {editErrors['date'] && (
                  <p className="text-[11px] text-error font-medium mt-1">{editErrors['date']}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Penumpang <span className="text-error">*</span>
                </label>
                <select
                  value={editPassengers}
                  onChange={e => {
                    setEditPassengers(e.target.value)
                    if (editErrors['passengers']) setEditErrors(prev => ({ ...prev, passengers: '' }))
                  }}
                  className={`w-full h-10 px-3 border rounded-xl bg-surface text-ink text-sm font-semibold outline-none transition-all ${
                    editErrors['passengers'] ? 'border-error ring-1 ring-error' : 'border-borderCol focus:border-primary'
                  }`}
                >
                  <option value="">Pilih penumpang</option>
                  <option value="1">1 orang</option>
                  <option value="2">2 orang</option>
                  <option value="3">3 orang</option>
                  <option value="4">4 orang</option>
                </select>
                {editErrors['passengers'] && (
                  <p className="text-[11px] text-error font-medium mt-1">{editErrors['passengers']}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-borderCol">
              <button
                type="button"
                onClick={() => router.push(`/?from=${encodeURIComponent(editFrom)}&to=${encodeURIComponent(editTo)}&date=${editDate}&passengers=${editPassengers}`)}
                className="text-xs font-semibold text-primary hover:underline"
              >
                ← Buka form lengkap di Beranda
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingSearch(false)}
                  className="px-4 py-2 border border-borderCol rounded-xl text-xs font-semibold text-muted hover:text-ink transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-primary-dark text-white font-bold text-xs rounded-xl shadow-xs transition"
                >
                  Terapkan Jadwal Baru
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-8 flex gap-5 items-start">
        {/* ── Filter sidebar ───────────────────────────────── */}
        <aside className="hidden md:block w-52 flex-shrink-0 bg-white border border-borderCol rounded-card p-4 sticky top-20">
          <h2 className="font-bold text-ink mb-4 flex items-center gap-2 text-sm">
            <SlidersHorizontal size={14} /> Filter
          </h2>

          <FilterGroup label="Jam berangkat">
            {[
              { id: 'pagi',  label: 'Pagi (05:00–11:00)' },
              { id: 'siang', label: 'Siang (11:00–15:00)' },
              { id: 'sore',  label: 'Sore & malam (15:00–24:00)' },
            ].map(({ id, label }) => (
              <CheckItem
                key={id}
                label={label}
                checked={timeFilter === id}
                onChange={checked => handleTimeChange(id as 'pagi' | 'siang' | 'sore', checked)}
              />
            ))}
          </FilterGroup>

          <FilterGroup label="Kelas bus">
            {[
              { id: 'exec',  label: 'Executive (2–2)' },
              { id: 'sleep', label: 'Sleeper (2–1)' },
            ].map(({ id, label }) => (
              <CheckItem
                key={id}
                label={label}
                checked={classFilter === id}
                onChange={checked => handleClassChange(id as 'exec' | 'sleep', checked)}
              />
            ))}
          </FilterGroup>

          <button
            type="button"
            suppressHydrationWarning
            onClick={resetFilter}
            className="text-xs font-semibold text-primary hover:underline mt-1"
          >
            Reset filter
          </button>
        </aside>

        {/* ── Schedule list ────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* Mobile Filter Bar (Visible on mobile < md) */}
          <div className="md:hidden mb-4">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 no-scrollbar text-xs">
              <span className="text-muted font-bold flex items-center gap-1 flex-shrink-0 mr-0.5">
                <SlidersHorizontal size={12} /> Filter:
              </span>
              <button
                type="button"
                onClick={() => setTimeFilter(timeFilter === 'pagi' ? null : 'pagi')}
                className={`px-3 py-1.5 rounded-full border flex-shrink-0 transition-all font-semibold ${
                  timeFilter === 'pagi'
                    ? 'bg-primary text-white border-primary shadow-xs'
                    : 'bg-white text-ink border-borderCol hover:border-primary/50'
                }`}
              >
                Pagi (05-11)
              </button>
              <button
                type="button"
                onClick={() => setTimeFilter(timeFilter === 'siang' ? null : 'siang')}
                className={`px-3 py-1.5 rounded-full border flex-shrink-0 transition-all font-semibold ${
                  timeFilter === 'siang'
                    ? 'bg-primary text-white border-primary shadow-xs'
                    : 'bg-white text-ink border-borderCol hover:border-primary/50'
                }`}
              >
                Siang (11-15)
              </button>
              <button
                type="button"
                onClick={() => setTimeFilter(timeFilter === 'sore' ? null : 'sore')}
                className={`px-3 py-1.5 rounded-full border flex-shrink-0 transition-all font-semibold ${
                  timeFilter === 'sore'
                    ? 'bg-primary text-white border-primary shadow-xs'
                    : 'bg-white text-ink border-borderCol hover:border-primary/50'
                }`}
              >
                Sore/Malam (15-24)
              </button>
              <button
                type="button"
                onClick={() => setClassFilter(classFilter === 'exec' ? null : 'exec')}
                className={`px-3 py-1.5 rounded-full border flex-shrink-0 transition-all font-semibold ${
                  classFilter === 'exec'
                    ? 'bg-primary text-white border-primary shadow-xs'
                    : 'bg-white text-ink border-borderCol hover:border-primary/50'
                }`}
              >
                Executive
              </button>
              <button
                type="button"
                onClick={() => setClassFilter(classFilter === 'sleep' ? null : 'sleep')}
                className={`px-3 py-1.5 rounded-full border flex-shrink-0 transition-all font-semibold ${
                  classFilter === 'sleep'
                    ? 'bg-primary text-white border-primary shadow-xs'
                    : 'bg-white text-ink border-borderCol hover:border-primary/50'
                }`}
              >
                Sleeper
              </button>
              {(timeFilter || classFilter) && (
                <button
                  type="button"
                  onClick={resetFilter}
                  className="px-2.5 py-1.5 text-xs text-error font-bold flex-shrink-0 hover:underline"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <p className="text-xs sm:text-sm font-medium text-muted">
              {filtered.length} jadwal ditemukan
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm text-muted">Urutkan</span>
              <select
                suppressHydrationWarning
                value={sort} onChange={e => setSort(e.target.value)}
                className="text-xs sm:text-sm border border-borderCol rounded-input px-2.5 sm:px-3 h-8 sm:h-9 bg-white outline-none focus:border-primary"
              >
                <option value="earliest">Berangkat paling awal</option>
                <option value="cheapest">Harga termurah</option>
                <option value="seats">Kursi terbanyak</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {filtered.map(s => {
              const badge  = seatBadge(s.left)
              const isFull = s.left === 0
              return (
                <div
                  key={s.id}
                  onClick={() => {
                    if (!isFull) {
                      handleSelectSchedule(s)
                    }
                  }}
                  className={`bg-white border border-borderCol rounded-card p-4 sm:p-5 transition-all ${
                    isFull ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50 hover:shadow-sm'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-5">
                    {/* Time & Bus info */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-xl sm:text-2xl font-black text-ink">{s.dep}</span>
                        <span className="text-xs sm:text-sm text-muted font-medium">→ {s.arr}</span>
                        <span className="text-xs text-muted">· {s.dur}</span>
                      </div>
                      <p className="font-bold text-ink text-sm">{s.bus} · <span className="text-muted font-semibold">{s.cls}</span></p>
                      <p className="text-xs text-muted">{s.fac.join(' · ')}</p>
                      {isFull && <p className="text-xs text-error font-medium mt-1">Semua kursi terisi atau ditahan</p>}
                    </div>

                    {/* Price, Badge & Action button */}
                    <div className="pt-2 sm:pt-0 border-t sm:border-t-0 border-borderCol/60 flex items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-2 sm:gap-2.5 flex-shrink-0">
                      <div className="flex flex-col sm:items-end">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border mb-1 self-start sm:self-auto ${badge.bg}`}>
                          {badge.label}
                        </span>
                        {!isFull && (
                          <div>
                            <span className="text-base sm:text-lg font-black text-ink">{fmt(s.price)}</span>
                            <span className="text-[11px] text-muted ml-1 sm:ml-0 sm:block sm:text-right">/kursi</span>
                          </div>
                        )}
                      </div>

                      {isFull ? (
                        <div className="flex gap-2 items-center">
                          <button
                            type="button"
                            disabled
                            suppressHydrationWarning
                            className="px-3.5 py-1.5 text-xs sm:text-sm font-semibold border border-borderCol text-muted rounded-input cursor-not-allowed"
                          >
                            Penuh
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          suppressHydrationWarning
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSelectSchedule(s)
                          }}
                          className="px-5 py-2 bg-primary hover:bg-primary-dark text-white font-bold text-xs sm:text-sm rounded-input transition-colors cursor-pointer shadow-xs"
                        >
                          Pilih
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SchedulesPage(props: {
  searchParams: Promise<{ from?: string; to?: string; date?: string; passengers?: string }>
}) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface p-8 text-center text-muted">Memuat jadwal bus...</div>}>
      <SchedulesContent {...props} />
    </Suspense>
  )
}

/* ─── Helpers ────────────────────────────────────────────────── */
function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2">{label}</p>
      {children}
    </div>
  )
}

function CheckItem({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-2 text-sm text-ink mb-2 cursor-pointer leading-snug">
      <input
        type="checkbox"
        suppressHydrationWarning
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="mt-0.5 accent-primary"
      />
      {label}
    </label>
  )
}
