import { Client, type IMessage } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import type { ComplaintMessageDTO } from "@/lib/api";
import {
  normalizeComplaintMessagePayload,
  normalizeComplaintReadReceiptPayload,
  normalizeComplaintTypingPayload,
} from "@/lib/complaintSocket";

type MessageCb = (msg: ComplaintMessageDTO) => void;
type MessageDeletedCb = (messageId: number) => void;
type TypingCb = (userName: string, typing: boolean) => void;
type ReadCb = (readerUserName: string, lastReadMessageId: number) => void;

let shared: { client: Client; jwt: string } | null = null;

const msgSubs = new Map<number, Set<MessageCb>>();
const delSubs = new Map<number, Set<MessageDeletedCb>>();
const typingSubs = new Map<number, Set<TypingCb>>();
const readSubs = new Map<number, Set<ReadCb>>();

/** Active STOMP subscription per complaint (unsubscribe on teardown). */
const stompTopicSub = new Map<number, { unsubscribe: () => void }>();

function disposeAllTopicSubscriptions(): void {
  for (const { unsubscribe } of stompTopicSub.values()) {
    try {
      unsubscribe();
    } catch {
      /* ignore */
    }
  }
  stompTopicSub.clear();
}

function clearAllComplaintSubs(): void {
  msgSubs.clear();
  typingSubs.clear();
  readSubs.clear();
  delSubs.clear();
}

function addSub<K>(map: Map<number, Set<K>>, complaintId: number, fn: K): void {
  let s = map.get(complaintId);
  if (!s) {
    s = new Set();
    map.set(complaintId, s);
  }
  s.add(fn);
}

function delSub<K>(map: Map<number, Set<K>>, complaintId: number, fn: K): void {
  const s = map.get(complaintId);
  if (!s) return;
  s.delete(fn);
  if (s.size === 0) map.delete(complaintId);
}

function activeComplaintIds(): number[] {
  const ids = new Set<number>();
  msgSubs.forEach((_, k) => ids.add(k));
  delSubs.forEach((_, k) => ids.add(k));
  typingSubs.forEach((_, k) => ids.add(k));
  readSubs.forEach((_, k) => ids.add(k));
  return [...ids];
}

function dispatchFrame(complaintId: number, frame: IMessage): void {
  const cid = Math.trunc(Number(complaintId));
  try {
    const data = JSON.parse(frame.body) as Record<string, unknown>;
    const t = data.type;
    if (t === "message" && data.payload != null) {
      const msg = normalizeComplaintMessagePayload(data.payload, cid);
      if (msg) msgSubs.get(cid)?.forEach((fn) => fn(msg));
    } else if (t === "typing") {
      const ev = normalizeComplaintTypingPayload(data, cid);
      if (ev) typingSubs.get(cid)?.forEach((fn) => fn(ev.userName, ev.typing));
    } else if (t === "readReceipt") {
      const ev = normalizeComplaintReadReceiptPayload(data, cid);
      if (ev) readSubs.get(cid)?.forEach((fn) => fn(ev.readerUserName, ev.lastReadMessageId));
    } else if (t === "messageDeleted") {
      const mid = data.messageId;
      const n = typeof mid === "number" ? mid : Number(mid);
      if (Number.isFinite(n)) delSubs.get(cid)?.forEach((fn) => fn(Math.trunc(n)));
    }
  } catch {
    /* ignore */
  }
}

function ensureTopicSubscription(client: Client, cid: number): void {
  if (stompTopicSub.has(cid)) return;
  const sub = client.subscribe(`/topic/complaint/${cid}`, (frame) => dispatchFrame(cid, frame));
  stompTopicSub.set(cid, { unsubscribe: () => sub.unsubscribe() });
}

function maybeDropTopicSubscription(cid: number): void {
  const n =
    (msgSubs.get(cid)?.size ?? 0) +
    (delSubs.get(cid)?.size ?? 0) +
    (typingSubs.get(cid)?.size ?? 0) +
    (readSubs.get(cid)?.size ?? 0);
  if (n === 0) {
    stompTopicSub.get(cid)?.unsubscribe();
    stompTopicSub.delete(cid);
  }
}

