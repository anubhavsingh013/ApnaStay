import { ShieldCheck, Clock, XCircle, HelpCircle, CheckCircle } from "lucide-react";

/** Shared with TwoFactorBadge so verification + 2FA pills align in profile headers */
const statusPillClass =
  "inline-flex h-7 shrink-0 items-center gap-1 rounded-full border px-2.5 text-xs font-medium leading-none";

export type VerificationStatus = "APPROVED" | "PENDING" | "IN_PROGRESS" | "REJECTED" | null;

interface VerificationBadgeProps {
  status: VerificationStatus;
  /** Optional label override; default: Approved / Pending / Rejected / Not verified */
  label?: string;
  className?: string;
  showIcon?: boolean;
  /** When true and status is APPROVED, render like Admin "Active" badge: outline pill with CheckCircle */
  approvedAsActiveStyle?: boolean;
  /** When provided and status is not APPROVED (or needsResubmit is true), badge is clickable with "Verify" and calls this to submit for review */
  onVerifyClick?: () => void;
  /** When true, show "Verify" (clickable) even if status was APPROVED - e.g. after profile update */
  needsResubmit?: boolean;
}

export function VerificationBadge({ status, label, className = "", showIcon = true, approvedAsActiveStyle = false, onVerifyClick, needsResubmit = false }: VerificationBadgeProps) {
  const notSubmitted = status === null || status === undefined;
  const isClickable = (status !== "APPROVED" && status !== "IN_PROGRESS" || needsResubmit) && !!onVerifyClick;
  const text =
    label ??
    (isClickable ? "Verify" : notSubmitted ? "Not verified" : status === "APPROVED" ? "Verified" : status === "PENDING" ? "Pending" : status === "IN_PROGRESS" ? "Under review" : "Rejected");

  if (status === "APPROVED" && approvedAsActiveStyle && !needsResubmit) {
    return (
      <span className={`${statusPillClass} border-emerald-500/50 bg-transparent text-emerald-600 dark:text-emerald-400 ${className}`}>
        {showIcon && <CheckCircle className="h-3.5 w-3.5" />}
        {text}
      </span>
    );
  }

  const Icon = status === "APPROVED" ? ShieldCheck : status === "PENDING" || status === "IN_PROGRESS" ? Clock : status === "REJECTED" ? XCircle : HelpCircle;
  const variantClasses = notSubmitted || isClickable
    ? "bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-500/40 hover:bg-amber-500/25 cursor-pointer"
    : status === "APPROVED"
      ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
      : status === "REJECTED"
        ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200 border-red-300 dark:border-red-700"
        : "bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-500/40 hover:bg-amber-500/25";

  const badgeContent = (
    <>
      {showIcon && <Icon className="h-3.5 w-3.5" />}
      {text}
    </>
  );

  if (isClickable) {
    return (
      <button
        type="button"
        onClick={onVerifyClick}
        className={`${statusPillClass} transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:ring-offset-1 ${variantClasses} ${className}`}
      >
        {badgeContent}
      </button>
    );
  }

  return (
    <span className={`${statusPillClass} border ${variantClasses} ${className}`}>{badgeContent}</span>
  );
}
