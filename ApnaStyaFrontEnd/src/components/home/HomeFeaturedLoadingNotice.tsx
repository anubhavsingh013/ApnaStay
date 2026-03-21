import { Loader2, X } from "lucide-react";

interface HomeFeaturedLoadingNoticeProps {
  /** When true, the floating notice is shown */
  open: boolean;
  onDismiss: () => void;
}

/**
 * Compact toast-style notice while featured properties load (production only).
 * Bottom-right so it doesn’t cover the hero; one–two lines; dismiss with ✕ only.
 */
export function HomeFeaturedLoadingNotice({ open, onDismiss }: HomeFeaturedLoadingNoticeProps) {
  if (!open) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 w-[min(calc(100vw-2rem),18rem)] animate-fade-in pointer-events-auto"
      role="status"
      aria-live="polite"
    >
      <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-lg px-2.5 py-2 flex items-center gap-2 ring-1 ring-primary/10">
        <Loader2 className="h-4 w-4 text-sky-600 dark:text-sky-400 animate-spin shrink-0" aria-hidden />
        <p className="text-xs text-muted-foreground leading-snug flex-1 min-w-0 line-clamp-2">
          <span className="font-medium text-foreground">Loading listings…</span> Results appear below when ready.
        </p>
        <button
          type="button"
          onClick={onDismiss}
          className="text-muted-foreground hover:text-foreground shrink-0 p-1 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
