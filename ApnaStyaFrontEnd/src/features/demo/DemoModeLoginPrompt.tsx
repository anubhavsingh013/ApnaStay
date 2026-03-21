import { useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
  title = "Sign in to access this feature",
  message = "Please sign in to access the complete feature. Demo mode shows a preview only.",
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
      <DialogContent data-demo-allow className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{message}</p>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="w-full sm:w-auto gap-2" onClick={handleGoToLogin}>
            <LogIn className="h-4 w-4" />
            Sign in
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
