import { useState, useEffect } from "react";
import Dialog from "@mui/material/Dialog";
import Fade from "@mui/material/Fade";
import IconButton from "@mui/material/IconButton";
import { CheckCircle, FlaskConical, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDemoData } from "./DemoDataContext";

const SESSION_KEY = "apnastay_demo_popup_shown_this_session";

function readPopupDismissedFromSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "true";
  } catch {
    return false;
  }
}

const DemoModePopup = () => {
  const { demoMode, toggleDemoMode } = useDemoData();
  const [dismissed, setDismissed] = useState(readPopupDismissedFromSession);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (dismissed || demoMode) return;
    const showTimer = window.setTimeout(() => setOpen(true), 900);
    return () => window.clearTimeout(showTimer);
  }, [dismissed, demoMode]);

  if (demoMode) return null;

  const persistShown = () => {
    try {
      sessionStorage.setItem(SESSION_KEY, "true");
    } catch {
      /* ignore */
    }
  };

  const handleClose = () => {
    setOpen(false);
    setDismissed(true);
    persistShown();
  };

  const handleEnable = () => {
    toggleDemoMode();
    setOpen(false);
    setDismissed(true);
    persistShown();
  };

  return (
    <Dialog
      open={open && !dismissed}
      onClose={(_, reason) => {
        if (reason === "backdropClick" || reason === "escapeKeyDown") handleClose();
      }}
      maxWidth={false}
      slots={{ transition: Fade }}
      slotProps={{
        transition: {
          timeout: { enter: 320, exit: 220 },
        },
        backdrop: {
          sx: {
            backgroundColor: "rgba(15, 23, 42, 0.45)",
            transition: "opacity 320ms cubic-bezier(0.4, 0, 0.2, 1)",
          },
        },
        paper: {
          elevation: 0,
          className:
            "relative w-[min(calc(100vw-1.5rem),28rem)] overflow-hidden rounded-[1.45rem] border border-teal-500/20 dark:border-teal-400/25 bg-white dark:bg-slate-950 shadow-[0_22px_45px_-14px_rgba(15,118,110,0.3),0_0_0_1px_rgba(255,255,255,0.08)_inset] dark:shadow-[0_22px_45px_-14px_rgba(0,0,0,0.52),0_0_0_1px_rgba(255,255,255,0.06)_inset]",
          sx: {
            backgroundImage: (theme) =>
              theme.palette.mode === "dark"
                ? "linear-gradient(165deg, rgba(15,118,110,0.14) 0%, transparent 45%)"
                : "linear-gradient(165deg, rgba(20,184,166,0.1) 0%, transparent 42%)",
          },
        },
      }}
      aria-labelledby="demo-mode-popup-title"
      aria-describedby="demo-mode-popup-desc"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-teal-400/70 to-transparent dark:via-teal-400/50"
        aria-hidden
      />

      <IconButton
        type="button"
        onClick={handleClose}
        aria-label="Close"
        size="small"
        className="z-[2] h-8 w-8 rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        sx={{
          position: "absolute",
          top: 12,
          insetInlineEnd: 12,
          insetInlineStart: "auto",
          zIndex: 2,
        }}
      >
        <X className="h-4 w-4" strokeWidth={2.25} />
      </IconButton>

      <div className="px-6 pt-5 pb-2 pr-14">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/30 via-teal-500/15 to-emerald-500/10 dark:from-teal-400/30 dark:via-teal-500/15 dark:to-emerald-500/10 ring-1 ring-teal-500/30 dark:ring-teal-400/25 shadow-sm">
            <FlaskConical className="h-5 w-5 text-teal-700 dark:text-teal-300" aria-hidden strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <p
              id="demo-mode-popup-title"
              className="text-[1.05rem] font-semibold tracking-tight text-foreground leading-snug"
            >
              Try demo mode
            </p>
            <p
              id="demo-mode-popup-desc"
              className="mt-1.5 text-sm leading-relaxed text-muted-foreground"
            >
              Browse sample properties and dashboards instantly. Safe preview, no account changes.
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-teal-500/25 bg-teal-500/10 px-2.5 py-1 text-[11px] font-medium text-teal-700 dark:text-teal-300">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Switch roles from header
            </div>
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-border bg-muted/30 px-6 py-4 dark:bg-slate-900/40">
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-9 w-full rounded-md border-2 border-slate-300 bg-background px-3 text-sm sm:w-auto dark:border-slate-600"
            onClick={handleClose}
          >
            Skip
          </Button>
          <Button
            type="button"
            onClick={handleEnable}
            className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md border-2 border-emerald-600 bg-emerald-600 px-3 py-0 text-sm text-white shadow-sm hover:bg-emerald-700 dark:border-emerald-500 dark:bg-emerald-700 dark:hover:bg-emerald-600 sm:h-9 sm:w-auto"
          >
            <CheckCircle className="h-4 w-4 shrink-0 opacity-95" strokeWidth={2.25} aria-hidden />
            Enable
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default DemoModePopup;
