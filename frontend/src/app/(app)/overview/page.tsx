"use client";

import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { contactName, formatNumber } from "@/lib/utils";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Card, PageHeader } from "@/components/ui/Card";
import { ErrorState, Skeleton } from "@/components/ui/EmptyState";

interface Dashboard {
  brief: string;
  metrics: {
    sent: number;
    delivered: number;
    replies: number;
    responseRate: number;
    activeConversations: number;
    qualifiedLeads: number;
    aiHandled: number;
    humanHandoffs: number;
    failed: number;
  };
  attention: Array<{
    _id: string;
    status: string;
    lastMessagePreview: string;
    lastMessageAt: string;
    contactId?: { firstName?: string; lastName?: string; phone?: string };
  }>;
  campaigns: Array<{ _id: string; name: string; status: string; stats?: { sent: number; replies: number } }>;
  recentReplies: Array<{
    _id: string;
    body: string;
    createdAt: string;
    contactId?: { firstName?: string; lastName?: string; phone?: string };
  }>;
  automationActivity: Array<{
    _id: string;
    status: string;
    createdAt: string;
    automationId?: { name?: string };
  }>;
  deliveryActivity: Array<{
    _id: string;
    status: string;
    body: string;
    createdAt: string;
    contactId?: { firstName?: string; lastName?: string; phone?: string };
  }>;
}

export default function OverviewPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Dashboard>("/api/dashboard")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="p-8"><ErrorState message={error} /></div>;
  if (!data) {
    return (
      <div className="space-y-4 p-8">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  const cards = [
    ["Messages sent", formatNumber(data.metrics.sent)],
    ["Delivered", formatNumber(data.metrics.delivered)],
    ["Replies", formatNumber(data.metrics.replies)],
    ["Response rate", `${data.metrics.responseRate}%`],
    ["Active conversations", formatNumber(data.metrics.activeConversations)],
    ["Qualified leads", formatNumber(data.metrics.qualifiedLeads)],
    ["AI-handled", formatNumber(data.metrics.aiHandled)],
    ["Human handoffs", formatNumber(data.metrics.humanHandoffs)],
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-8">
      <PageHeader
        eyebrow="Overview"
        title="What needs attention?"
        action={<Badge tone="blue">Live workspace data</Badge>}
      />

      <Card className="border-pulse/15 bg-pulse-soft/40">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pulse">AI daily brief</p>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-ink-muted">{data.brief}</p>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, value]) => (
          <Card key={label} className="px-4 py-5">
            <p className="text-xs font-medium text-ink-faint">{label}</p>
            <p className="mt-2 font-serif text-2xl font-semibold tracking-tight text-ink">{value}</p>
          </Card>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Conversations needing attention" href="/conversations">
          {data.attention.length === 0 ? (
            <p className="text-sm text-ink-faint">Nothing waiting. New replies will appear here.</p>
          ) : (
            data.attention.map((c) => (
              <Link key={c._id} href="/conversations" className="block border-b border-stone-100 py-3 last:border-0">
                <div className="flex justify-between gap-3">
                  <p className="text-sm font-medium">{contactName(c.contactId)}</p>
                  <Badge tone={statusTone(c.status)}>{c.status.replace("_", " ")}</Badge>
                </div>
                <p className="mt-1 truncate text-sm text-ink-muted">{c.lastMessagePreview}</p>
              </Link>
            ))
          )}
        </Panel>
        <Panel title="Active campaigns" href="/campaigns">
          {data.campaigns.length === 0 ? (
            <p className="text-sm text-ink-faint">No live campaigns. Draft one when you are ready.</p>
          ) : (
            data.campaigns.map((c) => (
              <div key={c._id} className="flex items-center justify-between border-b border-stone-100 py-3 last:border-0">
                <div>
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-ink-faint">
                    {c.stats?.sent ?? 0} sent · {c.stats?.replies ?? 0} replies
                  </p>
                </div>
                <Badge tone={statusTone(c.status)}>{c.status}</Badge>
              </div>
            ))
          )}
        </Panel>
        <Panel title="Recent replies" href="/conversations">
          {data.recentReplies.length === 0 ? (
            <p className="text-sm text-ink-faint">Inbound SMS will show here with real timestamps.</p>
          ) : (
            data.recentReplies.map((m) => (
              <div key={m._id} className="border-b border-stone-100 py-3 last:border-0">
                <p className="text-sm font-medium">{contactName(m.contactId)}</p>
                <p className="mt-1 text-sm text-ink-muted">{m.body}</p>
                <p className="mt-1 text-xs text-ink-faint">
                  {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true })}
                </p>
              </div>
            ))
          )}
        </Panel>
        <Panel title="Automation activity" href="/automations">
          {data.automationActivity.length === 0 ? (
            <p className="text-sm text-ink-faint">Runs appear after a trigger fires.</p>
          ) : (
            data.automationActivity.map((r) => (
              <div key={r._id} className="flex justify-between border-b border-stone-100 py-3 last:border-0">
                <p className="text-sm">{r.automationId?.name ?? "Automation"}</p>
                <p className="text-xs capitalize text-ink-faint">{r.status}</p>
              </div>
            ))
          )}
        </Panel>
      </div>

      <Panel title="Delivery activity">
        {data.deliveryActivity.length === 0 ? (
          <p className="text-sm text-ink-faint">Outbound delivery receipts from Twilio will land here.</p>
        ) : (
          data.deliveryActivity.map((m) => (
            <div key={m._id} className="flex justify-between gap-3 border-b border-stone-100 py-3 last:border-0">
              <div>
                <p className="text-sm font-medium">{contactName(m.contactId)}</p>
                <p className="truncate text-sm text-ink-muted">{m.body}</p>
              </div>
              <span className="text-xs capitalize text-ink-faint">{m.status}</span>
            </div>
          ))
        )}
      </Panel>
    </div>
  );
}

function Panel({ title, href, children }: { title: string; href?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-stone-200 bg-white p-5 shadow-card">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-medium">{title}</h2>
        {href ? (
          <Link href={href} className="text-xs text-pulse">
            View
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}
