import { type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type UtilityActionTone = "sky" | "emerald" | "violet" | "rose" | "slate";
type UtilityActionSize = "sm" | "md" | "lg";

const toneClasses: Record<UtilityActionTone, string> = {
  sky: "border-sky-500/50 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20",
  emerald: "border-emerald-500/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20",
  violet: "border-violet-500/50 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20",
  rose: "border-rose-500/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20",
  slate: "border-slate-400/50 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/40",
};

const sizeClasses: Record<UtilityActionSize, string> = {
  sm: "h-8 min-w-[128px] px-3 text-xs",
  md: "h-9 min-w-[156px] px-4 text-sm",
  lg: "h-10 min-w-[180px] px-4.5 text-sm",
};

type UtilityActionButtonProps = {
  label: string;
  icon?: LucideIcon;
  tone?: UtilityActionTone;
  size?: UtilityActionSize;
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
};

export function UtilityActionButton({
  label,
  icon: Icon,
  tone = "sky",
  size = "md",
  className,
  onClick,
  type = "button",
}: UtilityActionButtonProps) {
  return (
    <Button
      type={type}
      variant="outline"
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full bg-transparent font-medium transition-colors",
        toneClasses[tone],
        sizeClasses[size],
        className,
      )}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {label}
    </Button>
  );
}

