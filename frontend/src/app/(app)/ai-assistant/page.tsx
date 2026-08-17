"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";
import { ErrorState, Skeleton } from "@/components/ui/EmptyState";
import { api } from "@/lib/api";

interface Assistant {
  businessDescription?: string;
  productsServices?: string;
  tone?: string;
  personality?: string;
  qualificationQuestions?: string[];
  conversationRules?: string;
  escalationRules?: string;
  faqs?: Array<{ question: string; answer: string }>;
  autoReplyEnabled?: boolean;
}

export default function AssistantPage() {
  const [assistant, setAssistant] = useState<Assistant | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ assistant: Assistant }>("/api/assistant")
      .then((d) => setAssistant(d.assistant ?? {}))
      .catch((e) => setError(e.message));
  }, []);

  async function save() {
    try {
      const data = await api<{ assistant: Assistant }>("/api/assistant", {
        method: "PUT",
        body: JSON.stringify(assistant),
      });
      setAssistant(data.assistant);
      toast.success("Assistant updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  }

  if (error) return <div className="p-8"><ErrorState message={error} /></div>;
  if (!assistant) return <div className="p-8"><Skeleton className="h-64" /></div>;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pulse">AI Assistant</p>
      <h1 className="mt-2 font-serif text-4xl">Answer first. Qualify when it matters.</h1>
      <p className="mt-3 text-sm text-ink-muted">
        The model is instructed not to ask a qualification question after every SMS. It answers, then
        escalates when your rules say a human should take over.
      </p>

      <div className="mt-8 space-y-4 rounded-2xl border border-stone-200 bg-white p-6">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={assistant.autoReplyEnabled ?? true}
            onChange={(e) => setAssistant({ ...assistant, autoReplyEnabled: e.target.checked })}
          />
          Auto-reply to inbound SMS when the thread is not handed off
        </label>
        <div>
          <Label>Business description</Label>
          <Textarea
            rows={4}
            value={assistant.businessDescription ?? ""}
            onChange={(e) => setAssistant({ ...assistant, businessDescription: e.target.value })}
          />
        </div>
        <div>
          <Label>Products and services</Label>
          <Textarea
            rows={3}
            value={assistant.productsServices ?? ""}
            onChange={(e) => setAssistant({ ...assistant, productsServices: e.target.value })}
          />
        </div>
        <div>
          <Label>Tone</Label>
          <Select
            value={assistant.tone ?? "professional"}
            onChange={(e) => setAssistant({ ...assistant, tone: e.target.value })}
          >
            <option value="professional">Professional</option>
            <option value="friendly">Friendly</option>
            <option value="concise">Concise</option>
            <option value="warm">Warm</option>
            <option value="formal">Formal</option>
          </Select>
        </div>
        <div>
          <Label>Personality</Label>
          <Textarea
            rows={3}
            value={assistant.personality ?? ""}
            onChange={(e) => setAssistant({ ...assistant, personality: e.target.value })}
          />
        </div>
        <div>
          <Label>Qualification questions (used only when relevant)</Label>
          <Textarea
            rows={4}
            value={(assistant.qualificationQuestions ?? []).join("\n")}
            onChange={(e) =>
              setAssistant({
                ...assistant,
                qualificationQuestions: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
              })
            }
          />
        </div>
        <div>
          <Label>Conversation rules</Label>
          <Textarea
            rows={3}
            value={assistant.conversationRules ?? ""}
            onChange={(e) => setAssistant({ ...assistant, conversationRules: e.target.value })}
          />
        </div>
        <div>
          <Label>Escalation rules</Label>
          <Textarea
            rows={3}
            value={assistant.escalationRules ?? ""}
            onChange={(e) => setAssistant({ ...assistant, escalationRules: e.target.value })}
          />
        </div>
        <div>
          <Label>FAQs</Label>
          {(assistant.faqs ?? []).map((faq, i) => (
            <div key={i} className="mt-2 grid gap-2 md:grid-cols-2">
              <Input
                value={faq.question}
                placeholder="Question"
                onChange={(e) => {
                  const faqs = [...(assistant.faqs ?? [])];
                  faqs[i] = { ...faqs[i], question: e.target.value };
                  setAssistant({ ...assistant, faqs });
                }}
              />
              <Input
                value={faq.answer}
                placeholder="Answer"
                onChange={(e) => {
                  const faqs = [...(assistant.faqs ?? [])];
                  faqs[i] = { ...faqs[i], answer: e.target.value };
                  setAssistant({ ...assistant, faqs });
                }}
              />
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            className="mt-2"
            onClick={() =>
              setAssistant({ ...assistant, faqs: [...(assistant.faqs ?? []), { question: "", answer: "" }] })
            }
          >
            Add FAQ
          </Button>
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <Button onClick={() => void save()}>Save assistant</Button>
      </div>
    </div>
  );
}
