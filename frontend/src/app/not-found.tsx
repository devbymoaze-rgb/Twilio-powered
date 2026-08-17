import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-stone-50 px-6">
      <div className="w-full max-w-md rounded-card border border-stone-200 bg-white p-8 text-center shadow-card">
        <div className="flex justify-center">
          <Logo />
        </div>
        <h1 className="mt-6 font-serif text-3xl font-semibold text-ink">Page not found</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          This URL is not part of TextPulse. Open the product from the home page, or sign in to
          your workspace.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/" className="rounded-xl bg-pulse px-4 py-2.5 text-sm font-semibold text-white">
            Go home
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
