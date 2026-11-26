'use client'

import React from 'react'
import { Calendar } from 'lucide-react'

interface DateInputProps {
  value: string
  min?: string
  onChange: (value: string) => void
  hasError?: boolean
  placeholder?: string
  ariaLabel?: string
  mobileBoxClassName?: string
  desktopClassName?: string
}

/** Formats an ISO date string (YYYY-MM-DD) for mobile display in Indonesian locale. */
function formatDisplayDate(isoDate: string): string {
  if (!isoDate) return ''
  const parts = isoDate.split('-')
  if (parts.length !== 3) return isoDate
  const [year, month, day] = parts.map(Number)
  const parsed = new Date(year, month - 1, day)
  if (Number.isNaN(parsed.getTime())) return isoDate
  return parsed.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Date input that keeps the native desktop input unchanged while rendering
 * a strict-width container on mobile so native date controls never overflow.
 */
export default function DateInput({
  value,
  min,
  onChange,
  hasError = false,
  placeholder = 'Pilih tanggal',
  ariaLabel = 'Tanggal berangkat',
  mobileBoxClassName = 'h-11 px-3.5 rounded-input bg-white',
  desktopClassName = 'h-11 sm:h-12 px-3.5 rounded-input bg-white',
}: DateInputProps) {
  const borderClass = hasError
    ? 'border-error bg-red-50/20 ring-1 ring-error focus:ring-error focus-within:ring-error'
    : 'border-borderCol focus:border-primary focus:ring-1 focus:ring-primary focus-within:border-primary focus-within:ring-1 focus-within:ring-primary'

  return (
    <>
      {/* Mobile (< 640px): strict-width wrapper prevents native input[type="date"] overflow */}
      <div
        className={`sm:hidden relative w-full min-w-0 border flex items-center justify-between gap-2 overflow-hidden transition-all ${mobileBoxClassName} ${borderClass}`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
          <span className={`text-sm truncate ${value ? 'font-semibold text-ink' : 'font-normal text-muted'}`}>
            {value ? formatDisplayDate(value) : placeholder}
          </span>
        </div>
        <input
          type="date"
          aria-label={ariaLabel}
          value={value}
          min={min}
          onChange={e => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
      </div>

      {/* Desktop (>= 640px): standard native date input */}
      <input
        type="date"
        aria-label={ariaLabel}
        value={value}
        min={min}
        onChange={e => onChange(e.target.value)}
        className={`hidden sm:block w-full border text-ink font-semibold text-sm outline-none transition-all cursor-pointer ${desktopClassName} ${borderClass}`}
      />
    </>
  )
}
