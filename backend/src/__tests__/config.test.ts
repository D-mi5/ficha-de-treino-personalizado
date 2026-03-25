import { describe, expect, it } from "vitest";
import { getRuntimeValidationErrors } from "../config.js";

describe("Runtime configuration validation", () => {
  it("does not require production settings outside production", () => {
    const errors = getRuntimeValidationErrors({ NODE_ENV: "development" });

    expect(errors).toEqual([]);
  });

  it("requires cors origin and ai key in production by default", () => {
    const errors = getRuntimeValidationErrors({ NODE_ENV: "production" });

    expect(errors).toContain("CORS_ORIGIN deve ser definido em produção.");
    expect(errors).toContain("Defina OPENAI_API_KEY ou GEMINI_API_KEY em produção.");
  });

  it("requires matching provider credentials in production", () => {
    const errors = getRuntimeValidationErrors({
      NODE_ENV: "production",
      CORS_ORIGIN: "https://app.example.com",
      AI_PROVIDER: "openai",
    });

    expect(errors).toContain("OPENAI_API_KEY deve ser definida quando AI_PROVIDER=openai em produção.");
  });

  it("accepts valid production configuration", () => {
    const errors = getRuntimeValidationErrors({
      NODE_ENV: "production",
      CORS_ORIGIN: "https://app.example.com",
      AI_PROVIDER: "gemini",
      GEMINI_API_KEY: "secret-key",
    });

    expect(errors).toEqual([]);
  });
});
