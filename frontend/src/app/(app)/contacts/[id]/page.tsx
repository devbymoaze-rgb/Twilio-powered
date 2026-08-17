"use client";

import { format } from "date-fns";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ErrorState, Skeleton } from "@/components/ui/EmptyState";
import { api } from "@/lib/api";
import type { Contact, Message } from "@/lib/types";
import { contactName } from "@/lib/utils";

export default function ContactDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<{
    contact: Contact;
    messages: Message[];
    automations: Array<{ _id: string; status: string; createdAt: string; automationId?: { name?: string } }>;
  } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<typeof data>(`/api/contacts/${params.id}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [params.id]);

  if (error) return <div className="p-8"><ErrorState message={error} /></div>;
  if (!data) return <div className="p-8"><Skeleton className="h-40" /></div>;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pulse">Contact</p>
      <h1 className="mt-2 font-serif text-4xl font-semibold">{contactName(data.contact)}</h1>
      <p className="mt-2 text-ink-muted">
        {data.contact.phone} · Score {data.contact.leadScore} · {data.contact.consentStatus.replace("_", " ")}
      </p>
      <p className="mt-1 text-sm text-ink-faint">
        Tags: {data.contact.tags.join(", ") || "—"} · Source: {data.contact.optInSource || "—"}
      </p>

      <section className="mt-8 rounded-card border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-medium">Communication history</h2>
        <div className="mt-4 space-y-3">
          {data.messages.length === 0 ? (
            <p className="text-sm text-ink-faint">No messages yet.</p>
          ) : (
            data.messages.map((m) => (
              <div key={m._id} className="border-b border-stone-100 pb-3 last:border-0">
                <p className="text-xs text-ink-faint">
                  {format(new Date(m.createdAt), "PPpp")} · {m.direction} · {m.source} · {m.status}
                </p>
                <p className="mt-1 text-sm">{m.body}</p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="mt-4 rounded-card border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-medium">Automation activity</h2>
        <div className="mt-4 space-y-2">
          {data.automations.length === 0 ? (
            <p className="text-sm text-ink-faint">No automation runs for this contact.</p>
          ) : (
            data.automations.map((r) => (
              <div key={r._id} className="flex justify-between text-sm">
                <span>{r.automationId?.name ?? "Automation"}</span>
                <span className="capitalize text-ink-faint">{r.status}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
