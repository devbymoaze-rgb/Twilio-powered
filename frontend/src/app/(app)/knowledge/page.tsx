"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/EmptyState";
import { api } from "@/lib/api";
import type { KnowledgeArticle } from "@/lib/types";
import { cn } from "@/lib/utils";

const CATS = ["products", "services", "pricing", "faqs", "policies", "company"];

export default function KnowledgePage() {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [category, setCategory] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ category: "products", title: "", content: "" });

  async function load() {
    const data = await api<{ articles: KnowledgeArticle[] }>(
      `/api/knowledge${category ? `?category=${category}` : ""}`
    );
    setArticles(data.articles);
  }

  useEffect(() => {
    load()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [category]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api("/api/knowledge", { method: "POST", body: JSON.stringify(form) });
      toast.success("Article published");
      setForm({ category: form.category, title: "", content: "" });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pulse">Knowledge Base</p>
      <h1 className="mt-2 font-serif text-4xl font-semibold">What the assistant is allowed to know</h1>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategory("")}
          className={cn("rounded-full px-3 py-1 text-xs", !category ? "bg-pulse text-white" : "bg-stone-100")}
        >
          All
        </button>
        {CATS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={cn("rounded-full px-3 py-1 text-xs capitalize", category === c ? "bg-pulse text-white" : "bg-stone-100")}
          >
            {c}
          </button>
        ))}
      </div>

      <form onSubmit={create} className="mt-8 grid gap-3 rounded-card border border-stone-200 bg-white p-5 md:grid-cols-2">
        <div>
          <Label>Category</Label>
          <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {CATS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Title</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </div>
        <div className="md:col-span-2">
          <Label>Content</Label>
          <Textarea rows={4} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} required />
        </div>
        <div>
          <Button type="submit">Add article</Button>
        </div>
      </form>

      {loading ? (
        <div className="mt-6"><Skeleton className="h-32" /></div>
      ) : error ? (
        <div className="mt-6"><ErrorState message={error} /></div>
      ) : articles.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No articles" body="Add products, pricing, and policies so replies stay factual." />
        </div>
      ) : (
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {articles.map((a) => (
            <article key={a._id} className="rounded-card border border-stone-200 bg-white p-5">
              <p className="text-xs uppercase tracking-[0.12em] text-ink-faint">{a.category}</p>
              <h2 className="mt-1 font-medium">{a.title}</h2>
              <p className="mt-2 line-clamp-4 text-sm text-ink-muted">{a.content}</p>
              <Button
                variant="ghost"
                className="mt-3"
                onClick={async () => {
                  await api(`/api/knowledge/${a._id}`, { method: "DELETE" });
                  await load();
                }}
              >
                Delete
              </Button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
