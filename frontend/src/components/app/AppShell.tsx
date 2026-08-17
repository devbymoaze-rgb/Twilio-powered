"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  BookOpen,
  Bot,
  Contact,
  Inbox,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Settings,
  Workflow,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { clearToken, getToken, logout, me } from "@/lib/api";
import type { AuthUser } from "@/lib/types";
import { cn, initials } from "@/lib/utils";

const NAV = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/conversations", label: "Conversations", icon: Inbox },
  { href: "/contacts", label: "Contacts", icon: Contact },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/automations", label: "Automations", icon: Workflow },
  { href: "/ai-assistant", label: "AI Assistant", icon: Bot },
  { href: "/knowledge", label: "Knowledge Base", icon: BookOpen },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
] as const;

const PAGE_COPY: Record<string, { title: string; subtitle: string }> = {
  "/overview": { title: "Overview", subtitle: "What needs a human today" },
  "/conversations": { title: "Conversations", subtitle: "Every inbound and outbound SMS" },
  "/contacts": { title: "Contacts", subtitle: "People you can text" },
  "/campaigns": { title: "Campaigns", subtitle: "Outbound with a paper trail" },
  "/automations": { title: "Automations", subtitle: "WHEN → IF → THEN" },
  "/ai-assistant": { title: "AI Assistant", subtitle: "Tone, rules, and qualification" },
  "/knowledge": { title: "Knowledge Base", subtitle: "What the assistant is allowed to know" },
  "/analytics": { title: "Analytics", subtitle: "Delivery, replies, and opt-outs" },
  "/settings": { title: "Settings", subtitle: "Workspace, team, and Twilio" },
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    me()
      .then((data) => {
        setUser(data.user);
        if (!data.user.onboardingCompleted && !pathname.startsWith("/onboarding")) {
          router.replace("/onboarding");
        }
      })
      .catch(() => {
        clearToken();
        router.replace("/login");
      });
  }, [pathname, router]);

  const pageKey = Object.keys(PAGE_COPY)
    .sort((a, b) => b.length - a.length)
    .find((key) => pathname === key || pathname.startsWith(`${key}/`));
  const page = pageKey ? PAGE_COPY[pageKey] : { title: "TextPulse", subtitle: "Workspace" };

  return (
    <div className="min-h-screen bg-stone-50 md:flex md:h-dvh md:overflow-hidden">
      <aside className="flex w-full flex-col bg-ink text-white md:sticky md:top-0 md:h-dvh md:w-64 md:shrink-0">
        <div className="px-5 py-6">
          <Logo light />
          <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.16em] text-white/35">
            Workspace
          </p>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  active ? "bg-pulse text-white shadow-glow" : "text-white/55 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-3">
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium",
              pathname.startsWith("/settings")
                ? "bg-pulse text-white"
                : "text-white/55 hover:bg-white/10 hover:text-white"
            )}
          >
            <Settings size={16} />
            Settings
          </Link>
          <button
            type="button"
            className="mt-0.5 flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-white/55 hover:bg-white/10 hover:text-white"
            onClick={async () => {
              await logout();
              router.replace("/login");
            }}
          >
            <LogOut size={16} />
            Sign out
          </button>
          {user ? (
            <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-white/5 px-3 py-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pulse text-xs font-semibold">
                {initials(user.name)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <p className="truncate text-xs text-white/40">{user.organizationName}</p>
              </div>
            </div>
          ) : null}
        </div>
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="shrink-0 border-b border-stone-200 bg-white/90 px-6 py-4 backdrop-blur">
          <p className="font-serif text-lg font-semibold text-ink">{page.title}</p>
          <p className="text-sm text-ink-muted">{page.subtitle}</p>
        </header>
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
