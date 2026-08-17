"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { ErrorState, Skeleton } from "@/components/ui/EmptyState";
import { api } from "@/lib/api";
import type { Campaign } from "@/lib/types";

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [error, setError] = useState("");
  const [testPhone, setTestPhone] = useState("");

  async function load() {
    const data = await api<{ campaign: Campaign }>(`/api/campaigns/${params.id}`);
    setCampaign(data.campaign);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [params.id]);

  async function run(path: string, ok: string) {
    try {
      await api(`/api/campaigns/${params.id}/${path}`, { method: "POST", body: "{}" });
      toast.success(ok);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    }
  }

  if (error) return <div className="p-8"><ErrorState message={error} /></div>;
  if (!campaign) return <div className="p-8"><Skeleton className="h-40" /></div>;

  const s = campaign.stats;
  const responseRate = s.sent ? Math.round((s.replies / s.sent) * 1000) / 10 : 0;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <p className="text-xs uppercase tracking-[0.16em] text-pulse">Campaign</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-serif text-4xl font-semibold">{campaign.name}</h1>
        <span className="text-sm capitalize text-ink-muted">{campaign.status}</span>
      </div>
      <p className="mt-4 whitespace-pre-wrap rounded-card border border-stone-200 bg-white p-5 text-sm">
        {campaign.message}
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          ["Sent", s.sent],
          ["Delivered", s.delivered],
          ["Failed", s.failed],
          ["Replies", s.replies],
          ["Response rate", `${responseRate}%`],
          ["Opt-outs", s.optOuts],
          ["Qualified leads", s.qualifiedLeads],
          ["Targeted", s.targeted],
        ].map(([l, v]) => (
          <div key={String(l)} className="rounded-card border border-stone-200 bg-white px-4 py-3">
            <p className="text-xs text-ink-faint">{l}</p>
            <p className="mt-1 text-xl">{v}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {campaign.status === "draft" || campaign.status === "scheduled" ? (
          <Button onClick={() => void run("launch", "Campaign launched")}>Launch</Button>
        ) : null}
        {campaign.status === "running" ? (
          <Button variant="secondary" onClick={() => void run("pause", "Paused")}>
            Pause
          </Button>
        ) : null}
        {campaign.status === "paused" ? (
          <Button onClick={() => void run("resume", "Resumed")}>Resume</Button>
        ) : null}
      </div>

      <div className="mt-8 rounded-card border border-stone-200 bg-white p-5">
        <p className="text-sm font-medium">Test SMS</p>
        <p className="mt-1 text-xs text-ink-faint">Sends the campaign body to a single number you control.</p>
        <div className="mt-3 flex gap-2">
          <Input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="+1..." />
          <Button
            variant="secondary"
            onClick={async () => {
              try {
                await api(`/api/campaigns/${params.id}/test`, {
                  method: "POST",
                  body: JSON.stringify({ phone: testPhone }),
                });
                toast.success("Test sent");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Test failed");
              }
            }}
          >
            Send test
          </Button>
        </div>
      </div>
    </div>
  );
}
