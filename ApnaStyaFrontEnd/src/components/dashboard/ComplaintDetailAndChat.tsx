import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, MessageSquare } from "lucide-react";
import type { ComplaintDTO, ComplaintMessageDTO } from "@/lib/api";
import { ComplaintChatRoom } from "./ComplaintChatRoom";
import { cn } from "@/lib/utils";

export type ComplaintDetailRow = ComplaintDTO & {
  title?: string;
  raisedBy?: string;
  againstUser?: string;
  propertyTitle?: string;
  raisedByRole?: string;
  againstRole?: string;
  adminNote?: string;
};

export type ComplaintDetailAndChatProps = {
  c: ComplaintDetailRow;
  propertyTitle: string;
  currentUserName: string;
  useRealApi: boolean;
  complaintIdForChat: number | null;
  messages: ComplaintMessageDTO[];
  readReceiptsByUser: Record<string, number>;
  typingUserNames: string[];
  messageText: string;
  onMessageTextChange: (v: string) => void;
  onSend: () => void;
  sending: boolean;
  /** Owner/admin actions, tenant info strip, etc. */
  actionsSlot?: ReactNode;
  /** Live STOMP session only after user opens chat */
  liveChatOpen: boolean;
  onOpenLiveChat: () => void;
  onCloseLiveChat: () => void;
  onDeleteMessage?: (messageId: number) => void | Promise<void>;
  deletingMessageId?: number | null;
};

/**
 * Shared complaint summary + real-time chat. Used in dashboard master–detail layout (no modal).
 */
export function ComplaintDetailAndChat({
  c,
  propertyTitle,
  currentUserName,
  useRealApi,
  complaintIdForChat,
  messages,
  readReceiptsByUser,
  typingUserNames,
  messageText,
  onMessageTextChange,
  onSend,
  sending,
  actionsSlot,
  liveChatOpen,
  onOpenLiveChat,
  onCloseLiveChat,
  onDeleteMessage,
  deletingMessageId,
}: ComplaintDetailAndChatProps) {
  const subject = c.subject ?? c.title ?? "";
  const raisedBy = c.raisedByUserName ?? c.raisedBy ?? "";
  const related = c.relatedUserName ?? c.againstUser ?? "";
  const description = c.description ?? "";
  const isResolved = c.status === "RESOLVED" || c.status === "CLOSED";
  const priorityCls =
    c.priority === "HIGH"
      ? "bg-rose-100 text-rose-800"
      : c.priority === "MEDIUM"
        ? "bg-amber-100 text-amber-800"
        : "bg-slate-100 text-slate-700";
  const createdRaw = c.createdAt;
  const createdLabel = createdRaw
    ? new Date(createdRaw).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-0.5">
        <div className="rounded-lg border border-slate-200 bg-muted/20 p-3 dark:border-slate-700">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Summary</p>
          <p className="mt-1 text-sm font-medium text-foreground">{subject || "No subject"}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description || "—"}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-muted/20 p-3 dark:border-slate-700">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">People &amp; property</p>
          <div className="mt-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div>
              <span className="text-muted-foreground">Raised by</span>
              <p className="font-medium text-foreground">{raisedBy || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Related to</span>
              <p className="font-medium text-foreground">{related || "—"}</p>
            </div>
            {c.assignedToUserName && (
              <div className="sm:col-span-2">
                <span className="text-muted-foreground">Assigned to</span>
                <p className="font-medium text-foreground">{c.assignedToUserName}</p>
              </div>
            )}
            <div className="sm:col-span-2">
              <span className="text-muted-foreground">Property</span>
              <p className="font-medium text-foreground">{propertyTitle || "—"}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-muted/20 p-3 dark:border-slate-700">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status &amp; dates</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <div>
              <span className="block text-[10px] text-muted-foreground">Status</span>
              {isResolved ? (
                <span className="mt-0.5 inline-flex items-center gap-1 rounded-md border-2 border-emerald-500/60 bg-emerald-50/80 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                  <CheckCircle className="h-3.5 w-3.5" /> {c.status}
                </span>
              ) : c.status === "OPEN" ? (
                <span className="mt-0.5 inline-flex items-center gap-1 rounded-md border-2 border-rose-500/60 bg-rose-50/80 px-2 py-0.5 text-[10px] font-medium text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
                  {c.status}
                </span>
              ) : c.status === "IN_PROGRESS" ? (
                <span className="mt-0.5 inline-flex items-center gap-1.5 rounded-md border-2 border-amber-500/60 bg-amber-50/80 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                  <Clock className="h-3.5 w-3.5 shrink-0" /> In progress
                </span>
              ) : (
                <Badge variant="outline" className="mt-0.5">
                  {c.status}
                </Badge>
              )}
            </div>
            <div>
              <span className="block text-[10px] text-muted-foreground">Priority</span>
              <Badge variant="outline" className={`${priorityCls} mt-0.5`}>
                {c.priority}
              </Badge>
            </div>
            <div>
              <span className="block text-[10px] text-muted-foreground">Created</span>
              <p className="text-sm font-medium">{createdLabel}</p>
            </div>
          </div>
        </div>
        {(c.resolutionNote || c.adminNote) && (
          <div className="rounded-lg border border-slate-200 bg-muted/20 p-3 dark:border-slate-700">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Resolution &amp; notes</p>
            {c.resolutionNote && (
              <div className="mt-2">
                <span className="text-[10px] text-muted-foreground">Resolution note</span>
                <p className="text-sm text-foreground">{c.resolutionNote}</p>
              </div>
            )}
            {c.adminNote && (
              <div className="mt-2">
                <span className="text-[10px] text-muted-foreground">Admin note</span>
                <p className="text-sm text-foreground">{c.adminNote}</p>
              </div>
            )}
          </div>
        )}
        {actionsSlot}
      </div>

      {useRealApi && complaintIdForChat != null && (
        <div className="shrink-0 border-t border-slate-200 bg-background/95 pt-3 dark:border-slate-700">
          {!liveChatOpen ? (
            <div className="space-y-2">
              <Button
                type="button"
                variant="default"
                className="h-11 w-full gap-2 rounded-xl text-sm font-semibold shadow-sm"
                onClick={onOpenLiveChat}
              >
                <MessageSquare className="h-4 w-4" />
                Open live chat
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">
                Messages sync in real time while this complaint is open — open chat to read the thread and reply.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Live conversation</p>
                <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={onCloseLiveChat}>
                  Hide chat
                </Button>
              </div>
              <div className="flex max-h-[min(50vh,480px)] min-h-[260px] flex-col overflow-hidden rounded-xl border border-[#d1d7db] shadow-md dark:border-[#2a3942]">
                <ComplaintChatRoom
                  complaintId={complaintIdForChat}
                  messages={messages}
                  currentUserName={currentUserName}
                  readReceiptsByUser={readReceiptsByUser}
                  typingUserNames={typingUserNames}
                  messageText={messageText}
                  onMessageTextChange={onMessageTextChange}
                  onSend={onSend}
                  sending={sending}
                  realtimeEnabled
                  fillHeight
                  onDeleteMessage={onDeleteMessage}
                  deletingMessageId={deletingMessageId}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
