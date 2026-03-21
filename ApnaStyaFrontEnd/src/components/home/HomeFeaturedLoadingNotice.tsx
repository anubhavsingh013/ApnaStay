import { Loader2, X } from "lucide-react";

interface HomeFeaturedLoadingNoticeProps {
  /** When true, the floating notice is shown */
  open: boolean;
  onDismiss: () => void;
}

/**
 * User-friendly floating notice while featured properties load from the API (production).
 * Styled similarly to the demo-mode popup; dismissible without blocking the page.
 */
export function HomeFeaturedLoadingNotice({ open, onDismiss }: HomeFeaturedLoadingNoticeProps) {
  if (!open) return null;

  return (
    <div className="fixed top-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-50 w-[calc(100%-2rem)] sm:max-w-md animate-fade-in pointer-events-auto">
      <div className="bg-card border border-border rounded-xl shadow-lg p-4 flex gap-3 items-start ring-1 ring-primary/10">
        <div className="h-9 w-9 rounded-lg bg-sky-500/10 flex items-center justify-center shrink-0">
          <Loader2 className="h-5 w-5 text-sky-600 dark:text-sky-400 animate-spin" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-bold text-card-foreground">Please wait</p>
            <button
              type="button"
              onClick={onDismiss}
              className="text-muted-foreground hover:text-foreground shrink-0 p-0.5 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Dismiss message"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            We&apos;re loading featured properties for you. This usually takes just a moment. You can close this
            message and keep exploring the page—listings will appear below when ready.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              type="button"
              onClick={onDismiss}
              className="inline-flex items-center gap-1 rounded-full border border-slate-400/50 dark:border-slate-500/50 bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 px-2.5 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/50"
            >
              <X className="h-3.5 w-3.5" /> Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
