"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";
import { api } from "@/lib/api";

export default function NewCampaignPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSaving(true);
    try {
      const data = await api<{ campaign: { _id: string } }>("/api/campaigns", {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          message: form.get("message"),
          aiPersonalization: form.get("aiPersonalization") === "on",
          audience: {
            type: form.get("audienceType"),
            tags: String(form.get("tags") ?? "")
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean),
            consentOnly: form.get("consentOnly") === "on",
          },
          scheduledAt: form.get("scheduledAt")
            ? new Date(String(form.get("scheduledAt"))).toISOString()
            : null,
          rateLimitPerMinute: Number(form.get("rateLimitPerMinute") || 30),
        }),
      });
      toast.success("Campaign saved");
      router.push(`/campaigns/${data.campaign._id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="font-serif text-4xl font-semibold">New campaign</h1>
      <div className="mt-8 space-y-4 rounded-card border border-stone-200 bg-white p-6">
        <div>
          <Label>Campaign name</Label>
          <Input name="name" required />
        </div>
        <div>
          <Label>Audience</Label>
          <Select name="audienceType" defaultValue="all">
            <option value="all">All opted-in contacts</option>
            <option value="tags">By tags</option>
          </Select>
        </div>
        <div>
          <Label>Tags (if by tags)</Label>
          <Input name="tags" placeholder="demo, warm" />
        </div>
        <div>
          <Label>Message</Label>
          <Textarea name="message" rows={5} required placeholder="Hi {{firstName}}, … Reply STOP to opt out." />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="aiPersonalization" />
          AI personalization
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="consentOnly" defaultChecked />
          Only send to opted-in contacts
        </label>
        <div>
          <Label>Schedule (optional)</Label>
          <Input name="scheduledAt" type="datetime-local" />
        </div>
        <div>
          <Label>Rate limit / minute</Label>
          <Input name="rateLimitPerMinute" type="number" defaultValue={30} min={1} max={200} />
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <Button disabled={saving} type="submit">
          {saving ? "Saving…" : "Save draft"}
        </Button>
      </div>
    </form>
  );
}
