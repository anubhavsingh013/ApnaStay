import { CheckCircle, ShieldOff, Loader2 } from "lucide-react";

interface TwoFactorBadgeProps {
  /** true = enabled, false = disabled, null = loading/unknown */
  enabled: boolean | null;
  className?: string;
  showIcon?: boolean;
  /** When provided and 2FA is off, badge is clickable and calls this to open enable 2FA flow */
  onEnableClick?: () => void;
}

/** Same pill shell as VerificationBadge (h-7, px-2.5) so they align side-by-side */
const pillClass =
  "inline-flex h-7 shrink-0 items-center gap-1 rounded-full border px-2.5 text-xs font-medium leading-none";

/** Badge showing 2FA status in the same style as VerificationBadge (CheckCircle when enabled). */
export function TwoFactorBadge({ enabled, className = "", showIcon = true, onEnableClick }: TwoFactorBadgeProps) {
  if (enabled === null) {
    return (
      <span className={`${pillClass} border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 text-slate-500 ${className}`}>
        {showIcon && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        <span className="sr-only">2FA</span>
      </span>
    );
  }
  if (enabled) {
    return (
      <span className={`${pillClass} border-blue-500/50 bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 ${className}`}>
        {showIcon && <CheckCircle className="h-3.5 w-3.5" />}
        2FA on
      </span>
    );
  }
  const baseClass = `${pillClass} border-slate-500/50 bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300`;
  if (onEnableClick) {
    return (
      <button
        type="button"
        onClick={onEnableClick}
        className={`${baseClass} cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700/50 focus:outline-none focus:ring-2 focus:ring-slate-500/50 focus:ring-offset-1 transition-colors ${className}`}
      >
        {showIcon && <ShieldOff className="h-3.5 w-3.5" />}
        2FA off
      </button>
    );
  }
  return (
    <span className={`${baseClass} ${className}`}>
      {showIcon && <ShieldOff className="h-3.5 w-3.5" />}
      2FA off
    </span>
  );
}
