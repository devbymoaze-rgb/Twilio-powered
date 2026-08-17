"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/EmptyState";
import { api } from "@/lib/api";
import type { Automation } from "@/lib/types";

export default function AutomationsPage() {
  const [items, setItems] = useState<Automation[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ automations: Automation[] }>("/api/automations")
      .then((d) => setItems(d.automations))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function create() {
    try {
      const data = await api<{ automation: Automation }>("/api/automations", {
        method: "POST",
        body: JSON.stringify({
          name: "New automation",
          triggerType: "sms_received",
          nodes: [
            {
              id: "trigger-1",
              type: "trigger",
              position: { x: 40, y: 140 },
              data: { triggerType: "sms_received", label: "SMS received" },
            },
            {
              id: "action-1",
              type: "action",
              position: { x: 360, y: 140 },
              data: { actionType: "generate_ai_reply", label: "Generate AI reply" },
            },
          ],
          edges: [{ id: "e1", source: "trigger-1", target: "action-1", sourceHandle: "out" }],
        }),
      });
      window.location.href = `/automations/${data.automation._id}`;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create");
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pulse">Automations</p>
          <h1 className="mt-2 font-serif text-4xl font-semibold">WHEN → IF → THEN</h1>
        </div>
        <Button onClick={() => void create()}>New automation</Button>
      </div>
      {loading ? (
        <div className="mt-8"><Skeleton className="h-32" /></div>
      ) : error ? (
        <div className="mt-8"><ErrorState message={error} /></div>
      ) : items.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No automations"
            body="Start with a trigger, add a condition if you need one, then an action."
            action={<Button onClick={() => void create()}>Create automation</Button>}
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {items.map((a) => (
            <Link key={a._id} href={`/automations/${a._id}`} className="rounded-card border border-stone-200 bg-white p-5">
              <div className="flex justify-between">
                <h2 className="font-medium">{a.name}</h2>
                <span className="text-xs capitalize text-ink-faint">{a.status}</span>
              </div>
              <p className="mt-2 text-sm text-ink-muted">{a.triggerType.replaceAll("_", " ")}</p>
              <p className="mt-3 text-xs text-ink-faint">{a.runCount} runs</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
