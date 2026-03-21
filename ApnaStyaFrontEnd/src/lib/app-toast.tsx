/**
 * Central notifications API — import `toastSuccess` / `toastError` from here only.
 * Renders via **react-hot-toast**; the host is `<HotToaster />` in `App.tsx` (top-center).
 */
import type { ReactNode } from "react";
import toast from "react-hot-toast";

const SUCCESS_MS = 4500;
const ERROR_MS = 6000;

function renderContent(message: string, description?: string): string | ReactNode {
  if (!description) return message;
  return (
    <div className="text-left max-w-sm">
      <p className="font-semibold text-sm leading-snug">{message}</p>
      <p className="text-xs opacity-90 mt-1 leading-snug">{description}</p>
    </div>
  );
}

/** Success — top-center, ~4.5s (configured in `HotToaster`) */
export function toastSuccess(message: string, description?: string) {
  toast.success(renderContent(message, description), { duration: SUCCESS_MS });
}

/** Error notification */
export function toastError(message: string, description?: string) {
  toast.error(renderContent(message, description), { duration: ERROR_MS });
}
