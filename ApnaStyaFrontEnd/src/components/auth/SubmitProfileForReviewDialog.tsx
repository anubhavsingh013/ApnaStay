import { ShieldCheck, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SubmitProfileForReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when user clicks "Submit for review". May return a Promise for async submit. */
  onConfirm: () => void | Promise<void>;
  /** When true, show loading state on the submit button */
  submitting?: boolean;
}

/**
 * Popup shown when user clicks the Verify badge. Similar structure to 2FA popup:
 * - Title and description
 * - Rounded-full style buttons: Submit for review + Cancel
 */
export function SubmitProfileForReviewDialog({
  open,
  onOpenChange,
  onConfirm,
  submitting = false,
}: SubmitProfileForReviewDialogProps) {
  const handleSubmit = async () => {
    const result = onConfirm();
    if (result instanceof Promise) {
      await result;
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Submit profile for verification</DialogTitle>
          <DialogDescription>
            Do you want to submit your profile for verification? An admin will review your details before you can access full features.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            Once submitted, you can track the status until your profile is approved.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/50 bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 px-4 py-2 text-sm font-medium hover:bg-amber-500/20 dark:hover:bg-amber-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-2 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              <ShieldCheck className="h-4 w-4" />
              {submitting ? "Submitting…" : "Submit for review"}
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-400/50 bg-slate-500/10 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-500/20 dark:hover:bg-slate-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50 focus-visible:ring-offset-2 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
