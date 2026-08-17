"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Field";
import { ErrorState, Skeleton } from "@/components/ui/EmptyState";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const TABS = [
  "Business",
  "Twilio",
  "AI assistant",
  "Team",
  "Notifications",
  "Compliance",
  "API / webhooks",
  "Billing",
  "Security",
];

export default function SettingsPage() {
  const [tab, setTab] = useState("Business");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [business, setBusiness] = useState<{ organization?: Record<string, string>; profile?: Record<string, string> }>({});
  const [twilio, setTwilio] = useState<{ connection?: Record<string, unknown> | null }>({});
  const [sid, setSid] = useState("");
  const [token, setToken] = useState("");
  const [numbers, setNumbers] = useState<Array<{ sid: string; phoneNumber: string }>>([]);
  const [compliance, setCompliance] = useState<{ settings?: Record<string, unknown>; suppressions?: Array<{ phone: string; reason: string }> }>({});
  const [team, setTeam] = useState<Array<{ _id: string; name: string; email: string; role: string }>>([]);
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [hooks, setHooks] = useState<Array<{ id: string; url: string; events: string[] }>>([]);
  const [billing, setBilling] = useState<{ plan?: string; plans?: Array<{ id: string; name: string; price: number; messages: number }> }>({});

  useEffect(() => {
    Promise.all([
      api("/api/settings/business"),
      api("/api/twilio"),
      api("/api/settings/compliance"),
      api("/api/settings/team"),
      api("/api/settings/notifications"),
      api("/api/settings/webhooks"),
      api("/api/settings/billing"),
    ])
      .then(([b, t, c, tm, n, w, bill]) => {
        setBusiness(b as typeof business);
        setTwilio(t as typeof twilio);
        setCompliance(c as typeof compliance);
        setTeam((tm as { members: typeof team }).members);
        setPrefs((n as { prefs: typeof prefs }).prefs ?? {});
        setHooks((w as { webhooks: typeof hooks }).webhooks);
        setBilling(bill as typeof billing);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8"><Skeleton className="h-64" /></div>;
  if (error) return <div className="p-8"><ErrorState message={error} /></div>;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="font-serif text-4xl font-semibold">Settings</h1>
      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn("rounded-full px-3 py-1.5 text-xs", tab === t ? "bg-pulse text-white" : "bg-white border border-stone-200")}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-8 rounded-card border border-stone-200 bg-white p-6">
        {tab === "Business" && (
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              await api("/api/settings/business", {
                method: "PUT",
                body: JSON.stringify({
                  organization: { name: form.get("name"), industry: form.get("industry"), website: form.get("website") },
                  profile: { description: form.get("description"), hours: form.get("hours") },
                }),
              });
              toast.success("Business profile saved");
            }}
          >
            <div>
              <Label>Company</Label>
              <Input name="name" defaultValue={business.organization?.name} />
            </div>
            <div>
              <Label>Industry</Label>
              <Input name="industry" defaultValue={business.organization?.industry} />
            </div>
            <div>
              <Label>Website</Label>
              <Input name="website" defaultValue={business.organization?.website} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea name="description" defaultValue={business.profile?.description} rows={3} />
            </div>
            <div>
              <Label>Hours</Label>
              <Input name="hours" defaultValue={business.profile?.hours} />
            </div>
            <Button type="submit">Save</Button>
          </form>
        )}

        {tab === "Twilio" && (
          <div className="space-y-4">
            <p className="text-sm text-ink-muted">
              Status: {String(twilio.connection?.status ?? "disconnected")} · Number:{" "}
              {String(twilio.connection?.phoneNumber || "not selected")}
            </p>
            <div>
              <Label>Account SID</Label>
              <Input value={sid} onChange={(e) => setSid(e.target.value)} />
            </div>
            <div>
              <Label>Auth Token</Label>
              <Input type="password" value={token} onChange={(e) => setToken(e.target.value)} />
            </div>
            <Button
              onClick={async () => {
                await api("/api/twilio/connect", {
                  method: "POST",
                  body: JSON.stringify({ accountSid: sid, authToken: token }),
                });
                const nums = await api<{ numbers: typeof numbers }>("/api/twilio/numbers");
                setNumbers(nums.numbers);
                toast.success("Twilio connected");
              }}
            >
              Connect
            </Button>
            {numbers.length > 0 ? (
              <div className="space-y-2">
                {numbers.map((n) => (
                  <button
                    key={n.sid}
                    type="button"
                    className="block w-full rounded-xl border border-stone-200 px-3 py-2 text-left text-sm"
                    onClick={async () => {
                      await api("/api/twilio/numbers/select", {
                        method: "POST",
                        body: JSON.stringify({ phoneNumberSid: n.sid }),
                      });
                      toast.success("Number configured");
                    }}
                  >
                    {n.phoneNumber}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        )}

        {tab === "AI assistant" && (
          <p className="text-sm text-ink-muted">
            Configure tone, knowledge, and escalation on the{" "}
            <a className="text-pulse" href="/ai-assistant">
              AI Assistant
            </a>{" "}
            page.
          </p>
        )}

        {tab === "Team" && (
          <div>
            <ul className="space-y-2 text-sm">
              {team.map((m) => (
                <li key={m._id} className="flex justify-between border-b border-stone-100 py-2">
                  <span>
                    {m.name} · {m.email}
                  </span>
                  <span className="capitalize text-ink-faint">{m.role}</span>
                </li>
              ))}
            </ul>
            <form
              className="mt-4 grid gap-2 md:grid-cols-3"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                await api("/api/settings/team", {
                  method: "POST",
                  body: JSON.stringify({
                    name: form.get("name"),
                    email: form.get("email"),
                    role: form.get("role"),
                  }),
                });
                toast.success("Teammate invited");
              }}
            >
              <Input name="name" placeholder="Name" required />
              <Input name="email" type="email" placeholder="Email" required />
              <select name="role" className="rounded-lg border border-stone-200 px-3 py-2 text-sm">
                <option value="agent">Agent</option>
                <option value="admin">Admin</option>
              </select>
              <Button type="submit">Invite</Button>
            </form>
          </div>
        )}

        {tab === "Notifications" && (
          <form
            className="space-y-3 text-sm"
            onSubmit={async (e) => {
              e.preventDefault();
              await api("/api/settings/notifications", { method: "PUT", body: JSON.stringify(prefs) });
              toast.success("Preferences saved");
            }}
          >
            {(["emailReplies", "emailHandoffs", "emailCampaigns", "inApp"] as const).map((key) => (
              <label key={key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(prefs[key])}
                  onChange={(e) => setPrefs({ ...prefs, [key]: e.target.checked })}
                />
                {key}
              </label>
            ))}
            <Button type="submit">Save</Button>
          </form>
        )}

        {tab === "Compliance" && (
          <div className="space-y-4">
            <form
              className="space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                await api("/api/settings/compliance", {
                  method: "PUT",
                  body: JSON.stringify({
                    requireOptIn: form.get("requireOptIn") === "on",
                    helpMessage: form.get("helpMessage"),
                    optOutMessage: form.get("optOutMessage"),
                  }),
                });
                toast.success("Compliance settings saved");
              }}
            >
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="requireOptIn" defaultChecked={Boolean(compliance.settings?.requireOptIn)} />
                Require opt-in before automated sends
              </label>
              <div>
                <Label>HELP message</Label>
                <Textarea name="helpMessage" defaultValue={String(compliance.settings?.helpMessage ?? "")} rows={3} />
              </div>
              <div>
                <Label>STOP confirmation</Label>
                <Textarea name="optOutMessage" defaultValue={String(compliance.settings?.optOutMessage ?? "")} rows={3} />
              </div>
              <Button type="submit">Save</Button>
            </form>
            <div>
              <p className="text-sm font-medium">Suppression list</p>
              <ul className="mt-2 text-sm text-ink-muted">
                {(compliance.suppressions ?? []).map((s) => (
                  <li key={s.phone}>
                    {s.phone} · {s.reason}
                  </li>
                ))}
                {(compliance.suppressions ?? []).length === 0 ? <li>Empty — as it should be until someone opts out.</li> : null}
              </ul>
            </div>
          </div>
        )}

        {tab === "API / webhooks" && (
          <div>
            <ul className="text-sm">
              {hooks.map((h) => (
                <li key={h.id} className="border-b border-stone-100 py-2">
                  {h.url} · {h.events.join(", ")}
                </li>
              ))}
            </ul>
            <form
              className="mt-4 space-y-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                await api("/api/settings/webhooks", {
                  method: "POST",
                  body: JSON.stringify({ url: form.get("url") }),
                });
                toast.success("Webhook added");
              }}
            >
              <Label>Outbound webhook URL</Label>
              <Input name="url" type="url" required placeholder="https://..." />
              <Button type="submit">Add webhook</Button>
            </form>
          </div>
        )}

        {tab === "Billing" && (
          <div className="grid gap-3 md:grid-cols-2">
            {billing.plans?.map((p) => (
              <div
                key={p.id}
                className={cn(
                  "rounded-card border p-4",
                  billing.plan === p.id ? "border-pulse bg-pulse-soft" : "border-stone-200"
                )}
              >
                <p className="font-medium">{p.name}</p>
                <p className="mt-1 text-2xl">${p.price}</p>
                <p className="text-sm text-ink-muted">{p.messages.toLocaleString()} messages / mo</p>
              </div>
            ))}
            <p className="md:col-span-2 text-xs text-ink-faint">
              Current plan: {billing.plan}. Payment processing can be attached in production without changing this UI.
            </p>
          </div>
        )}

        {tab === "Security" && (
          <form
            className="max-w-sm space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              await api("/api/auth/password", {
                method: "POST",
                body: JSON.stringify({
                  currentPassword: form.get("currentPassword"),
                  newPassword: form.get("newPassword"),
                }),
              });
              toast.success("Password updated");
            }}
          >
            <div>
              <Label>Current password</Label>
              <Input name="currentPassword" type="password" required />
            </div>
            <div>
              <Label>New password</Label>
              <Input name="newPassword" type="password" minLength={8} required />
            </div>
            <Button type="submit">Update password</Button>
          </form>
        )}
      </div>
    </div>
  );
}
