import { useEffect, useRef } from "react";
import type { ComplaintMessageDTO } from "@/lib/api";
import {
  disconnectComplaintStomp,
  subscribeComplaintRealtime,
  getOrCreateComplaintStompClient,
} from "@/lib/complaintStompClient";

type Options = {
  complaintId: number | null;
  enabled: boolean;
  onMessage: (msg: ComplaintMessageDTO) => void;
  onTyping?: (userName: string, typing: boolean) => void;
  onReadReceipt?: (readerUserName: string, lastReadMessageId: number) => void;
  onMessageDeleted?: (messageId: number) => void;
};

export function useComplaintMessagesSocket({
  complaintId,
  enabled,
  onMessage,
  onTyping,
  onReadReceipt,
  onMessageDeleted,
}: Options) {
  const jwt = typeof localStorage !== "undefined" ? localStorage.getItem("jwt")?.trim() ?? "" : "";
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const onTypingRef = useRef(onTyping);
  onTypingRef.current = onTyping;
  const onReadReceiptRef = useRef(onReadReceipt);
  onReadReceiptRef.current = onReadReceipt;
  const onMessageDeletedRef = useRef(onMessageDeleted);
  onMessageDeletedRef.current = onMessageDeleted;

  useEffect(() => {
    if (!enabled || complaintId == null) {
      disconnectComplaintStomp();
      return;
    }
    if (!jwt) return;
    getOrCreateComplaintStompClient(jwt);
  }, [enabled, jwt, complaintId]);

  useEffect(() => {
    if (!enabled || complaintId == null) {
      return;
    }
    if (!jwt) return;

    const unsub = subscribeComplaintRealtime(complaintId, jwt, {
      onMessage: (msg) => onMessageRef.current(msg),
      onTyping: (userName, typing) => onTypingRef.current?.(userName, typing),
      onReadReceipt: (readerUserName, lastReadMessageId) =>
        onReadReceiptRef.current?.(readerUserName, lastReadMessageId),
      onMessageDeleted: (id) => onMessageDeletedRef.current?.(id),
    });

    return () => {
      unsub();
    };
  }, [complaintId, enabled, jwt]);
}
