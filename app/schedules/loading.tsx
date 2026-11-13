import Stepper from '@/components/Stepper'
import { RefreshCw } from 'lucide-react'

export default function LoadingSchedules() {
  return (
    <div className="min-h-screen bg-surface pb-12">
      <Stepper currentStep={1} />

      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-5 flex items-start sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-64 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
          <div className="h-4 w-36 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-8 space-y-3">
        <div className="bg-white dark:bg-[#102434] border border-borderCol dark:border-white/10 rounded-2xl p-10 text-center shadow-xs">
          <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-ink dark:text-white">Mencari Jadwal Bus...</p>
          <p className="text-xs text-muted mt-1">Mengambil rute tercepat dan ketersediaan kursi realtime</p>
        </div>

        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-[#102434] border border-borderCol dark:border-white/10 rounded-card p-4 sm:p-5 animate-pulse space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-6 w-48 bg-slate-200 dark:bg-white/10 rounded" />
              <div className="h-6 w-24 bg-slate-200 dark:bg-white/10 rounded" />
            </div>
            <div className="h-4 w-72 bg-slate-100 dark:bg-white/5 rounded" />
            <div className="flex items-center justify-between pt-2 border-t border-borderCol/60 dark:border-white/10">
              <div className="h-4 w-28 bg-slate-100 dark:bg-white/5 rounded" />
              <div className="h-8 w-20 bg-slate-200 dark:bg-white/10 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

