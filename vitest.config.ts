import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["backend/src/**/*.test.ts", "backend/src/**/__tests__/**/*.ts"],
    exclude: ["backend/dist/**", "node_modules/**"],
  },
});
