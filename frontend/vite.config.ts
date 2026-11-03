import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig, loadEnv, type Plugin } from "vite";

/**
 * The analytics <script> in index.html only makes sense when its settings exist.
 * Without them the browser would request "%VITE_ANALYTICS_ENDPOINT%/umami" (404).
 */
function analyticsScript(): Plugin {
  return {
    name: "haricart-analytics-script",
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        const endpoint = process.env.VITE_ANALYTICS_ENDPOINT || loadedEnv.VITE_ANALYTICS_ENDPOINT;
        const websiteId = process.env.VITE_ANALYTICS_WEBSITE_ID || loadedEnv.VITE_ANALYTICS_WEBSITE_ID;
        if (endpoint && websiteId) return html;
        return html.replace(/\s*<script[^>]*%VITE_ANALYTICS_ENDPOINT%[\s\S]*?<\/script>/, "");
      },
    },
  };
}

const loadedEnv = loadEnv(process.env.NODE_ENV === "production" ? "production" : "development", path.resolve(import.meta.dirname), "VITE_");

const plugins = [react(), tailwindcss(), analyticsScript()];

// In development the backend runs separately (default http://localhost:3000).
// These paths are forwarded to it so cookies and API calls work as before.
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3000";
const backendProxy = { target: BACKEND_URL, changeOrigin: false };

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@shared": path.resolve(import.meta.dirname, "..", "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname),
  publicDir: path.resolve(import.meta.dirname, "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Split big libraries into their own files so browsers can cache them
        // between releases and the first screen loads faster.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler|wouter)[\\/]/.test(id)) return "react";
          if (id.includes("@radix-ui")) return "radix";
          if (id.includes("@trpc") || id.includes("@tanstack") || id.includes("superjson")) return "data";
          if (id.includes("recharts") || id.includes("d3-")) return "charts";
          if (id.includes("lucide-react")) return "icons";
          return undefined;
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": backendProxy,
    },
    allowedHosts: ["localhost", "127.0.0.1"],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
