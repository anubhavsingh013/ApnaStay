import type { ComplaintMessageDTO } from "@/lib/api";

function unwrapSocketPayload(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw) as unknown;
      if (p && typeof p === "object" && !Array.isArray(p)) return p as Record<string, unknown>;
    } catch {
      return null;
    }
    return null;
  }
  if (typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>;
  return null;
}

/**
 * Normalize server payload (REST / STOMP JSON) into {@link ComplaintMessageDTO}.
 * @param fallbackComplaintId — used when payload omits complaintId (still in room for this thread).
 */
export function normalizeComplaintMessagePayload(
  raw: unknown,
  fallbackComplaintId?: number | null,
): ComplaintMessageDTO | null {
  const o = unwrapSocketPayload(raw);
  if (!o) return null;

  const idRaw = o.id;
  let id: number | null =
    idRaw == null ? null : typeof idRaw === "number" ? idRaw : Number(idRaw);
  if (id != null && !Number.isFinite(id)) id = null;

  const complaintIdRaw = o.complaintId ?? o.complaint_id;
  let complaintId =
    complaintIdRaw == null
      ? NaN
      : typeof complaintIdRaw === "number"
        ? complaintIdRaw
        : Number(complaintIdRaw);
  if (!Number.isFinite(complaintId) && fallbackComplaintId != null && Number.isFinite(fallbackComplaintId)) {
    complaintId = fallbackComplaintId;
  }
  if (!Number.isFinite(complaintId)) return null;

  const senderIdRaw = o.senderId ?? o.sender_id;
  const senderId = typeof senderIdRaw === "number" ? senderIdRaw : Number(senderIdRaw);

  let createdAt: string | null = null;
  if (o.createdAt != null) {
    if (typeof o.createdAt === "string") {
      createdAt = o.createdAt;
    } else if (Array.isArray(o.createdAt) && o.createdAt.length >= 6) {
      const nums = o.createdAt.map((x) => Number(x));
      const [y, mo, d, h, mi, s] = nums;
      if ([y, mo, d, h, mi, s].every((n) => Number.isFinite(n))) {
        createdAt = `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}T${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
      } else {
        createdAt = o.createdAt.join("-");
      }
    } else {
      createdAt = String(o.createdAt);
    }
  }

  const senderUserName = String(o.senderUserName ?? o.sender_user_name ?? "");
  const del = o.deleted ?? o.is_deleted;
  const deleted = del === true || del === "true" || del === 1;

  return {
    id: id ?? null,
    complaintId,
    senderId: Number.isFinite(senderId) ? senderId : 0,
    senderUserName,
    messageText: String(o.messageText ?? o.message_text ?? ""),
    deleted: deleted ? true : undefined,
    createdAt,
  };
}

/** Milliseconds from createdAt, or null if missing / not parseable (must not be mixed with DB id). */
export function complaintMessageTimeMs(m: ComplaintMessageDTO): number | null {
  const raw = m.createdAt?.trim();
  if (!raw) return null;
  const ms = Date.parse(raw);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Oldest → newest (newest at bottom).
 * Messages without a parseable time sort AFTER timed messages so they never jump to the top
 * (previously numeric id was compared to epoch ms and sorted wrong).
 */
export function sortComplaintMessages(list: ComplaintMessageDTO[]): ComplaintMessageDTO[] {
  return [...list].sort((a, b) => {
    const ta = complaintMessageTimeMs(a);
    const tb = complaintMessageTimeMs(b);
    if (ta != null && tb != null) {
      if (ta !== tb) return ta - tb;
      return (a.id ?? 0) - (b.id ?? 0);
    }
    if (ta != null && tb == null) return -1;
    if (ta == null && tb != null) return 1;
    return (a.id ?? 0) - (b.id ?? 0);
  });
}

/** Drop soft-deleted messages from chat UI (unsend / Instagram-style — no “deleted” placeholder). */
export function complaintMessagesForDisplay(list: ComplaintMessageDTO[]): ComplaintMessageDTO[] {
  return list.filter((m) => !m.deleted);
}

export function mergeComplaintMessageList(prev: ComplaintMessageDTO[], msg: ComplaintMessageDTO): ComplaintMessageDTO[] {
  const asNum = (v: unknown): number | null => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim()) {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };
  if (msg.deleted && msg.id != null && msg.id > 0) {
    const msgId = asNum(msg.id);
    return sortComplaintMessages(prev.filter((m) => asNum(m.id) !== msgId));
  }
  const hasRealId = msg.id != null && msg.id > 0;
  if (hasRealId) {
    const msgId = asNum(msg.id);
    const idx = prev.findIndex((m) => asNum(m.id) === msgId);
    if (idx >= 0) {
      const next = [...prev];
      next[idx] = { ...next[idx], ...msg };
      if (next[idx].deleted) {
        return sortComplaintMessages(next.filter((m) => m.id !== msg.id));
      }
      return sortComplaintMessages(next);
    }
    // Reconcile optimistic local message (id=null) with server-confirmed one.
    const optimisticIdx = [...prev]
      .reverse()
      .findIndex((m) => {
        if (m.id != null) return false;
        if ((m.messageText ?? "") !== (msg.messageText ?? "")) return false;
        const sameSenderId = m.senderId > 0 && msg.senderId > 0 && m.senderId === msg.senderId;
        const sameSenderName = (m.senderUserName ?? "").trim().toLowerCase() === (msg.senderUserName ?? "").trim().toLowerCase();
        return sameSenderId || sameSenderName;
      });
    if (optimisticIdx >= 0) {
      const realIdx = prev.length - 1 - optimisticIdx;
      const next = [...prev];
      next[realIdx] = { ...next[realIdx], ...msg };
      if (next[realIdx].deleted) {
        return sortComplaintMessages(next.filter((m) => m.id !== msg.id));
      }
      return sortComplaintMessages(next);
    }
  }
  /** Do not dedupe by text/sender/time — identical bodies in the same second are valid; empty createdAt made false dup matches. */
  if (msg.deleted) {
    return sortComplaintMessages(prev);
  }
  return sortComplaintMessages([...prev, msg]);
}

export type ComplaintTypingEvent = { complaintId: number; userName: string; typing: boolean };
export type ComplaintReadReceiptEvent = { complaintId: number; readerUserName: string; lastReadMessageId: number };

export function normalizeComplaintTypingPayload(
  raw: unknown,
  fallbackComplaintId?: number | null,
): ComplaintTypingEvent | null {
  const o = unwrapSocketPayload(raw);
  if (!o) return null;
  const cidRaw = o.complaintId ?? o.complaint_id;
  let complaintId =
    cidRaw == null ? NaN : typeof cidRaw === "number" ? cidRaw : Number(cidRaw);
  if (!Number.isFinite(complaintId) && fallbackComplaintId != null && Number.isFinite(fallbackComplaintId)) {
    complaintId = fallbackComplaintId;
  }
  if (!Number.isFinite(complaintId)) return null;
  const userName = String(o.userName ?? o.user_name ?? "");
  if (!userName) return null;
  const typing = Boolean(o.typing);
  return { complaintId, userName, typing };
}

export function normalizeComplaintReadReceiptPayload(
  raw: unknown,
  fallbackComplaintId?: number | null,
): ComplaintReadReceiptEvent | null {
  const o = unwrapSocketPayload(raw);
  if (!o) return null;
  const cidRaw = o.complaintId ?? o.complaint_id;
  let complaintId =
    cidRaw == null ? NaN : typeof cidRaw === "number" ? cidRaw : Number(cidRaw);
  if (!Number.isFinite(complaintId) && fallbackComplaintId != null && Number.isFinite(fallbackComplaintId)) {
    complaintId = fallbackComplaintId;
  }
  if (!Number.isFinite(complaintId)) return null;
  const readerUserName = String(o.readerUserName ?? o.reader_user_name ?? "");
  if (!readerUserName) return null;
  const lid = o.lastReadMessageId ?? o.last_read_message_id;
  const lastReadMessageId = typeof lid === "number" ? lid : Number(lid);
  if (!Number.isFinite(lastReadMessageId)) return null;
  return { complaintId, readerUserName, lastReadMessageId };
}

/** Time only (no date) for chat bubbles. */
export function formatChatMessageTime(iso: string | null | undefined): string {
  if (!iso?.trim()) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** Short day label for WhatsApp-style dividers (Today / Yesterday / date). */
export function formatChatDayDivider(iso: string | null | undefined): string {
  if (!iso?.trim()) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (isSameDay(d, today)) return "Today";
  if (isSameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function calendarDayKey(iso: string | null | undefined): string {
  if (!iso?.trim()) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
