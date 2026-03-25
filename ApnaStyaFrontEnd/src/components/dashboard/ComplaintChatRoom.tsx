import { useEffect, useRef } from "react";
import { Check, CheckCheck, Send, Trash2 } from "lucide-react";
import type { ComplaintMessageDTO } from "@/lib/api";
import {
  calendarDayKey,
  formatChatDayDivider,
  formatChatMessageTime,
} from "@/lib/complaintSocket";
import { emitComplaintTyping } from "@/lib/complaintStompClient";
import { cn } from "@/lib/utils";

function normUser(u: string): string {
  return u.trim().toLowerCase();
}

function isReadByOthers(
  messageId: number,
  currentUserName: string,
  readReceiptsByUser: Record<string, number>,
): boolean {
  const me = normUser(currentUserName);
  return Object.entries(readReceiptsByUser).some(([user, last]) => normUser(user) !== me && last >= messageId);
}

export type ComplaintChatRoomProps = {
  complaintId: number;
  messages: ComplaintMessageDTO[];
  currentUserName: string;
  readReceiptsByUser: Record<string, number>;
  typingUserNames: string[];
  messageText: string;
  onMessageTextChange: (v: string) => void;
  onSend: () => void;
  sending: boolean;
  realtimeEnabled?: boolean;
  emptyLabel?: string;
  /** Parent is a flex column with a fixed height — message list fills space and scrolls internally */
  fillHeight?: boolean;
  onDeleteMessage?: (messageId: number) => void | Promise<void>;
  deletingMessageId?: number | null;
};

/**
 * WhatsApp Web–inspired layout: chat wallpaper, green outgoing bubbles, white incoming, pill composer, send icon.
 */
