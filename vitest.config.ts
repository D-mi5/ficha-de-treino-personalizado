import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["backend/src/**/*.test.ts", "backend/src/**/__tests__/**/*.ts"],
    exclude: ["backend/dist/**", "node_modules/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "lcov"],
      reportsDirectory: "coverage",
      include: ["backend/src/**/*.ts"],
      exclude: ["backend/src/**/__tests__/**", "backend/src/server.ts"],
    },
  },
});
