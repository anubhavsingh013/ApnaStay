import { useEffect, useRef } from "react";
import type { ComplaintMessageDTO } from "@/lib/api";
import {
  disconnectComplaintStomp,
  subscribeComplaintRealtime,
} from "@/lib/complaintStompClient";

type Options = {
  complaintId: number | null;
  /** When false, shared STOMP client is disconnected (e.g. logged out). */
  enabled: boolean;
  onMessage: (msg: ComplaintMessageDTO) => void;
  onTyping?: (userName: string, typing: boolean) => void;
  onReadReceipt?: (readerUserName: string, lastReadMessageId: number) => void;
  onMessageDeleted?: (messageId: number) => void;
};

/**
 * STOMP/SockJS subscription for complaint threads (`/topic/complaint/{id}`).
 * Subscribes whenever a complaint is open so both parties receive broadcasts without needing
 * "Open live chat" first (that control only expands the composer UI).
 */
export function useComplaintMessagesSocket({
  complaintId,
  enabled,
  onMessage,
  onTyping,
  onReadReceipt,
  onMessageDeleted,
}: Options) {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const onTypingRef = useRef(onTyping);
  onTypingRef.current = onTyping;
  const onReadReceiptRef = useRef(onReadReceipt);
  onReadReceiptRef.current = onReadReceipt;
  const onMessageDeletedRef = useRef(onMessageDeleted);
  onMessageDeletedRef.current = onMessageDeleted;

  useEffect(() => {
    if (!enabled) {
      disconnectComplaintStomp();
      return;
    }

    const jwt = typeof localStorage !== "undefined" ? localStorage.getItem("jwt") : null;
    if (!jwt?.trim()) return;

    if (complaintId == null) {
      return;
    }

    const unsub = subscribeComplaintRealtime(complaintId, jwt.trim(), {
      onMessage: (msg) => onMessageRef.current(msg),
      onTyping: onTypingRef.current
        ? (userName, typing) => onTypingRef.current?.(userName, typing)
        : undefined,
      onReadReceipt: onReadReceiptRef.current
        ? (readerUserName, lastReadMessageId) =>
            onReadReceiptRef.current?.(readerUserName, lastReadMessageId)
        : undefined,
      onMessageDeleted: onMessageDeletedRef.current
        ? (id) => onMessageDeletedRef.current?.(id)
        : undefined,
    });

    return () => {
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refs hold latest callbacks
  }, [complaintId, enabled]);
}
