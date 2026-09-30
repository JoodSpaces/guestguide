import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./__tests__/setup.ts"],
    exclude: ["e2e/**", "node_modules/**", "mobile/**", "tools/**"],   // tools/sql/*.test.mjs run with node in their own CI step
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
