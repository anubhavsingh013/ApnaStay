import { Toaster } from "react-hot-toast";

/**
 * Single global toast host — **top-center**.
 * Use only {@link toastSuccess} / {@link toastError} from `@/lib/app-toast` (or this file’s re-exports)
 * so all notifications share the same position and styling.
 */
export function HotToaster() {
  return (
    <Toaster
      position="top-center"
      reverseOrder={false}
      gutter={10}
      containerClassName="!top-4"
      toastOptions={{
        duration: 4500,
        className:
          "!bg-background !text-foreground !border !border-border !shadow-lg dark:!bg-slate-900 dark:!text-slate-100 dark:!border-slate-700",
        style: {
          padding: "12px 16px",
          maxWidth: "min(420px, calc(100vw - 32px))",
        },
        success: {
          duration: 4500,
          className:
            "!border-emerald-500/30 !bg-emerald-50/95 dark:!bg-emerald-950/40 dark:!text-emerald-50 dark:!border-emerald-500/25",
          iconTheme: {
            primary: "hsl(142 71% 40%)",
            secondary: "hsl(0 0% 100%)",
          },
        },
        error: {
          duration: 3500,
          className:
            "!border-destructive/30 !bg-red-50/95 dark:!bg-red-950/35 dark:!text-red-50 dark:!border-red-500/25",
          iconTheme: {
            primary: "hsl(0 72% 50%)",
            secondary: "hsl(0 0% 100%)",
          },
        },
      }}
    />
  );
}