export function ComplaintChatRoom({
  complaintId,
  messages,
  currentUserName,
  readReceiptsByUser,
  typingUserNames,
  messageText,
  onMessageTextChange,
  onSend,
  sending,
  realtimeEnabled = true,
  emptyLabel = "No messages yet.",
  fillHeight = false,
  onDeleteMessage,
  deletingMessageId,
}: ComplaintChatRoomProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const me = normUser(currentUserName);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    });
  }, [messages, typingUserNames.join("|")]);

  useEffect(() => {
    if (!realtimeEnabled || !complaintId) return;
    if (!messageText.trim()) {
      emitComplaintTyping(complaintId, false);
      return;
    }
    emitComplaintTyping(complaintId, true);
    const idle = window.setTimeout(() => emitComplaintTyping(complaintId, false), 3200);
    return () => window.clearTimeout(idle);
  }, [messageText, complaintId, realtimeEnabled]);

  const stopTyping = () => {
    if (realtimeEnabled && complaintId) emitComplaintTyping(complaintId, false);
  };

  const typingNames =
    typingUserNames.length === 0
      ? null
      : typingUserNames.length === 1
        ? typingUserNames[0]
        : `${typingUserNames.slice(0, 2).join(", ")}${typingUserNames.length > 2 ? ` +${typingUserNames.length - 2}` : ""}`;

  return (
    <div
      className={cn(
        "overflow-x-visible rounded-xl border border-[#d1d7db] shadow-md dark:border-[#2a3942]",
        fillHeight && "flex min-h-0 flex-1 flex-col",
      )}
    >
      <style>{`
        @keyframes wa-typing-dot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.35; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
        .wa-typing-dot { animation: wa-typing-dot 1.15s ease-in-out infinite; }
        .wa-typing-dot:nth-child(2) { animation-delay: 0.18s; }
        .wa-typing-dot:nth-child(3) { animation-delay: 0.36s; }
      `}</style>

      {/* Wallpaper (WhatsApp-like) */}
      <div
        ref={scrollRef}
        className={cn(
          "relative overflow-y-auto bg-[#efeae2] px-2 py-3 sm:px-3 dark:bg-[#0b141a]",
          fillHeight ? "min-h-[200px] flex-1" : "max-h-[min(52vh,440px)] min-h-[280px]",
        )}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
        role="log"
        aria-live="polite"
      >
        {messages.length === 0 && (
          <div className="flex h-52 items-center justify-center">
            <p className="rounded-lg bg-black/[0.04] px-4 py-2 text-sm text-[#54656f] dark:bg-white/[0.06] dark:text-[#8696a0]">
              {emptyLabel}
            </p>
          </div>
        )}

        {messages.map((m, idx) => {
          const isMine = normUser(m.senderUserName) === me;
          const isDeleted = Boolean(m.deleted);
          const mid = m.id != null && m.id > 0 ? m.id : 0;
          const read =
            isMine && mid > 0 && !isDeleted ? isReadByOthers(mid, currentUserName, readReceiptsByUser) : false;
          const day = calendarDayKey(m.createdAt);
          const prevDay = idx > 0 ? calendarDayKey(messages[idx - 1]?.createdAt) : "";
          const showDay = Boolean(day && day !== prevDay);

          const prev = messages[idx - 1];
          const sameSenderAsPrev = prev && normUser(prev.senderUserName) === normUser(m.senderUserName);
          const tightTop = sameSenderAsPrev && !showDay;

          return (
            <div key={m.id != null && m.id > 0 ? m.id : `${m.senderUserName}-${m.createdAt ?? ""}-${m.messageText.slice(0, 48)}`}>
              {showDay && (
                <div className="my-3 flex justify-center">
                  <span className="rounded-lg bg-[#ffecb3]/90 px-3 py-1 text-[11px] font-medium text-[#54656f] shadow-sm dark:bg-[#182229] dark:text-[#8696a0]">
                    {formatChatDayDivider(m.createdAt)}
                  </span>
                </div>
              )}
              <div className={cn("flex w-full px-0.5", isMine ? "justify-end" : "justify-start", tightTop ? "mt-0.5" : "mt-2")}>
                <div
                  className={cn(
                    "max-w-[78%] sm:max-w-[70%] overflow-visible px-2.5 pb-2 pt-1.5 text-[14.5px] leading-[1.45] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]",
                    isMine
                      ? "rounded-lg rounded-tr-none bg-[#d9fdd3] text-[#111b21] dark:rounded-tr-none dark:bg-[#005c4b] dark:text-[#e9edef]"
                      : "rounded-lg rounded-tl-none bg-white text-[#111b21] dark:rounded-tl-none dark:bg-[#1f2c34] dark:text-[#e9edef]",
                  )}
                >
                  {!isMine && (
                    <p className="mb-0.5 text-[12px] font-semibold text-[#008069] dark:text-[#00a884]">{m.senderUserName}</p>
                  )}
                  {isDeleted ? (
                    <p className="text-[13px] italic text-[#667781] dark:text-[#8696a0]">This message was deleted</p>
                  ) : (
                    <p className="whitespace-pre-wrap break-words">{m.messageText}</p>
                  )}
                  <div
                    className={cn(
                      "mt-1 flex min-h-[1.125rem] flex-nowrap items-center justify-end gap-x-1 overflow-visible select-none",
                      isMine ? "text-[#667781] dark:text-[#95b7ae]" : "text-[#667781] dark:text-[#8696a0]",
                    )}
                  >
                    <span className="shrink-0 text-[11px] tabular-nums leading-none">{formatChatMessageTime(m.createdAt)}</span>
                    {isMine && mid > 0 && !isDeleted && onDeleteMessage && (
                      <button
                        type="button"
                        className="shrink-0 rounded p-0.5 text-[#667781] hover:bg-black/5 hover:text-rose-600 dark:hover:bg-white/10 dark:hover:text-rose-400"
                        title="Delete message"
                        disabled={deletingMessageId === mid}
                        onClick={() => void onDeleteMessage(mid)}
                        aria-label="Delete message"
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={2.25} />
                      </button>
                    )}
                    {isMine && mid > 0 && !isDeleted && (
                      <span
                        className="inline-flex h-4 min-w-[1.15rem] shrink-0 items-center justify-end overflow-visible leading-none"
                        title={read ? "Read" : "Sent"}
                      >
                        {read ? (
                          <CheckCheck className="h-4 w-4 text-[#53bdeb]" strokeWidth={2.25} absoluteStrokeWidth />
                        ) : (
                          <Check className="h-4 w-4 text-[#667781] dark:text-[#95b7ae]" strokeWidth={2.25} absoluteStrokeWidth />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {typingNames && (
          <div className="mt-2 flex items-center gap-2 px-1">
            <div className="flex max-w-[85%] items-center gap-2 rounded-lg rounded-tl-none bg-white px-3 py-2 shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] dark:bg-[#1f2c34]">
              <div className="flex gap-1 pt-0.5">
                <span className="wa-typing-dot inline-block h-2 w-2 rounded-full bg-[#8696a0]" />
                <span className="wa-typing-dot inline-block h-2 w-2 rounded-full bg-[#8696a0]" />
                <span className="wa-typing-dot inline-block h-2 w-2 rounded-full bg-[#8696a0]" />
              </div>
              <span className="text-[12px] text-[#54656f] dark:text-[#8696a0]">
                <span className="font-medium">{typingNames}</span>
                {typingUserNames.length === 1 ? " is typing" : " are typing"}
              </span>
            </div>
          </div>
        )}

        <div className="h-1 w-full shrink-0" aria-hidden />
      </div>

      {/* Composer — WhatsApp bar */}
      <form
        className="flex shrink-0 items-end gap-2 border-t border-[#e9edef] bg-[#f0f2f5] px-2 py-2 dark:border-[#2a3942] dark:bg-[#1f2c34]"
        onSubmit={(e) => {
          e.preventDefault();
          stopTyping();
          onSend();
        }}
      >
        <div className="min-h-10 flex-1 rounded-full bg-white px-4 py-2 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)] dark:bg-[#2a3942] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
          <input
            type="text"
            value={messageText}
            onChange={(e) => onMessageTextChange(e.target.value)}
            onBlur={stopTyping}
            placeholder="Type a message"
            className="w-full bg-transparent text-[15px] text-[#111b21] outline-none placeholder:text-[#8696a0] dark:text-[#e9edef]"
            autoComplete="off"
            enterKeyHint="send"
          />
        </div>
        <button
          type="submit"
          disabled={!messageText.trim() || sending}
          className={cn(
            "mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition-opacity",
            messageText.trim() && !sending
              ? "bg-[#00a884] hover:bg-[#008f6f] dark:bg-[#00a884]"
              : "cursor-not-allowed bg-[#8696a0]/50 dark:bg-[#8696a0]/40",
          )}
          aria-label="Send message"
        >
          {sending ? (
            <span className="h-5 w-5 animate-pulse rounded-full bg-white/80" />
          ) : (
            <Send className="h-5 w-5 translate-x-0.5" strokeWidth={2} />
          )}
        </button>
      </form>
    </div>
  );
}
