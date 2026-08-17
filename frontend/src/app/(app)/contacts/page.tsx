"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Field";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/EmptyState";
import { api } from "@/lib/api";
import type { Contact } from "@/lib/types";
import { contactName } from "@/lib/utils";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [q, setQ] = useState("");
  const [consent, setConsent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("firstName,lastName,phone,email,consentStatus,optInSource\nMaya,Chen,+14155550198,maya@example.com,opted_in,website");

  async function load() {
    const data = await api<{ contacts: Contact[] }>(
      `/api/contacts?q=${encodeURIComponent(q)}&consent=${consent}`
    );
    setContacts(data.contacts);
  }

  useEffect(() => {
    load()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await api("/api/contacts", {
        method: "POST",
        body: JSON.stringify({
          firstName: form.get("firstName"),
          lastName: form.get("lastName"),
          phone: form.get("phone"),
          email: form.get("email"),
          tags: String(form.get("tags") ?? "")
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          consentStatus: form.get("consentStatus"),
          optInSource: form.get("optInSource"),
        }),
      });
      toast.success("Contact added");
      setOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add contact");
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pulse">Contacts</p>
          <h1 className="mt-2 font-serif text-4xl">People you can text</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setImportOpen(true)}>
            Import
          </Button>
          <Button onClick={() => setOpen(true)}>Add contact</Button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Input
          placeholder="Search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void load()}
          className="max-w-xs"
        />
        <Select value={consent} onChange={(e) => setConsent(e.target.value)}>
          <option value="">All consent</option>
          <option value="opted_in">Opted in</option>
          <option value="opted_out">Opted out</option>
          <option value="unknown">Unknown</option>
        </Select>
        <Button variant="secondary" onClick={() => void load()}>
          Filter
        </Button>
      </div>

      {loading ? (
        <div className="mt-6 space-y-2">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : error ? (
        <div className="mt-6"><ErrorState message={error} onRetry={() => void load()} /></div>
      ) : contacts.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No contacts yet"
            body="Add someone with documented consent, or import after you connect Twilio."
            action={<Button onClick={() => setOpen(true)}>Add contact</Button>}
          />
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-stone-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-[0.08em] text-ink-faint">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Consent</th>
                <th className="px-4 py-3">Tags</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c._id} className="border-t border-stone-100">
                  <td className="px-4 py-3">
                    <Link href={`/contacts/${c._id}`} className="font-medium hover:text-pulse">
                      {contactName(c)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{c.phone}</td>
                  <td className="px-4 py-3">{c.leadScore}</td>
                  <td className="px-4 py-3 capitalize">{c.consentStatus.replace("_", " ")}</td>
                  <td className="px-4 py-3 text-ink-muted">{c.tags.join(", ") || "—"}</td>
                  <td className="px-4 py-3 capitalize">{c.conversationStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {importOpen ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-ink/40 p-4">
          <form
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lift"
            onSubmit={async (e) => {
              e.preventDefault();
              const lines = importText.trim().split(/\r?\n/);
              const header = lines.shift()?.split(",").map((h) => h.trim()) ?? [];
              const rows = lines.map((line) => {
                const cols = line.split(",").map((c) => c.trim());
                const row: Record<string, string> = {};
                header.forEach((h, i) => {
                  row[h] = cols[i] ?? "";
                });
                return {
                  firstName: row.firstName,
                  lastName: row.lastName,
                  phone: row.phone,
                  email: row.email,
                  consentStatus: (row.consentStatus || "unknown") as Contact["consentStatus"],
                  optInSource: row.optInSource,
                };
              });
              try {
                const data = await api<{ created: number; skipped: number }>("/api/contacts/import", {
                  method: "POST",
                  body: JSON.stringify({ contacts: rows }),
                });
                toast.success(`Imported ${data.created}, skipped ${data.skipped}`);
                setImportOpen(false);
                await load();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Import failed");
              }
            }}
          >
            <h2 className="font-serif text-2xl">Import contacts</h2>
            <p className="mt-1 text-sm text-ink-muted">CSV with a header row. Opted-out numbers stay suppressed.</p>
            <textarea
              className="mt-4 h-48 w-full rounded-lg border border-stone-200 p-3 font-mono text-xs"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setImportOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Import</Button>
            </div>
          </form>
        </div>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-ink/40 p-4">
          <form onSubmit={create} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lift">
            <h2 className="font-serif text-2xl">New contact</h2>
            <div className="mt-4 grid gap-3">
              <div>
                <Label>First name</Label>
                <Input name="firstName" />
              </div>
              <div>
                <Label>Last name</Label>
                <Input name="lastName" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input name="phone" required placeholder="+1..." />
              </div>
              <div>
                <Label>Email</Label>
                <Input name="email" type="email" />
              </div>
              <div>
                <Label>Tags</Label>
                <Input name="tags" placeholder="lead, demo" />
              </div>
              <div>
                <Label>Consent</Label>
                <Select name="consentStatus" defaultValue="unknown">
                  <option value="opted_in">Opted in</option>
                  <option value="unknown">Unknown</option>
                  <option value="opted_out">Opted out</option>
                </Select>
              </div>
              <div>
                <Label>Opt-in source</Label>
                <Input name="optInSource" placeholder="Website form, verbal, etc." />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
