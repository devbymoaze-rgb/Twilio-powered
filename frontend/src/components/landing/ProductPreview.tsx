export function ProductPreview() {
  return (
    <div className="overflow-hidden rounded-card border border-stone-200 bg-white shadow-lift">
      <div className="flex items-center gap-2 border-b border-stone-200 bg-stone-50 px-3 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-stone-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-stone-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-stone-300" />
        <span className="ml-3 text-xs text-ink-faint">Overview · TextPulse</span>
      </div>
      <div className="grid grid-cols-12">
        <aside className="col-span-3 hidden border-r border-stone-200 bg-ink p-3 text-[11px] text-white/50 sm:block">
          <p className="mb-3 text-[10px] uppercase tracking-[0.16em] text-white/30">Workspace</p>
          {["Overview", "Conversations", "Contacts", "Campaigns", "Automations"].map((item, i) => (
            <div
              key={item}
              className={`mb-1 rounded-lg px-2 py-1.5 ${i === 0 ? "bg-pulse text-white" : ""}`}
            >
              {item}
            </div>
          ))}
        </aside>
        <div className="col-span-12 p-4 sm:col-span-9 sm:p-5">
          <p className="font-serif text-xl font-semibold text-ink sm:text-2xl">What needs attention</p>
          <p className="mt-1 text-xs text-ink-faint">4 conversations waiting · 2 qualified today</p>
          <div className="mt-5 grid grid-cols-4 gap-3">
            {[
              ["2,481", "Sent"],
              ["2,403", "Delivered"],
              ["612", "Replies"],
              ["24.7%", "Response"],
            ].map(([n, l]) => (
              <div key={l} className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-3">
                <p className="text-lg text-ink">{n}</p>
                <p className="text-[11px] text-ink-faint">{l}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-pulse/15 bg-pulse-soft p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pulse">Needs a human</p>
            <div className="mt-3 space-y-2.5">
              {[
                ["Maya Chen", "Can we start next week?", "Qualified"],
                ["Northline Ops", "Need a person on this", "Handoff"],
                ["Jonah Reid", "What’s included in Growth?", "Intent: pricing"],
              ].map(([name, msg, tag]) => (
                <div key={name} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-ink">{name}</p>
                    <p className="text-xs text-ink-muted">{msg}</p>
                  </div>
                  <span className="rounded-full border border-stone-200 bg-white px-2 py-0.5 text-[10px] text-ink-muted">
                    {tag}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
