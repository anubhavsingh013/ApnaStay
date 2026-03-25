import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiBase = env.VITE_API_BASE_URL || "http://localhost:8080";

  return {
    /** sockjs-client and similar expect Node's `global` */
    define: {
      global: "globalThis",
    },
    server: {
      host: "localhost",
      port: 3000,
      hmr: {
        overlay: false,
      },
      proxy: {
        "/api": {
          target: apiBase,
          changeOrigin: true,
        },
        /** STOMP/SockJS complaint chat — same origin in dev, forwarded to Spring on :8080 */
        "/chat": {
          target: apiBase,
          ws: true,
          changeOrigin: true,
        },
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
