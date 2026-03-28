/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  /** Override SockJS/STOMP base (e.g. http://localhost:8080/chat). Otherwise uses `VITE_API_BASE_URL` + `/chat` (direct to API; avoids Vite `/chat` proxy). */
  readonly VITE_STOMP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
