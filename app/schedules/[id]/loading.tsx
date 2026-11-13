import { MapPin, RefreshCw } from 'lucide-react'

export default function LoadingScheduleDetail() {
  return (
    <div className="min-h-screen bg-surface pb-20">
      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Tombol Kembali Skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-4 w-36 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
          <div className="h-4 w-20 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
        </div>

        {/* Header Jadwal Skeleton */}
        <div className="bg-white dark:bg-[#102434] border border-borderCol dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4 animate-pulse">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div className="space-y-2">
              <div className="h-4 w-32 bg-slate-200 dark:bg-white/10 rounded" />
              <div className="h-7 w-64 bg-slate-200 dark:bg-white/10 rounded" />
              <div className="h-4 w-40 bg-slate-200 dark:bg-white/10 rounded" />
            </div>
            <div className="h-8 w-28 bg-slate-200 dark:bg-white/10 rounded" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-borderCol/60 dark:border-white/10">
            <div className="h-10 bg-slate-100 dark:bg-white/5 rounded" />
            <div className="h-10 bg-slate-100 dark:bg-white/5 rounded" />
            <div className="h-10 bg-slate-100 dark:bg-white/5 rounded" />
            <div className="h-10 bg-slate-100 dark:bg-white/5 rounded" />
          </div>
        </div>

        {/* Peta Rute Placeholder Card */}
        <div className="bg-white dark:bg-[#102434] border border-borderCol dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-ink dark:text-white flex items-center gap-2">
                <MapPin size={18} className="text-primary animate-bounce" />
                <span>Memuat Peta Rute Perjalanan...</span>
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Menghubungkan titik koordinat terminal dan jalur rute
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold">
              <RefreshCw size={12} className="animate-spin" />
              <span>Memuat koordinat</span>
            </span>
          </div>

          {/* Map canvas skeleton */}
          <div className="w-full h-[360px] sm:h-[420px] rounded-xl bg-slate-100 dark:bg-slate-900 border border-borderCol/80 dark:border-white/10 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#0B6E78_1px,transparent_1px)] [background-size:16px_16px]" />
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-primary/15 text-primary flex items-center justify-center mb-3 animate-pulse">
                <MapPin size={24} />
              </div>
              <p className="text-sm font-bold text-ink dark:text-white">Menyiapkan Peta Interaktif</p>
              <p className="text-xs text-muted max-w-xs mt-1">
                Sedang memuat peta OpenStreetMap dan jalur antar terminal...
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
