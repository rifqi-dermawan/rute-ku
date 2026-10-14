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
  return (
    <div className="w-full bg-white border-b border-borderCol py-3 px-4 sm:px-8">
      <div className="max-w-4xl mx-auto flex items-center justify-between overflow-x-auto no-scrollbar py-1">
        {steps.map((step, index) => {
          const isDone = step.num < currentStep
          const isActive = step.num === currentStep
          const isLast = index === steps.length - 1

          return (
            <div key={step.label} className="flex items-center flex-1 last:flex-initial">
              {/* Step indicator (Circle + Label on same line) */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {isDone ? (
                  <div className="w-5 h-5 rounded-full bg-success text-white flex items-center justify-center text-xs font-bold shadow-xs">
                    <Check size={12} strokeWidth={3} />
                  </div>
                ) : isActive ? (
                  <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold shadow-xs">
                    {step.num}
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full border border-borderCol bg-white text-muted flex items-center justify-center text-xs font-semibold">
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
                <div className="flex-1 px-3 sm:px-4 min-w-[24px]">
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
