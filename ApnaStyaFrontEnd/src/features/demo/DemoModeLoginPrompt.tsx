import { useNavigate } from "react-router-dom";
import { LogIn, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDemoData } from "@/features/demo/DemoDataContext";

interface DemoModeLoginPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  message?: string;
}

export function DemoModeLoginPrompt({
  open,
  onOpenChange,
  title = "Sign in for the full experience",
  message = "You’re viewing a preview with sample data. Create an account or sign in to use real listings, save searches, and complete actions.",
}: DemoModeLoginPromptProps) {
  const navigate = useNavigate();
  const { demoMode, exitDemoAndSignIn } = useDemoData();

  const handleGoToLogin = () => {
    onOpenChange(false);
    if (demoMode) {
      exitDemoAndSignIn(navigate);
    } else {
      navigate("/login", { state: { from: window.location.pathname } });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-demo-allow
        className="sm:max-w-[26rem] gap-0 overflow-hidden border-border/80 bg-card p-0 shadow-[0_25px_50px_-12px_rgba(15,23,42,0.18)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.45)]"
      >
        <div
          className="pointer-events-none h-1 w-full bg-gradient-to-r from-teal-500/0 via-teal-500/50 to-teal-500/0 dark:via-teal-400/40"
          aria-hidden
        />
        <div className="px-6 pt-6 pb-2">
          <DialogHeader className="space-y-3 text-left">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/10 ring-1 ring-teal-500/20 dark:bg-teal-400/15 dark:ring-teal-400/25">
              <LogIn className="h-6 w-6 text-teal-700 dark:text-teal-300" strokeWidth={2} aria-hidden />
            </div>
            <DialogTitle className="text-lg font-semibold leading-snug tracking-tight pr-8">{title}</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-muted-foreground">{message}</DialogDescription>
          </DialogHeader>
          <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground/90 leading-relaxed">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600/70 dark:text-teal-400/80" aria-hidden />
            <span>You can keep exploring the demo after closing this, or go straight to sign-in.</span>
          </p>
        </div>
        <DialogFooter className="flex-col-reverse gap-2 border-t border-border/60 bg-muted/20 px-6 py-4 sm:flex-row sm:justify-end">
          <Button variant="ghost" className="w-full sm:w-auto rounded-xl" onClick={() => onOpenChange(false)}>
            Stay on preview
          </Button>
          <Button className="w-full gap-2 rounded-xl sm:w-auto shadow-md shadow-teal-900/10 dark:shadow-black/30" onClick={handleGoToLogin}>
            <LogIn className="h-4 w-4" />
            Sign in
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
