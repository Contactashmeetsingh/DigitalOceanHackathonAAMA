import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// During `npm run dev`, proxy API calls to the Flask backend so the frontend
// and backend share one origin. Flask defaults to :8080 (override with PORT).
const BACKEND = process.env.BACKEND_URL || "http://localhost:8080";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": BACKEND,
      "/health": BACKEND,
    },
  },
  build: { outDir: "dist" },
});
