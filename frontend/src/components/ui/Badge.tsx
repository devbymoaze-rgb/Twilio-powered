import { cn } from "@/lib/utils";

type Tone = "neutral" | "blue" | "success" | "warning" | "danger";

const tones: Record<Tone, string> = {
  neutral: "bg-stone-100 text-ink-muted",
  blue: "bg-pulse-soft text-pulse",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning-deep",
  danger: "bg-danger-soft text-danger",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function statusTone(status?: string): Tone {
  switch (status) {
    case "qualified":
    case "delivered":
    case "completed":
    case "active":
    case "opted_in":
      return "success";
    case "needs_human":
    case "paused":
    case "unknown":
      return "warning";
    case "failed":
    case "undelivered":
    case "opted_out":
    case "closed":
      return "danger";
    case "running":
    case "open":
      return "blue";
    default:
      return "neutral";
  }
}
