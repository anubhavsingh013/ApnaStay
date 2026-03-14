import { useState, useEffect } from "react";
import { FlaskConical, X, CheckCircle } from "lucide-react";
import { useDemoData } from "./DemoDataContext";

const SESSION_KEY = "apnastay_demo_popup_shown_this_session";
const AUTO_DISMISS_MS = 6000;

const DemoModePopup = () => {
  const { demoMode, toggleDemoMode } = useDemoData();
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY) === "true") {
        setDismissed(true);
        return;
      }
    } catch {
      /* ignore */
    }
    const showTimer = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(showTimer);
  }, []);

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
    <div className="fixed top-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-50 w-[calc(100%-2rem)] sm:max-w-md animate-fade-in">
      <div className="bg-card border border-border rounded-xl shadow-lg p-4 flex gap-3 items-start">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <FlaskConical className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-bold text-card-foreground">Try Demo Mode</p>
            <button
              type="button"
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground shrink-0 p-0.5 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Explore all features using demo mode, or wait 4–5 minutes for the backend server to come up.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              type="button"
              onClick={handleEnable}
              className="inline-flex items-center gap-1 rounded-full border border-emerald-500/50 bg-transparent text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 px-2.5 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
            >
              <CheckCircle className="h-3.5 w-3.5" /> Enable Demo
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="inline-flex items-center gap-1 rounded-full border border-slate-400/50 dark:border-slate-500/50 bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 px-2.5 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/50"
            >
              <X className="h-3.5 w-3.5" /> Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoModePopup;
