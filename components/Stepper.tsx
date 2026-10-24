import { Check } from 'lucide-react'

const steps = [
  { label: 'Jadwal',    num: 1 },
  { label: 'Kursi',     num: 2 },
  { label: 'Penumpang', num: 3 },
  { label: 'Review',    num: 4 },
  { label: 'Bayar',     num: 5 },
  { label: 'E-tiket',   num: 6 },
]

export default function Stepper({ currentStep }: { currentStep: number }) {
  const currentStepObj = steps.find(s => s.num === currentStep) ?? steps[0]

  return (
    <div className="sticky top-16 z-40 w-full bg-white border-b border-borderCol py-2.5 sm:py-3 px-3.5 sm:px-8 shadow-2xs print:hidden">
      {/* ── Mobile Compact Stepper (screens < 640px) ────────────────── */}
      <div className="sm:hidden flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 relative z-20">
          <span className="px-2 py-0.5 rounded-full bg-primary-tint border border-primary/25 text-primary font-bold text-[11px] flex-shrink-0 relative z-20">
            {currentStep}/6
          </span>
          <span className="font-extrabold text-xs text-ink truncate">
            {currentStepObj.label}
          </span>
        </div>

        {/* 6-segment mini progress bar */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {steps.map(s => {
            const isDone = s.num < currentStep
            const isActive = s.num === currentStep
            return (
              <div
                key={s.num}
                className={`h-1.5 rounded-full transition-all ${
                  isActive
                    ? 'w-5 bg-primary'
                    : isDone
                    ? 'w-2.5 bg-success'
                    : 'w-2 bg-borderCol/70'
                }`}
                title={`Langkah ${s.num}: ${s.label}`}
              />
            )
          })}
        </div>
      </div>

      {/* ── Desktop & Tablet Full Stepper (screens >= 640px) ─────────── */}
      <div className="hidden sm:flex max-w-4xl mx-auto items-center justify-between overflow-x-auto no-scrollbar py-1">
        {steps.map((step, index) => {
          const isDone = step.num < currentStep
          const isActive = step.num === currentStep
          const isLast = index === steps.length - 1

          return (
            <div key={step.label} className="flex items-center flex-1 last:flex-initial">
              {/* Step indicator (Circle + Label on same line) */}
              <div className="flex items-center gap-2 flex-shrink-0 relative z-20">
                {isDone ? (
                  <div className="w-5 h-5 rounded-full bg-success text-white flex items-center justify-center text-xs font-bold shadow-xs relative z-20">
                    <Check size={12} strokeWidth={3} />
                  </div>
                ) : isActive ? (
                  <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold shadow-xs relative z-20">
                    {step.num}
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full border border-borderCol bg-white text-muted flex items-center justify-center text-xs font-semibold relative z-20">
                    {step.num}
                  </div>
                )}

                <span
                  className={`text-xs sm:text-sm font-semibold tracking-tight whitespace-nowrap ${
                    isActive ? 'text-ink font-bold' : isDone ? 'text-ink' : 'text-muted'
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div className="flex-1 px-3 sm:px-4 min-w-[20px]">
                  <div
                    className={`h-[1.5px] w-full transition-colors duration-300 ${
                      isDone ? 'bg-primary' : 'bg-borderCol'
                    }`}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
