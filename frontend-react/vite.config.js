import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api":  { target: process.env.VITE_PROXY_API || "http://127.0.0.1:8080", changeOrigin: true },
      "/face": { target: process.env.VITE_PROXY_FACE || "http://127.0.0.1:5002", changeOrigin: true },
    },
  },
});
