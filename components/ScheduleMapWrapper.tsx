'use client'

import dynamic from 'next/dynamic'
import type { RouteMapProps } from './RouteMap'

// Client-only dynamic import (ssr: false) di dalam Client Component
const RouteMap = dynamic(() => import('./RouteMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[280px] sm:h-[380px] rounded-2xl bg-surface border border-borderCol animate-pulse flex items-center justify-center text-xs text-muted">
      Memuat peta rute interaktif...
    </div>
  ),
})

export default function ScheduleMapWrapper(props: RouteMapProps) {
  return <RouteMap {...props} />
}

