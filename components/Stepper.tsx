import { Check } from 'lucide-react';

const steps = [
  { label: 'Jadwal',    num: 1 },
  { label: 'Kursi',     num: 2 },
  { label: 'Penumpang', num: 3 },
  { label: 'Review',    num: 4 },
  { label: 'Bayar',     num: 5 },
  { label: 'E-tiket',   num: 6 },
];

export default function Stepper({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center overflow-x-auto gap-0 py-4 px-4 bg-white border-b border-borderCol">
      {steps.map((step, index) => {
        const isActive = currentStep === step.num;
        const isPast   = currentStep > step.num;
        const isLast   = index === steps.length - 1;

        return (
          <div key={step.label} className="flex items-center">
            {/* Lingkaran + Label */}
            <div className="flex flex-col items-center gap-1 min-w-[52px]">
              <div
                className={`
                  flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold
                  transition-all duration-300
                  ${isPast   ? 'bg-primary text-white shadow-sm'                  : ''}
                  ${isActive ? 'bg-primary text-white ring-4 ring-primary/20 shadow-md scale-110' : ''}
                  ${!isPast && !isActive ? 'bg-surface text-muted border border-borderCol' : ''}
                `}
              >
                {isPast ? <Check size={13} strokeWidth={3} /> : step.num}
              </div>
              <span
                className={`
                  text-[11px] font-semibold text-center leading-none whitespace-nowrap
                  ${isActive ? 'text-primary' : isPast ? 'text-ink' : 'text-muted'}
                `}
              >
                {step.label}
              </span>
            </div>

            {/* Garis penghubung antar step */}
            {!isLast && (
              <div
                className={`
                  w-8 sm:w-12 h-px mx-1 mb-4 flex-shrink-0 transition-all duration-300
                  ${isPast ? 'bg-primary' : 'bg-borderCol'}
                `}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
