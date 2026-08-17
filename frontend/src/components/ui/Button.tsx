import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "dark";

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-pulse text-white shadow-card hover:bg-pulse-bright",
        variant === "secondary" &&
          "border border-stone-200 bg-white text-ink hover:border-pulse/30 hover:bg-pulse-soft",
        variant === "ghost" && "text-ink-muted hover:bg-stone-100 hover:text-ink",
        variant === "danger" && "bg-danger text-white hover:bg-red-700",
        variant === "dark" && "bg-ink text-white hover:bg-slate-800",
        className
      )}
      {...props}
    />
  );
}
