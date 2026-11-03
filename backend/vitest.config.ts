import { defineConfig } from "vitest/config";
import path from "path";

const root = path.resolve(import.meta.dirname);

export default defineConfig({
  root,
  resolve: {
    alias: {
      // A few "contract" tests check backend and frontend code together
      "@": path.resolve(root, "..", "frontend", "src"),
      "@shared": path.resolve(root, "..", "shared"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.spec.ts"],
  },
});
