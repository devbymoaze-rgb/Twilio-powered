"use client";

import Link from "next/link";
import { MessageSquare, ShieldCheck, Workflow, Zap } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { ConversationVisual } from "@/components/landing/ConversationVisual";
import { HeroBackdrop } from "@/components/landing/HeroBackdrop";
import { ProductPreview } from "@/components/landing/ProductPreview";
import { WorkflowVisual } from "@/components/landing/WorkflowVisual";
import { Reveal } from "@/components/ui/Reveal";

const useCases = [
  ["Lead generation", "Qualify inbound texts without a form in the way."],
  ["Customer support", "Answer common questions, then route the rest."],
  ["Follow-ups", "Nudge quietly when a conversation goes quiet."],
  ["Appointments", "Remind, confirm, and reschedule over SMS."],
  ["Marketing", "Send campaigns only to contacts who opted in."],
  ["Sales handoff", "Pass a scored, summarized thread to a human."],
];

const stats = [
  ["98.4%", "Typical delivery on connected numbers"],
  ["< 30s", "Median AI first-response target"],
  ["1 inbox", "Every reply, campaign, and handoff"],
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-stone-50 text-ink">
      <header className="sticky top-0 z-20 border-b border-stone-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm text-ink-muted md:flex">
            <a href="#product" className="hover:text-ink">Product</a>
            <a href="#how" className="hover:text-ink">How it works</a>
            <a href="#security" className="hover:text-ink">Security</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-ink-muted hover:text-ink">
              Sign in
            </Link>
            <Link href="/register" className="rounded-xl bg-pulse px-3.5 py-2 text-sm font-medium text-white">
              Start free
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-stone-50 px-5 pb-16 pt-16 md:pb-24 md:pt-20">
        <HeroBackdrop />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-12">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pulse">
              AI-powered SMS automation
            </p>
            <h1 className="mt-4 font-serif text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
              Turn Every Text Into a Conversation.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-muted">
              TextPulse connects your Twilio number to an AI that understands replies, runs
              automations, and hands qualified conversations to your team.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="rounded-xl bg-pulse px-5 py-2.5 text-sm font-medium text-white">
                Open demo dashboard
              </Link>
              <Link href="/register" className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-sm text-ink hover:bg-pulse-soft">
                Create your workspace
              </Link>
            </div>
            <div className="mt-10 grid max-w-lg grid-cols-3 gap-4">
              {stats.map(([n, l]) => (
                <div key={l}>
                  <p className="font-serif text-2xl font-semibold text-ink">{n}</p>
                  <p className="mt-1 text-xs leading-snug text-ink-muted">{l}</p>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.1} className="lg:pl-2">
            <div className="origin-center lg:scale-[1.02] lg:rotate-[-2deg]">
              <ProductPreview />
            </div>
          </Reveal>
        </div>
      </section>

      <section id="product" className="border-t border-stone-200 bg-white py-20">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 md:grid-cols-2 md:items-center">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse">Inbox</p>
            <h2 className="mt-3 font-serif text-4xl">A conversation, not a ticket dump.</h2>
            <p className="mt-4 leading-relaxed text-ink-muted">
              Every inbound SMS lands with intent, sentiment, lead score, and an AI summary. Reply
              yourself, generate a draft, or hand the thread to a teammate.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-ink-muted">
              <li className="flex gap-2"><MessageSquare size={16} className="mt-0.5 text-pulse" /> Delivery status on every outbound</li>
              <li className="flex gap-2"><Zap size={16} className="mt-0.5 text-pulse" /> AI answers the question first</li>
              <li className="flex gap-2"><ShieldCheck size={16} className="mt-0.5 text-pulse" /> STOP and HELP handled automatically</li>
            </ul>
          </Reveal>
          <Reveal delay={0.08}>
            <ConversationVisual />
          </Reveal>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse">Automations</p>
            <h2 className="mt-3 font-serif text-4xl">WHEN → IF → THEN, in plain language.</h2>
            <p className="mt-4 max-w-2xl text-ink-muted">
              Build workflows around the path that closes: contact, message, understanding, response,
              qualification, human handoff.
            </p>
          </Reveal>
          <Reveal delay={0.08} className="mt-10">
            <WorkflowVisual />
          </Reveal>
        </div>
      </section>

      <section className="border-y border-stone-200 bg-white py-20">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse">Analytics</p>
            <h2 className="mt-3 font-serif text-4xl">Campaigns you can defend in a meeting.</h2>
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {[
              ["Delivery", "See sent, delivered, and failed — from Twilio, not estimates."],
              ["Response rate", "Measure who actually wrote back."],
              ["Opt-outs", "STOP is handled automatically and suppressed forever."],
              ["Qualified leads", "Track the conversations that became real opportunities."],
            ].map(([t, d], i) => (
              <Reveal key={t} delay={i * 0.05}>
                <div className="rounded-card border border-stone-200 bg-stone-50 p-5">
                  <p className="font-medium">{t}</p>
                  <p className="mt-2 text-sm text-ink-muted">{d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal>
            <h2 className="font-serif text-4xl">Built for how teams actually text.</h2>
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {useCases.map(([t, d], i) => (
              <Reveal key={t} delay={i * 0.04}>
                <div className="rounded-card border border-stone-200 bg-white p-5 shadow-card">
                  <p className="font-medium">{t}</p>
                  <p className="mt-2 text-sm text-ink-muted">{d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="border-t border-stone-200 bg-ink py-20 text-white">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="font-serif text-4xl">How it works</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-4">
            {[
              ["Connect Twilio", "Bring your account and SMS number. Credentials stay on the server."],
              ["Import contacts", "Record consent. Opted-out numbers never get automated messages."],
              ["Teach the assistant", "Products, tone, FAQs, and when to stop talking."],
              ["Launch & hand off", "Campaigns and workflows run. Humans take the ones that matter."],
            ].map(([t, d], i) => (
              <li key={t}>
                <p className="text-xs text-pulse-bright">0{i + 1}</p>
                <p className="mt-2 text-lg">{t}</p>
                <p className="mt-2 text-sm text-white/55">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="font-serif text-4xl">Integrations that stay in their lane.</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ["Twilio", "Messaging Service, inbound webhooks, delivery receipts.", Workflow],
              ["OpenAI", "Intent, sentiment, summaries, and replies — never exposed to the browser.", Zap],
              ["Your stack", "Outbound webhooks for handoffs, plus a team inbox people already understand.", ShieldCheck],
            ].map(([t, d, Icon]) => {
              const Glyph = Icon as typeof Zap;
              return (
                <div key={String(t)} className="rounded-card border border-stone-200 bg-white p-5">
                  <Glyph size={18} className="text-pulse" />
                  <p className="mt-3 font-medium">{String(t)}</p>
                  <p className="mt-2 text-sm text-ink-muted">{String(d)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="security" className="border-t border-stone-200 bg-white py-20">
        <div className="mx-auto max-w-6xl px-5 md:flex md:justify-between">
          <div className="max-w-xl">
            <h2 className="font-serif text-4xl">Security and compliance, treated as product.</h2>
            <p className="mt-4 text-ink-muted">
              Twilio credentials are encrypted at rest. Webhooks are signature-checked. STOP, HELP,
              and START are first-class events. Automated sends respect the suppression list.
            </p>
          </div>
          <ul className="mt-8 space-y-3 text-sm text-ink-muted md:mt-0">
            <li>Encrypted Twilio credentials</li>
            <li>JWT authentication and role-based access</li>
            <li>Consent, opt-in source, and message logs</li>
            <li>Webhook signature verification</li>
            <li>Separate frontend and API — no secrets in the browser</li>
          </ul>
        </div>
      </section>

      <section className="px-5 py-20">
        <div className="mx-auto max-w-6xl rounded-card bg-ink px-8 py-14 text-white md:px-14">
          <h2 className="max-w-xl font-serif text-4xl">Put a pulse on every number you already own.</h2>
          <p className="mt-4 max-w-lg text-white/60">
            Explore the demo workspace now, or create your own and connect Twilio when you are ready.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login" className="inline-flex rounded-xl bg-pulse px-5 py-2.5 text-sm font-medium text-white">
              Open demo dashboard
            </Link>
            <Link href="/register" className="inline-flex rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-ink">
              Start TextPulse
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-stone-200 bg-white py-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 md:flex-row md:justify-between">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-ink-faint">
              AI-powered SMS for teams that still want a human in the loop.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-10 text-sm text-ink-muted md:grid-cols-3">
            <div className="space-y-2">
              <p className="font-medium text-ink">Product</p>
              <p>Conversations</p>
              <p>Campaigns</p>
              <p>Automations</p>
            </div>
            <div className="space-y-2">
              <p className="font-medium text-ink">Company</p>
              <p>Security</p>
              <p>Compliance</p>
              <p>Contact</p>
            </div>
            <div className="space-y-2">
              <p className="font-medium text-ink">Legal</p>
              <p>Privacy</p>
              <p>Terms</p>
            </div>
          </div>
        </div>
        <p className="mx-auto mt-10 max-w-6xl px-5 text-xs text-ink-faint">
          © {new Date().getFullYear()} TextPulse. Use SMS in accordance with carrier and TCPA rules.
        </p>
      </footer>
    </div>
  );
}
