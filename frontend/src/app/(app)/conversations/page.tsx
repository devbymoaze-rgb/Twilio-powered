"use client";

import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Field";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/EmptyState";
import { api } from "@/lib/api";
import type { Conversation, Message } from "@/lib/types";
import { cn, contactName } from "@/lib/utils";

const FILTERS = [
  ["all", "All"],
  ["unread", "Unread"],
  ["qualified", "Qualified"],
  ["needs_human", "Needs human"],
  ["ai_handled", "AI handled"],
];

export default function ConversationsPage() {
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [list, setList] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ conversation: Conversation; messages: Message[] } | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  async function loadList() {
    const data = await api<{ conversations: Conversation[] }>(
      `/api/conversations?filter=${filter}&q=${encodeURIComponent(q)}`
    );
    setList(data.conversations);
    if (!activeId && data.conversations[0]) setActiveId(data.conversations[0]._id);
  }

  useEffect(() => {
    setLoading(true);
    loadList()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    if (!activeId) return;
    api<{ conversation: Conversation; messages: Message[] }>(`/api/conversations/${activeId}`)
      .then(setDetail)
      .catch((e) => toast.error(e.message));
  }, [activeId]);

  const contact = useMemo(() => {
    const c = detail?.conversation.contactId;
    return typeof c === "object" ? c : undefined;
  }, [detail]);

  async function send() {
    if (!activeId || !draft.trim()) return;
    setSending(true);
    try {
      await api(`/api/conversations/${activeId}/reply`, {
        method: "POST",
        body: JSON.stringify({ body: draft }),
      });
      setDraft("");
      toast.success("Message sent");
      const data = await api<{ conversation: Conversation; messages: Message[] }>(
        `/api/conversations/${activeId}`
      );
      setDetail(data);
      await loadList();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  async function generate(regenerate = false) {
    if (!activeId) return;
    try {
      const data = await api<{ draft: string }>(`/api/conversations/${activeId}/ai-reply`, {
        method: "POST",
        body: JSON.stringify({
          instruction: regenerate ? "Write a different version. Still answer first." : undefined,
        }),
      });
      setDraft(data.draft);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI draft failed");
    }
  }

  async function act(path: string, success: string) {
    if (!activeId) return;
    await api(`/api/conversations/${activeId}/${path}`, { method: "POST", body: JSON.stringify({}) });
    toast.success(success);
    const data = await api<{ conversation: Conversation; messages: Message[] }>(
      `/api/conversations/${activeId}`
    );
    setDetail(data);
    await loadList();
  }

  return (
    <div className="flex h-[calc(100vh-0px)] min-h-[640px] flex-col md:h-screen md:flex-row">
      <aside className="flex w-full flex-col border-b border-stone-200 bg-white md:w-80 md:border-b-0 md:border-r">
        <div className="border-b border-stone-200 p-4">
          <h1 className="font-serif text-2xl">Conversations</h1>
          <Input
            className="mt-3"
            placeholder="Search name or number"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void loadList();
            }}
          />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {FILTERS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs",
                  filter === id ? "bg-pulse text-white" : "bg-stone-100 text-ink-muted"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {loading ? (
            <div className="space-y-2 p-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : error ? (
            <div className="p-3"><ErrorState message={error} /></div>
          ) : list.length === 0 ? (
            <p className="p-5 text-sm text-ink-faint">No conversations yet. Inbound SMS will appear here.</p>
          ) : (
            list.map((c) => {
              const ct = typeof c.contactId === "object" ? c.contactId : undefined;
              return (
                <button
                  key={c._id}
                  type="button"
                  onClick={() => setActiveId(c._id)}
                  className={cn(
                    "w-full border-b border-stone-100 px-4 py-3 text-left",
                    activeId === c._id ? "bg-pulse-soft" : "hover:bg-stone-50"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{contactName(ct)}</p>
                    {c.unreadCount > 0 ? (
                      <span className="rounded-full bg-pulse px-1.5 text-[10px] text-white">{c.unreadCount}</span>
                    ) : null}
                  </div>
                  <p className="mt-1 truncate text-xs text-ink-muted">{c.lastMessagePreview}</p>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col bg-stone-50">
        {!detail ? (
          <div className="flex flex-1 items-center justify-center p-8">
            <EmptyState title="Select a conversation" body="Threads from Twilio inbound SMS will open here." />
          </div>
        ) : (
          <>
            <header className="flex items-center justify-between border-b border-stone-200 bg-white px-5 py-3">
              <div>
                <p className="font-medium">{contactName(contact)}</p>
                <p className="text-xs text-ink-faint">{contact?.phone}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => void act("qualify", "Marked qualified")}>
                  Mark qualified
                </Button>
                <Button variant="secondary" onClick={() => void act("handoff", "Handed to human")}>
                  Human handoff
                </Button>
                <Button variant="ghost" onClick={() => void act("close", "Conversation closed")}>
                  Close
                </Button>
              </div>
            </header>
            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-5 scrollbar-thin">
              {detail.messages.map((m) => (
                <div key={m._id} className={cn("flex", m.direction === "outbound" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm",
                      m.direction === "outbound" ? "bg-pulse text-white" : "bg-white text-ink shadow-card"
                    )}
                  >
                    <p>{m.body}</p>
                    <p className={cn("mt-1 text-[10px]", m.direction === "outbound" ? "text-white/70" : "text-ink-faint")}>
                      {format(new Date(m.createdAt), "MMM d, h:mm a")} · {m.status} · {m.source}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-stone-200 bg-white p-4">
              <Textarea rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write a reply" />
              <div className="mt-3 flex flex-wrap gap-2">
                <Button onClick={() => void send()} disabled={sending}>
                  {sending ? "Sending…" : "Send"}
                </Button>
                <Button variant="secondary" onClick={() => void generate(false)}>
                  Generate AI reply
                </Button>
                <Button variant="ghost" onClick={() => void generate(true)}>
                  Regenerate
                </Button>
              </div>
            </div>
          </>
        )}
      </section>

      <aside className="hidden w-80 overflow-y-auto border-l border-stone-200 bg-white p-5 lg:block">
        {detail ? (
          <div className="space-y-5 text-sm">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-ink-faint">Contact</p>
              <p className="mt-2 font-medium">{contactName(contact)}</p>
              <p className="text-ink-muted">{contact?.phone}</p>
              <p className="text-ink-muted">{contact?.email}</p>
            </div>
            <Meta label="Lead score" value={String(detail.conversation.leadScore ?? 0)} />
            <Meta label="Intent" value={detail.conversation.intent || "—"} />
            <Meta label="Sentiment" value={detail.conversation.sentiment || "—"} />
            <Meta label="Status" value={detail.conversation.status.replace("_", " ")} />
            <Meta label="Handled by" value={detail.conversation.handledBy} />
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-ink-faint">AI summary</p>
              <p className="mt-2 text-ink-muted">{detail.conversation.aiSummary || "Analyze the thread to generate a summary."}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-ink-faint">Next best action</p>
              <p className="mt-2 text-ink-muted">{detail.conversation.nextBestAction || "—"}</p>
            </div>
            <AssignAgent
              conversationId={detail.conversation._id}
              currentId={
                detail.conversation.assignedAgentId && typeof detail.conversation.assignedAgentId === "object"
                  ? detail.conversation.assignedAgentId._id
                  : ""
              }
              onAssigned={async () => {
                const data = await api<{ conversation: Conversation; messages: Message[] }>(
                  `/api/conversations/${detail.conversation._id}`
                );
                setDetail(data);
              }}
            />
            <Button
              variant="secondary"
              className="w-full"
              onClick={async () => {
                if (!activeId) return;
                await api(`/api/conversations/${activeId}/analyze`, { method: "POST", body: "{}" });
                const data = await api<{ conversation: Conversation; messages: Message[] }>(
                  `/api/conversations/${activeId}`
                );
                setDetail(data);
              }}
            >
              Refresh AI analysis
            </Button>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function AssignAgent({
  conversationId,
  currentId,
  onAssigned,
}: {
  conversationId: string;
  currentId: string;
  onAssigned: () => Promise<void>;
}) {
  const [members, setMembers] = useState<Array<{ _id: string; name: string }>>([]);
  useEffect(() => {
    api<{ members: Array<{ _id: string; name: string }> }>("/api/settings/team")
      .then((d) => setMembers(d.members))
      .catch(() => undefined);
  }, []);
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.14em] text-ink-faint">Assigned agent</p>
      <select
        className="mt-2 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
        value={currentId}
        onChange={async (e) => {
          await api(`/api/conversations/${conversationId}/assign`, {
            method: "POST",
            body: JSON.stringify({ agentId: e.target.value || null }),
          });
          toast.success("Assigned");
          await onAssigned();
        }}
      >
        <option value="">Unassigned</option>
        {members.map((m) => (
          <option key={m._id} value={m._id}>
            {m.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.14em] text-ink-faint">{label}</p>
      <p className="mt-1 capitalize">{value}</p>
    </div>
  );
}
