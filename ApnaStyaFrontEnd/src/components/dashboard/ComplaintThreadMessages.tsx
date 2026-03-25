import { useEffect, useRef } from "react";
import type { ComplaintMessageDTO } from "@/lib/api";

type Props = {
  messages: ComplaintMessageDTO[];
  emptyLabel?: string;
};

/**
 * Renders complaint thread with stable chronological order (oldest → newest) and scrolls to latest.
 */
export function ComplaintThreadMessages({ messages, emptyLabel = "No messages yet." }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Double rAF so layout includes new message height; instant scroll keeps newest at bottom reliably.
    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [messages]);

  return (
    <div ref={scrollRef} className="space-y-2 max-h-40 overflow-y-auto scroll-smooth">
      {messages.length === 0 && <p className="text-xs text-muted-foreground">{emptyLabel}</p>}
      {messages.map((m) => (
        <div
          key={m.id != null && m.id > 0 ? m.id : `${m.senderUserName}-${m.createdAt ?? ""}-${m.messageText.slice(0, 80)}`}
          className="rounded-lg bg-muted/50 p-3 text-sm border border-slate-200/50 dark:border-slate-700/50"
        >
          <p className="font-medium text-xs text-muted-foreground">{m.senderUserName}</p>
          <p className="mt-0.5 text-foreground">{m.messageText}</p>
          {m.createdAt && (
            <p className="text-[10px] text-muted-foreground mt-1">{new Date(m.createdAt).toLocaleString()}</p>
          )}
        </div>
      ))}
    </div>
  );
}
