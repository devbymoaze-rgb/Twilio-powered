export function HeroBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-16 top-8 h-72 w-72 rounded-[28px] bg-pulse/10 blur-2xl" />
      <div className="absolute right-[-4%] top-16 h-80 w-80 rounded-[32px] bg-pulse/12 blur-2xl" />
      <div className="absolute left-[8%] top-20 h-24 w-24 rounded-2xl border border-pulse/15 bg-white/60" />
      <div className="absolute left-[18%] bottom-16 h-16 w-40 rounded-2xl bg-pulse/8" />
      <div className="absolute right-[42%] top-12 h-14 w-14 rounded-xl bg-pulse/10" />
      <div className="absolute right-[6%] bottom-20 h-28 w-28 rounded-2xl border border-stone-200 bg-white/70" />
      <div className="absolute right-[22%] top-[38%] h-10 w-24 rounded-xl bg-ink/5" />
      <div className="absolute left-[38%] bottom-10 h-12 w-12 rounded-xl border border-pulse/10 bg-pulse-soft" />
    </div>
  );
}
