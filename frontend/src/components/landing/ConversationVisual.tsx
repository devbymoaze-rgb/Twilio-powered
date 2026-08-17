export function ConversationVisual() {
  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-card">
      <div className="border-b border-stone-200 px-5 py-3">
        <p className="text-sm font-medium">Maya Chen · +1 415 555 0198</p>
        <p className="text-xs text-ink-faint">Intent: pricing · Sentiment: positive · Score 82</p>
      </div>
      <div className="space-y-3 px-5 py-5">
        <Bubble side="in">Do you support appointment reminders for two locations?</Bubble>
        <Bubble side="out" ai>
          Yes — you can run reminders from both numbers in one workspace. Each location keeps its own sender and consent list.
        </Bubble>
        <Bubble side="in">What’s the Growth plan include?</Bubble>
        <Bubble side="out" ai>
          Growth includes 15,000 messages, automations, and human handoff. I can have someone walk you through it if useful.
        </Bubble>
      </div>
    </div>
  );
}

function Bubble({
  children,
  side,
  ai,
}: {
  children: React.ReactNode;
  side: "in" | "out";
  ai?: boolean;
}) {
  return (
    <div className={`flex ${side === "out" ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          side === "out" ? "bg-pulse text-white" : "bg-stone-100 text-ink"
        }`}
      >
        {children}
        {ai ? <p className="mt-1 text-[10px] text-white/70">AI · answered first</p> : null}
      </div>
    </div>
  );
}
