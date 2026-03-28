import { ActivationState, Client } from "@stomp/stompjs";
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
/** Active STOMP subscription per complaint. */
const stompTopicSub = new Map<number, { unsubscribe: () => void }>();
let userTopicSub: { unsubscribe: () => void } | null = null;

function disposeAllTopicSubscriptions(): void {
  for (const { unsubscribe } of stompTopicSub.values()) {
    try {
      unsubscribe();
    } catch {
      /* ignore */
    }
  }
  stompTopicSub.clear();
  if (userTopicSub) {
    try {
      userTopicSub.unsubscribe();
    } catch {
      /* ignore */
    }
    userTopicSub = null;
  }
}

function clearAllComplaintSubs(): void {
  msgSubs.clear();
  delSubs.clear();
  typingSubs.clear();
  readSubs.clear();
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

export function isComplaintStompConnected(): boolean {
  return Boolean(shared?.client?.connected);
}

function parseStompJsonBody(raw: string): Record<string, unknown> | null {
  try {
    let v: unknown = JSON.parse(raw);
    if (typeof v === "string") v = JSON.parse(v);
    if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  } catch {
    return null;
  }
  return null;
}

function dispatchComplaintStompPayload(rawBody: string, topicComplaintHint: number): void {
  try {
    const data = parseStompJsonBody(rawBody);
    if (!data) return;
    const cid = Math.trunc(topicComplaintHint);
    const t = data.type;
    if (t === "message" && data.payload != null) {
      const msg = normalizeComplaintMessagePayload(data.payload, cid);
      if (msg) msgSubs.get(cid)?.forEach((fn) => fn(msg));
      return;
    }
    if (t === "typing") {
      const ev = normalizeComplaintTypingPayload(data, cid);
      if (ev) typingSubs.get(cid)?.forEach((fn) => fn(ev.userName, ev.typing));
      return;
    }
    if (t === "readReceipt") {
      const ev = normalizeComplaintReadReceiptPayload(data, cid);
      if (ev) readSubs.get(cid)?.forEach((fn) => fn(ev.readerUserName, ev.lastReadMessageId));
      return;
    }
    if (t === "messageDeleted") {
      const mid = data.messageId;
      const n = typeof mid === "number" ? mid : Number(mid);
      if (Number.isFinite(n)) delSubs.get(cid)?.forEach((fn) => fn(Math.trunc(n)));
      return;
    }
    // Backward compatibility if backend sends raw message object.
    const msg = normalizeComplaintMessagePayload(data, cid);
    if (msg) msgSubs.get(cid)?.forEach((fn) => fn(msg));
  } catch {
    /* ignore */
  }
}

function decodeJwtUserId(jwt: string): number | null {
  try {
    const parts = jwt.split(".");
    if (parts.length !== 3) return null;
    const p = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = p + "=".repeat((4 - (p.length % 4)) % 4);
    const decoded = JSON.parse(atob(padded)) as { userId?: unknown };
    const n = typeof decoded.userId === "number" ? decoded.userId : Number(decoded.userId);
    return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
  } catch {
    return null;
  }
}

function dispatchUserTopicPayload(rawBody: string): void {
  const data = parseStompJsonBody(rawBody);
  if (!data) return;
  const t = data.type;
  if (t === "typing") {
    const ev = normalizeComplaintTypingPayload(data);
    if (!ev || !Number.isFinite(ev.complaintId)) return;
    typingSubs.get(Math.trunc(ev.complaintId))?.forEach((fn) => fn(ev.userName, ev.typing));
    return;
  }
  if (t === "readReceipt") {
    const ev = normalizeComplaintReadReceiptPayload(data);
    if (!ev || !Number.isFinite(ev.complaintId)) return;
    readSubs
      .get(Math.trunc(ev.complaintId))
      ?.forEach((fn) => fn(ev.readerUserName, ev.lastReadMessageId));
    return;
  }
  if (t === "messageDeleted") {
    const cidRaw = data.complaintId;
    const cid = typeof cidRaw === "number" ? cidRaw : Number(cidRaw);
    const mid = data.messageId;
    const n = typeof mid === "number" ? mid : Number(mid);
    if (!Number.isFinite(cid) || !Number.isFinite(n)) return;
    delSubs.get(Math.trunc(cid))?.forEach((fn) => fn(Math.trunc(n)));
    return;
  }
  if (t === "message" && data.payload != null) {
    const msg = normalizeComplaintMessagePayload(data.payload);
    if (!msg || !Number.isFinite(msg.complaintId)) return;
    const cid = Math.trunc(msg.complaintId);
    msgSubs.get(cid)?.forEach((fn) => fn(msg));
    return;
  }
  const msg = normalizeComplaintMessagePayload(data);
  if (!msg || !Number.isFinite(msg.complaintId)) return;
  msgSubs.get(Math.trunc(msg.complaintId))?.forEach((fn) => fn(msg));
}

function ensureUserTopicSubscription(client: Client, jwt: string): void {
  if (userTopicSub) return;
  const uid = decodeJwtUserId(jwt);
  if (uid == null) return;
  const sub = client.subscribe(`/topic/chat/${uid}`, (frame) => dispatchUserTopicPayload(frame.body));
  userTopicSub = { unsubscribe: () => sub.unsubscribe() };
}

function ensureTopicSubscription(client: Client, cid: number): void {
  if (stompTopicSub.has(cid)) return;
  const sub = client.subscribe(`/topic/complaint/${cid}`, (frame) =>
    dispatchComplaintStompPayload(frame.body, cid),
  );
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
    const c = shared.client;
    if (c.state === ActivationState.INACTIVE) {
      void c.activate();
    }
    return c;
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
      login: token,
      Authorization: `Bearer ${token}`,
    },
    webSocketFactory: () => new SockJS(url) as unknown as WebSocket,
    reconnectDelay: 4000,
    /** SockJS emulated transports do not support STOMP heartbeats reliably — disable to avoid silent drops. */
    heartbeatIncoming: 0,
    heartbeatOutgoing: 0,
    connectionTimeout: 15000,
    onConnect: () => {
      disposeAllTopicSubscriptions();
      ensureUserTopicSubscription(client, token);
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
  getOrCreateComplaintStompClient(jwt);
  if (onMessage) addSub(msgSubs, cid, onMessage);
  if (onMessageDeleted) addSub(delSubs, cid, onMessageDeleted);
  if (onTyping) addSub(typingSubs, cid, onTyping);
  if (onReadReceipt) addSub(readSubs, cid, onReadReceipt);
  let cancelled = false;
  const trySubscribe = () => {
    if (cancelled) return;
    const c = shared?.client;
    if (c?.connected) {
      ensureUserTopicSubscription(c, jwt);
      ensureTopicSubscription(c, cid);
    }
  };
  trySubscribe();
  queueMicrotask(trySubscribe);
  const t1 = window.setTimeout(trySubscribe, 50);
  const t2 = window.setTimeout(trySubscribe, 250);
  const t3 = window.setTimeout(trySubscribe, 1000);

  return () => {
    cancelled = true;
    window.clearTimeout(t1);
    window.clearTimeout(t2);
    window.clearTimeout(t3);
    if (onMessage) delSub(msgSubs, cid, onMessage);
    if (onMessageDeleted) delSub(delSubs, cid, onMessageDeleted);
    if (onTyping) delSub(typingSubs, cid, onTyping);
    if (onReadReceipt) delSub(readSubs, cid, onReadReceipt);
    maybeDropTopicSubscription(cid);
  };
}

/** STOMP send path kept intentionally minimal. */
export function publishComplaintMessage(complaintId: number, messageText: string): boolean {
  if (!shared?.client?.connected) return false;
  const text = messageText.trim();
  if (!text) return false;
  try {
    shared.client.publish({
      destination: `/app/complaint/${complaintId}/send`,
      body: JSON.stringify({ messageText: text }),
    });
    return true;
  } catch {
    return false;
  }
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
