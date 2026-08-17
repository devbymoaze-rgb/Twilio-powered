"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ErrorState, Skeleton } from "@/components/ui/EmptyState";
import { api } from "@/lib/api";
import type { Campaign } from "@/lib/types";

interface Analytics {
  totals: {
    messages: number;
    deliveryRate: number;
    responseRate: number;
    conversionRate: number;
    optOutRate: number;
    qualifiedLeads: number;
    failed: number;
    aiConversations: number;
    humanConversations: number;
    avgResponseMs: number;
  };
  series: Array<{ _id: string; sent: number; replies: number; delivered: number }>;
  campaigns: Campaign[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Analytics>("/api/analytics?days=30")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="p-8"><ErrorState message={error} /></div>;
  if (!data) return <div className="p-8"><Skeleton className="h-80" /></div>;

  const minutes = data.totals.avgResponseMs ? Math.round(data.totals.avgResponseMs / 60000) : 0;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pulse">Analytics</p>
      <h1 className="mt-2 font-serif text-4xl font-semibold">The last 30 days, from the database</h1>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["Messages", data.totals.messages],
          ["Delivery rate", `${data.totals.deliveryRate}%`],
          ["Response rate", `${data.totals.responseRate}%`],
          ["Conversion rate", `${data.totals.conversionRate}%`],
          ["Opt-out rate", `${data.totals.optOutRate}%`],
          ["Qualified leads", data.totals.qualifiedLeads],
          ["AI conversations", data.totals.aiConversations],
          ["Human conversations", data.totals.humanConversations],
          ["Avg. time-to-response", minutes ? `${minutes} min` : "—"],
          ["Failed", data.totals.failed],
        ].map(([l, v]) => (
          <div key={String(l)} className="rounded-card border border-stone-200 bg-white px-4 py-4 shadow-card">
            <p className="text-xs text-ink-faint">{l}</p>
            <p className="mt-2 text-2xl">{v}</p>
          </div>
        ))}
      </div>

      <section className="mt-8 rounded-card border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-medium">Messages and replies</h2>
        <div className="mt-4 h-72">
          {data.series.length === 0 ? (
            <p className="text-sm text-ink-faint">Charts populate after real traffic.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.series}>
                <CartesianGrid stroke="#EFEBE3" />
                <XAxis dataKey="_id" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="sent" stroke="#2563EB" fill="#EFF6FF" />
                <Area type="monotone" dataKey="replies" stroke="#0F172A" fill="#E2E8F0" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="mt-6 rounded-card border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-medium">Campaign performance</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-ink-faint">
              <tr>
                <th className="py-2">Name</th>
                <th>Sent</th>
                <th>Delivered</th>
                <th>Replies</th>
                <th>Opt-outs</th>
              </tr>
            </thead>
            <tbody>
              {data.campaigns.map((c) => (
                <tr key={c._id} className="border-t border-stone-100">
                  <td className="py-2">{c.name}</td>
                  <td>{c.stats.sent}</td>
                  <td>{c.stats.delivered}</td>
                  <td>{c.stats.replies}</td>
                  <td>{c.stats.optOuts}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.campaigns.length === 0 ? (
            <p className="py-4 text-sm text-ink-faint">No campaigns in this window.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
