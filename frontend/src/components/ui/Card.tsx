import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-card border border-stone-200 bg-white p-5 shadow-card", className)}>
      {children}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-pulse">{eyebrow}</p>
        ) : null}
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-ink md:text-4xl">
          {title}
        </h1>
      </div>
      {action}
    </div>
  );
}
