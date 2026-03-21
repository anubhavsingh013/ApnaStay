import { useState, useEffect } from "react";
import { FlaskConical, X, CheckCircle } from "lucide-react";
import { useDemoData } from "./DemoDataContext";

const SESSION_KEY = "apnastay_demo_popup_shown_this_session";
const AUTO_DISMISS_MS = 6000;

function readPopupDismissedFromSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "true";
  } catch {
    return false;
  }
}

const DemoModePopup = () => {
  const { demoMode, toggleDemoMode } = useDemoData();
  /** Sync from session on first paint so revisiting Home doesn’t flash or re-arm the popup */
  const [dismissed, setDismissed] = useState(readPopupDismissedFromSession);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (dismissed) return;
    const showTimer = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(showTimer);
  }, [dismissed]);

  useEffect(() => {
    if (!visible || dismissed) return;
    const autoDismiss = setTimeout(() => {
      setDismissed(true);
      try {
        sessionStorage.setItem(SESSION_KEY, "true");
      } catch {
        /* ignore */
      }
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(autoDismiss);
  }, [visible, dismissed]);

  if (demoMode) return null;
  if (dismissed || !visible) return null;

  const persistShown = () => {
    try {
      sessionStorage.setItem(SESSION_KEY, "true");
    } catch {
      /* ignore */
    }
  };

  const handleEnable = () => {
    toggleDemoMode();
    setDismissed(true);
    persistShown();
  };

  const handleDismiss = () => {
    setDismissed(true);
    persistShown();
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 w-[min(calc(100vw-2rem),19rem)] animate-fade-in pointer-events-auto">
      <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-lg p-2.5 flex gap-2 items-start ring-1 ring-primary/10">
        <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
          <FlaskConical className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-start justify-between gap-1.5">
            <p className="text-xs font-semibold text-card-foreground leading-tight">Try demo mode</p>
            <button
              type="button"
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground shrink-0 p-0.5 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary -mt-0.5"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 leading-snug line-clamp-2">
            Explore the app without signing in. Dismisses automatically in a few seconds.
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <button
              type="button"
              onClick={handleEnable}
              className="inline-flex items-center gap-1 rounded-md border border-emerald-500/50 bg-transparent text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 px-2 py-1 text-[11px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
            >
              <CheckCircle className="h-3 w-3" /> Enable
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="inline-flex items-center gap-1 rounded-md border border-slate-400/50 dark:border-slate-500/50 bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 px-2 py-1 text-[11px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/50"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoModePopup;
