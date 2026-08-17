"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea, Select } from "@/components/ui/Field";
import { api } from "@/lib/api";
import type { OnboardingStep } from "@/lib/types";

const STEPS: { id: OnboardingStep; title: string; body: string }[] = [
  { id: "business", title: "Business information", body: "So the workspace has a name your team recognizes." },
  { id: "use_case", title: "What do you want to use SMS for?", body: "This shapes defaults. You can change it later." },
  { id: "twilio", title: "Connect Twilio", body: "Credentials are encrypted and never sent to the browser after save." },
  { id: "sms_number", title: "Choose your SMS number", body: "We will attach inbound and status webhooks to this number." },
  { id: "business_profile", title: "Business profile", body: "The assistant uses this when it answers." },
  { id: "ai_personality", title: "AI assistant", body: "Tone, rules, and when to stop talking." },
  { id: "compliance", title: "Consent & compliance", body: "STOP, HELP, and opt-in are product features — not afterthoughts." },
  { id: "first_automation", title: "First automation", body: "A simple WHEN → THEN to prove the loop works." },
  { id: "complete", title: "You are ready", body: "The dashboard only shows what is real." },
];

const USE_CASES = [
  ["lead_generation", "Lead generation"],
  ["customer_support", "Customer support"],
  ["follow_ups", "Follow-ups"],
  ["appointment_reminders", "Appointment reminders"],
  ["marketing", "Marketing"],
  ["other", "Other"],
];

