/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  /** SockJS/STOMP endpoint base for complaint realtime (e.g. http://localhost:8080/chat). In dev, defaults to same-origin `/chat` (Vite proxy). */
  readonly VITE_STOMP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