export function getComplaintBrokerUrl(): string | null {
  const explicit = import.meta.env.VITE_STOMP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  if (import.meta.env.DEV && typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/chat`;
  }
  const api = import.meta.env.VITE_API_BASE_URL?.trim() || "http://localhost:8080";
  try {
    return `${api.replace(/\/$/, "")}/chat`;
  } catch {
    return null;
  }
}

export function getOrCreateComplaintStompClient(jwt: string): Client | null {
  const base = getComplaintBrokerUrl();
  if (!base) return null;
  const token = jwt.trim();
  if (shared && shared.jwt === token) {
    return shared.client;
  }
  if (shared) {
    try {
      shared.client.deactivate();
    } catch {
      /* ignore */
    }
    shared = null;
    disposeAllTopicSubscriptions();
    clearAllComplaintSubs();
  }
  /** Query token helps some transports; SockJS websocket URL often drops query — auth uses STOMP CONNECT `token` header. */
  const url = `${base}?token=${encodeURIComponent(token)}`;
  const client = new Client({
    connectHeaders: {
      token,
    },
    webSocketFactory: () => new SockJS(url) as unknown as WebSocket,
    reconnectDelay: 4000,
    /** SockJS emulated transports do not support STOMP heartbeats reliably — disable to avoid silent drops. */
    heartbeatIncoming: 0,
    heartbeatOutgoing: 0,
    connectionTimeout: 15000,
    onConnect: () => {
      disposeAllTopicSubscriptions();
      for (const cid of activeComplaintIds()) {
        ensureTopicSubscription(client, cid);
      }
    },
  });
  shared = { client, jwt: token };
  client.activate();
  return client;
}

export function disconnectComplaintStomp(): void {
  if (!shared) return;
  try {
    shared.client.deactivate();
  } catch {
    /* ignore */
  }
  shared = null;
  disposeAllTopicSubscriptions();
  clearAllComplaintSubs();
}

export function subscribeComplaintRealtime(
  complaintId: number,
  jwt: string,
  handlers: {
    onMessage?: MessageCb;
    onMessageDeleted?: MessageDeletedCb;
    onTyping?: TypingCb;
    onReadReceipt?: ReadCb;
  },
): () => void {
  const cid = Math.trunc(Number(complaintId));
  const { onMessage, onMessageDeleted, onTyping, onReadReceipt } = handlers;
  if (onMessage) addSub(msgSubs, cid, onMessage);
  if (onMessageDeleted) addSub(delSubs, cid, onMessageDeleted);
  if (onTyping) addSub(typingSubs, cid, onTyping);
  if (onReadReceipt) addSub(readSubs, cid, onReadReceipt);

  const client = getOrCreateComplaintStompClient(jwt);
  if (client?.connected) {
    ensureTopicSubscription(client, cid);
  }

  return () => {
    if (onMessage) delSub(msgSubs, cid, onMessage);
    if (onMessageDeleted) delSub(delSubs, cid, onMessageDeleted);
    if (onTyping) delSub(typingSubs, cid, onTyping);
    if (onReadReceipt) delSub(readSubs, cid, onReadReceipt);
    maybeDropTopicSubscription(cid);
  };
}

export function emitComplaintTyping(complaintId: number, typing: boolean): void {
  if (!shared?.client?.connected) return;
  try {
    shared.client.publish({
      destination: "/app/complaint.typing",
      body: JSON.stringify({ complaintId, typing }),
    });
  } catch {
    /* ignore */
  }
}

export function emitComplaintRead(complaintId: number, lastReadMessageId: number): void {
  if (!shared?.client?.connected) return;
  try {
    shared.client.publish({
      destination: "/app/complaint.read",
      body: JSON.stringify({ complaintId, lastReadMessageId }),
    });
  } catch {
    /* ignore */
  }
}
