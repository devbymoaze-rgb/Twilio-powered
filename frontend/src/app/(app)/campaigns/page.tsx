"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/EmptyState";
import { api } from "@/lib/api";
import type { Campaign } from "@/lib/types";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ campaigns: Campaign[] }>("/api/campaigns")
      .then((d) => setCampaigns(d.campaigns))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pulse">Campaigns</p>
          <h1 className="mt-2 font-serif text-4xl">Outbound, with a paper trail</h1>
        </div>
        <Link href="/campaigns/new">
          <Button>New campaign</Button>
        </Link>
      </div>
      {loading ? (
        <div className="mt-8"><Skeleton className="h-32" /></div>
      ) : error ? (
        <div className="mt-8"><ErrorState message={error} /></div>
      ) : campaigns.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No campaigns"
            body="Create a draft, preview it, send a test, then launch to opted-in contacts."
            action={
              <Link href="/campaigns/new">
                <Button>Create campaign</Button>
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {campaigns.map((c) => (
            <Link key={c._id} href={`/campaigns/${c._id}`} className="rounded-2xl border border-stone-200 bg-white p-5">
              <div className="flex justify-between">
                <h2 className="font-medium">{c.name}</h2>
                <span className="text-xs capitalize text-ink-faint">{c.status}</span>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-ink-muted">{c.message}</p>
              <p className="mt-4 text-xs text-ink-faint">
                {c.stats.sent} sent · {c.stats.delivered} delivered · {c.stats.replies} replies · {c.stats.optOuts} opt-outs
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
