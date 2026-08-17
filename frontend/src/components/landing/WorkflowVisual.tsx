export function WorkflowVisual() {
  const steps = [
    { when: "SMS received", iff: "Intent is pricing", then: "Generate AI reply" },
    { when: "Lead score ≥ 70", iff: "Consent opted in", then: "Assign agent" },
    { when: "No response 30m", iff: "Still open", then: "Send follow-up" },
  ];
  return (
    <div className="grid gap-3">
      {steps.map((s) => (
        <div
          key={s.when}
          className="grid items-center gap-3 rounded-card border border-stone-200 bg-white p-4 md:grid-cols-3"
        >
          <FlowChip label="WHEN" value={s.when} />
          <FlowChip label="IF" value={s.iff} />
          <FlowChip label="THEN" value={s.then} accent />
        </div>
      ))}
    </div>
  );
}

function FlowChip({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl px-3 py-3 ${accent ? "bg-pulse-soft" : "bg-stone-50"}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">{label}</p>
      <p className="mt-1 text-sm text-ink">{value}</p>
    </div>
  );
}
