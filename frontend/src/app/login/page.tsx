"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import { login } from "@/lib/api";

const DEMO_EMAIL = "demo@textpulse.com";
const DEMO_PASSWORD = "Demo123456!";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function submit(nextEmail: string, nextPassword: string) {
    setLoading(true);
    try {
      const user = await login(nextEmail, nextPassword);
      toast.success("Welcome back");
      router.push(user.onboardingCompleted ? "/overview" : "/onboarding");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-ink px-10 py-10 text-white md:flex">
        <div className="pointer-events-none absolute right-0 top-24 h-56 w-56 rounded-full bg-pulse/20 blur-3xl" />
        <Logo light />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pulse-bright">Workspace</p>
          <p className="mt-4 font-serif text-5xl leading-tight">See what needs a human today.</p>
          <p className="mt-4 max-w-sm text-sm text-white/55">
            Use the demo account if you do not have a Twilio number yet.
          </p>
        </div>
        <p className="relative text-xs text-white/35">TextPulse · AI SMS automation</p>
      </div>
      <div className="flex items-center justify-center bg-stone-50 px-6 py-16">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit(email, password);
          }}
          className="w-full max-w-md"
        >
          <div className="md:hidden">
            <Logo />
          </div>
          <h1 className="mt-6 font-serif text-4xl">Sign in</h1>
          <p className="mt-2 text-sm text-ink-muted">
            New here?{" "}
            <Link href="/register" className="font-medium text-pulse">
              Create a workspace
            </Link>
          </p>

          <div className="mt-6 rounded-card border border-stone-200 bg-pulse-soft p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pulse">Demo access</p>
            <p className="mt-2 text-sm text-ink-muted">No Twilio number required.</p>
            <p className="mt-2 font-mono text-sm text-ink">
              {DEMO_EMAIL}
              <br />
              {DEMO_PASSWORD}
            </p>
            <Button
              type="button"
              variant="secondary"
              className="mt-3 w-full"
              disabled={loading}
              onClick={() => {
                setEmail(DEMO_EMAIL);
                setPassword(DEMO_PASSWORD);
                void submit(DEMO_EMAIL, DEMO_PASSWORD);
              }}
            >
              Enter demo dashboard
            </Button>
          </div>

          <div className="mt-8 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <Button className="mt-6 w-full" disabled={loading} type="submit">
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
