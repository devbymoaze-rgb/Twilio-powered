export function Logo({ className = "", light = false }: { className?: string; light?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
        <rect width="28" height="28" rx="8" fill={light ? "#3B82F6" : "#2563EB"} />
        <path
          d="M7 14.2c2.1-3.7 3.9-5.6 5.3-5.9 1.5-.3 2.3 1.5 3.1 5 .6 2.7 1.2 4 2.1 4 1.2 0 2.5-2.3 4-7"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
      <span
        className={`font-serif text-[17px] font-semibold tracking-tight ${light ? "text-white" : "text-ink"}`}
      >
        TextPulse
      </span>
    </div>
  );
}
