import { AlertCircle, Inbox } from "lucide-react";

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-stone-200 bg-white px-6 py-16 text-center">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 bg-pulse-soft text-pulse">
        <Inbox size={18} />
      </div>
      <h3 className="text-base font-medium text-ink">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-ink-muted">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-card border border-red-200 bg-red-50 px-5 py-4 text-sm text-danger">
      <AlertCircle size={16} className="mt-0.5 shrink-0" />
      <div>
        <p>{message}</p>
        {onRetry ? (
          <button className="mt-2 font-medium underline" onClick={onRetry} type="button">
            Try again
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-stone-200/80 ${className}`} />;
}
