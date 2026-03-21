import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { ComplaintStatus } from "@/lib/api";

const ORDER: ComplaintStatus[] = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

/** Trigger — tinted by current status */
const triggerClass: Record<ComplaintStatus, string> = {
  OPEN:
    "border-rose-500/50 text-rose-700 bg-rose-50/40 hover:bg-rose-50 dark:border-rose-500/40 dark:text-rose-300 dark:bg-rose-950/25 dark:hover:bg-rose-950/40",
  IN_PROGRESS:
    "border-amber-500/50 text-amber-800 bg-amber-50/40 hover:bg-amber-50 dark:border-amber-500/40 dark:text-amber-200 dark:bg-amber-950/25 dark:hover:bg-amber-950/40",
  RESOLVED:
    "border-emerald-500/50 text-emerald-800 bg-emerald-50/40 hover:bg-emerald-50 dark:border-emerald-500/40 dark:text-emerald-200 dark:bg-emerald-950/25 dark:hover:bg-emerald-950/40",
  CLOSED:
    "border-slate-400/70 text-slate-800 bg-slate-50/80 hover:bg-slate-100 dark:border-slate-500 dark:text-slate-200 dark:bg-slate-800/50 dark:hover:bg-slate-800/80",
};

const menuItemClass: Record<ComplaintStatus, string> = {
  OPEN: "text-rose-700 focus:bg-rose-50 dark:text-rose-300 dark:focus:bg-rose-900/30",
  IN_PROGRESS: "text-amber-800 focus:bg-amber-50 dark:text-amber-200 dark:focus:bg-amber-900/30",
  RESOLVED: "text-emerald-800 focus:bg-emerald-50 dark:text-emerald-200 dark:focus:bg-emerald-900/30",
  CLOSED: "text-slate-700 focus:bg-slate-100 dark:text-slate-300 dark:focus:bg-slate-800/50",
};

function statusLabel(s: ComplaintStatus): string {
  switch (s) {
    case "IN_PROGRESS":
      return "In progress";
    case "OPEN":
      return "Open";
    case "RESOLVED":
      return "Resolved";
    case "CLOSED":
      return "Closed";
    default:
      return s;
  }
}

type Props = {
  currentStatus: ComplaintStatus;
  disabled?: boolean;
  onChange: (next: ComplaintStatus) => void;
  className?: string;
};

/**
 * Complaint detail “Actions” — status dropdown (compact width, comfortable tap target).
 */
export function ComplaintDetailStatusButtons({ currentStatus, disabled, onChange, className }: Props) {
  return (
    <div className={cn("inline-flex", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            className={cn(
              "h-9 min-w-[7.25rem] max-w-[9rem] justify-between gap-2 px-3 py-0 text-sm font-medium leading-snug",
              triggerClass[currentStatus],
            )}
          >
            <span className="min-w-0 flex-1 truncate text-left">{statusLabel(currentStatus)}</span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-w-[9rem] min-w-[7.25rem] p-1">
          {ORDER.map((s) => (
            <DropdownMenuItem
              key={s}
              className={cn(
                "flex items-center justify-between gap-2 px-2.5 py-2 text-sm leading-snug",
                menuItemClass[s],
              )}
              onSelect={() => {
                if (s !== currentStatus) onChange(s);
              }}
            >
              <span className="min-w-0 truncate">{statusLabel(s)}</span>
              {s === currentStatus ? <Check className="h-4 w-4 shrink-0 opacity-80" aria-hidden /> : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
