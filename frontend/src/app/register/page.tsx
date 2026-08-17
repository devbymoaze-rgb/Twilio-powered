"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import { register } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);
    try {
      await register({
        name: String(form.get("name")),
        email: String(form.get("email")),
        password: String(form.get("password")),
        companyName: String(form.get("companyName")),
      });
      toast.success("Workspace created");
      router.push("/onboarding");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-ink px-10 py-10 text-white md:flex">
        <div className="pointer-events-none absolute -left-8 bottom-16 h-48 w-48 rounded-full bg-pulse/20 blur-3xl" />
        <Logo light />
        <div className="relative">
          <p className="font-serif text-5xl font-semibold leading-tight">Ten minutes from account to first automation.</p>
          <p className="mt-4 max-w-sm text-sm text-white/55">
            Twilio is optional during setup. You can skip it and still explore the full product.
          </p>
        </div>
        <p className="relative text-xs text-white/35">No credit card required to start</p>
      </div>
      <div className="flex items-center justify-center bg-stone-50 px-6 py-16">
        <form onSubmit={onSubmit} className="w-full max-w-md">
          <h1 className="font-serif text-4xl font-semibold">Create your account</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Already have one?{" "}
            <Link href="/login" className="font-medium text-pulse">
              Sign in
            </Link>
            {" · "}
            <Link href="/login" className="font-medium text-pulse">
              Use demo
            </Link>
          </p>
          <div className="mt-8 space-y-4">
            <div>
              <Label htmlFor="name">Your name</Label>
              <Input id="name" name="name" required />
            </div>
            <div>
              <Label htmlFor="companyName">Company</Label>
              <Input id="companyName" name="companyName" required />
            </div>
            <div>
              <Label htmlFor="email">Work email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" minLength={8} required />
            </div>
          </div>
          <Button className="mt-6 w-full" disabled={loading} type="submit">
            {loading ? "Creating…" : "Continue"}
          </Button>
        </form>
      </div>
    </div>
  );
}
