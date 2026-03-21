import type { FormEvent, ReactNode } from "react";
import { CheckCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { shouldPreventDialogCloseForMuiPicker } from "@/lib/muiPickerDialogGuard";

/** Shared layout class for profile update / large profile modals */
export const profileUpdateDialogContentClassName =
  "flex max-h-[min(92vh,760px)] w-[calc(100vw-1rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-2xl border-0 p-0 shadow-2xl duration-200 sm:w-full [&]:translate-y-[-48%] sm:[&]:translate-y-[-50%]";

export type ProfileUpdateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Shown in header (default: Update profile) */
  title?: string;
  /** Subtitle under title */
  description: string;
  /** Form fields (wrap with ThemeProvider in parent if using MUI) */
  children: ReactNode;
  /** Form submit handler (use with Save as type="submit") */
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  saveDisabled: boolean;
  saving?: boolean;
  cancelLabel?: string;
  saveLabel?: string;
};

/**
 * Shared “Update profile” shell for Owner, Tenant (USER), Broker, and future Admin account edits.
 * Consistent header, scroll body, footer with square-style Save + CheckCircle.
 */
export function ProfileUpdateDialog({
  open,
  onOpenChange,
  title = "Update profile",
  description,
  children,
  onSubmit,
  saveDisabled,
  saving = false,
  cancelLabel = "Cancel",
  saveLabel = "Save",
}: ProfileUpdateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={profileUpdateDialogContentClassName}
        onPointerDownOutside={(e) => {
          if (shouldPreventDialogCloseForMuiPicker(e.target, e.detail?.originalEvent)) e.preventDefault();
        }}
      >
        <div className="shrink-0 space-y-1.5 rounded-t-2xl border-b border-border bg-slate-50/90 px-5 pb-4 pt-6 dark:bg-slate-900/60 sm:px-7">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-xl font-semibold tracking-tight">{title}</DialogTitle>
          </DialogHeader>
          <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
        <form className="flex min-h-0 flex-1 flex-col overflow-hidden" onSubmit={onSubmit}>
          <div className="min-h-0 flex-1 scroll-smooth overflow-y-auto overscroll-contain bg-background px-5 py-4 sm:px-7">
            {children}
          </div>
          <div className="shrink-0 rounded-b-2xl border-t border-border bg-muted/30 px-5 py-4 dark:bg-slate-900/40 sm:px-7">
            <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-9 w-full rounded-md border-2 border-slate-300 bg-background px-3 text-sm sm:w-auto dark:border-slate-600"
                onClick={() => onOpenChange(false)}
              >
                {cancelLabel}
              </Button>
              <Button
                type="submit"
                disabled={saveDisabled || saving}
                className="h-9 w-full rounded-md border-2 border-emerald-600 bg-emerald-600 px-3 py-0 text-sm text-white shadow-sm hover:bg-emerald-700 dark:border-emerald-500 dark:bg-emerald-700 dark:hover:bg-emerald-600 sm:h-9 sm:w-auto inline-flex items-center justify-center gap-1.5"
              >
                {saving ? (
                  "Saving…"
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 shrink-0 opacity-95" strokeWidth={2.25} aria-hidden />
                    {saveLabel}
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