export default function OnboardingPage() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    industry: "",
    website: "",
    timezone: "America/New_York",
    smsUseCases: [] as string[],
    accountSid: "",
    authToken: "",
    phoneNumberSid: "",
    companyName: "",
    description: "",
    hours: "",
    tone: "professional",
    personality: "Helpful, concise, and human. Never pushy.",
    requireOptIn: true,
    helpMessage: "Reply STOP to unsubscribe. Msg & data rates may apply.",
    automationName: "Welcome new contacts",
    automationTrigger: "contact_added",
    automationMessage: "Thanks for reaching out — we received your message and will reply shortly.",
  });
  const [numbers, setNumbers] = useState<Array<{ sid: string; phoneNumber: string; friendlyName: string }>>([]);

  const step = STEPS[index];

  useEffect(() => {
    api<{ organization?: { name?: string } }>("/api/onboarding")
      .then((data) => {
        if (data.organization?.name) {
          setForm((f) => ({ ...f, name: data.organization?.name ?? "", companyName: data.organization?.name ?? "" }));
        }
      })
      .catch(() => undefined);
  }, []);

  function toggleUse(id: string) {
    setForm((f) => ({
      ...f,
      smsUseCases: f.smsUseCases.includes(id)
        ? f.smsUseCases.filter((x) => x !== id)
        : [...f.smsUseCases, id],
    }));
  }

  async function persist(nextStep: OnboardingStep, extra: Record<string, unknown> = {}) {
    await api("/api/onboarding", {
      method: "PUT",
      body: JSON.stringify({ step: nextStep, ...extra }),
    });
  }

  async function next() {
    setSaving(true);
    try {
      const current = STEPS[index].id;
      if (current === "business") {
        await persist("use_case", {
          organization: {
            name: form.name,
            industry: form.industry,
            website: form.website,
            timezone: form.timezone,
          },
        });
      } else if (current === "use_case") {
        await persist("twilio", { organization: { smsUseCases: form.smsUseCases } });
      } else if (current === "twilio") {
        if (form.accountSid && form.authToken) {
          await api("/api/twilio/connect", {
            method: "POST",
            body: JSON.stringify({ accountSid: form.accountSid, authToken: form.authToken }),
          });
        }
        await persist("sms_number");
        try {
          const data = await api<{ numbers: typeof numbers }>("/api/twilio/numbers");
          setNumbers(data.numbers);
        } catch {
          setNumbers([]);
        }
      } else if (current === "sms_number") {
        if (form.phoneNumberSid) {
          await api("/api/twilio/numbers/select", {
            method: "POST",
            body: JSON.stringify({ phoneNumberSid: form.phoneNumberSid }),
          });
        }
        await persist("business_profile");
      } else if (current === "business_profile") {
        await persist("ai_personality", {
          profile: {
            companyName: form.companyName || form.name,
            description: form.description,
            hours: form.hours,
            website: form.website,
            industry: form.industry,
          },
        });
      } else if (current === "ai_personality") {
        await persist("compliance", {
          assistant: { tone: form.tone, personality: form.personality },
        });
      } else if (current === "compliance") {
        await persist("first_automation", {
          compliance: {
            requireOptIn: form.requireOptIn,
            helpMessage: form.helpMessage,
            businessName: form.companyName || form.name,
          },
        });
      } else if (current === "first_automation") {
        await persist("complete", {
          automation: {
            name: form.automationName,
            triggerType: form.automationTrigger,
            message: form.automationMessage,
          },
        });
        toast.success("Workspace is ready");
        router.push("/overview");
        return;
      }
      setIndex((i) => Math.min(i + 1, STEPS.length - 1));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save this step");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-6">
        <Logo />
        <p className="text-xs text-ink-faint">
          Step {index + 1} of {STEPS.length}
        </p>
      </div>
      <div className="mx-auto h-px max-w-3xl bg-stone-200">
        <div
          className="h-px bg-pulse transition-all"
          style={{ width: `${((index + 1) / STEPS.length) * 100}%` }}
        />
      </div>
      <div className="mx-auto max-w-xl px-5 py-12">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pulse">Onboarding</p>
        <h1 className="mt-3 font-serif text-4xl font-semibold">{step.title}</h1>
        <p className="mt-2 text-ink-muted">{step.body}</p>

        <div className="mt-8 space-y-4">
          {step.id === "business" && (
            <>
              <div>
                <Label>Company name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>Industry</Label>
                <Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
              </div>
              <div>
                <Label>Website</Label>
                <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
              </div>
              <div>
                <Label>Timezone</Label>
                <Input value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
              </div>
            </>
          )}

          {step.id === "use_case" && (
            <div className="grid gap-3">
              {USE_CASES.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleUse(id)}
                  className={`rounded-xl border px-4 py-3 text-left text-sm ${
                    form.smsUseCases.includes(id)
                      ? "border-pulse bg-pulse-soft"
                      : "border-stone-200 bg-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {step.id === "twilio" && (
            <>
              <div>
                <Label>Account SID</Label>
                <Input
                  value={form.accountSid}
                  onChange={(e) => setForm({ ...form, accountSid: e.target.value })}
                  placeholder="ACxxxxxxxx"
                />
              </div>
              <div>
                <Label>Auth Token</Label>
                <Input
                  type="password"
                  value={form.authToken}
                  onChange={(e) => setForm({ ...form, authToken: e.target.value })}
                />
              </div>
              <p className="text-xs text-ink-faint">
                You can skip this and connect later in Settings. Sending will stay disabled until a number is selected.
              </p>
            </>
          )}

          {step.id === "sms_number" && (
            <>
              {numbers.length ? (
                <div className="space-y-2">
                  {numbers.map((n) => (
                    <button
                      key={n.sid}
                      type="button"
                      onClick={() => setForm({ ...form, phoneNumberSid: n.sid })}
                      className={`w-full rounded-xl border px-4 py-3 text-left ${
                        form.phoneNumberSid === n.sid ? "border-pulse bg-pulse-soft" : "border-stone-200 bg-white"
                      }`}
                    >
                      <p className="text-sm font-medium">{n.phoneNumber}</p>
                      <p className="text-xs text-ink-faint">{n.friendlyName}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-stone-200 bg-white p-4 text-sm text-ink-muted">
                  No numbers found yet. Connect Twilio, or continue and configure a number in Settings.
                </p>
              )}
            </>
          )}

          {step.id === "business_profile" && (
            <>
              <div>
                <Label>Public company name</Label>
                <Input
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                />
              </div>
              <div>
                <Label>What you do</Label>
                <Textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div>
                <Label>Hours</Label>
                <Input value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
              </div>
            </>
          )}

          {step.id === "ai_personality" && (
            <>
              <div>
                <Label>Tone</Label>
                <Select value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })}>
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
                  rows={4}
                  value={form.personality}
                  onChange={(e) => setForm({ ...form, personality: e.target.value })}
                />
              </div>
            </>
          )}

          {step.id === "compliance" && (
            <>
              <label className="flex items-start gap-3 rounded-xl border border-stone-200 bg-white p-4 text-sm">
                <input
                  type="checkbox"
                  checked={form.requireOptIn}
                  onChange={(e) => setForm({ ...form, requireOptIn: e.target.checked })}
                />
                <span>Require documented opt-in before automated or campaign messages.</span>
              </label>
              <div>
                <Label>HELP response</Label>
                <Textarea
                  rows={3}
                  value={form.helpMessage}
                  onChange={(e) => setForm({ ...form, helpMessage: e.target.value })}
                />
              </div>
            </>
          )}

          {step.id === "first_automation" && (
            <>
              <div>
                <Label>Name</Label>
                <Input
                  value={form.automationName}
                  onChange={(e) => setForm({ ...form, automationName: e.target.value })}
                />
              </div>
              <div>
                <Label>When</Label>
                <Select
                  value={form.automationTrigger}
                  onChange={(e) => setForm({ ...form, automationTrigger: e.target.value })}
                >
                  <option value="contact_added">Contact added</option>
                  <option value="sms_received">SMS received</option>
                  <option value="keyword_received">Keyword received</option>
                </Select>
              </div>
              <div>
                <Label>Then send</Label>
                <Textarea
                  rows={3}
                  value={form.automationMessage}
                  onChange={(e) => setForm({ ...form, automationMessage: e.target.value })}
                />
              </div>
            </>
          )}
        </div>

        <div className="mt-10 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            disabled={index === 0 || saving}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
          >
            Back
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                try {
                  await persist("complete");
                  toast.success("Twilio can be connected later in Settings");
                  router.push("/overview");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Could not skip");
                } finally {
                  setSaving(false);
                }
              }}
            >
              Skip to dashboard
            </Button>
            <Button type="button" disabled={saving} onClick={() => void next()}>
              {saving ? "Saving…" : step.id === "first_automation" ? "Finish" : "Continue"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
