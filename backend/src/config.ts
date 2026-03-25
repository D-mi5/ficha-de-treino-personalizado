interface RuntimeEnv {
  NODE_ENV?: string;
  CORS_ORIGIN?: string;
  AI_PROVIDER?: string;
  OPENAI_API_KEY?: string;
  GEMINI_API_KEY?: string;
}

function hasUsableValue(value: string | undefined): boolean {
  return Boolean(value && value.trim() && !value.includes("sua_chave_aqui"));
}

export function getRuntimeValidationErrors(env: RuntimeEnv = process.env): string[] {
  if (env.NODE_ENV !== "production") {
    return [];
  }

  const errors: string[] = [];
  const provider = (env.AI_PROVIDER || "").trim().toLowerCase();
  const hasOpenAiKey = hasUsableValue(env.OPENAI_API_KEY);
  const hasGeminiKey = hasUsableValue(env.GEMINI_API_KEY);

  if (!hasUsableValue(env.CORS_ORIGIN)) {
    errors.push("CORS_ORIGIN deve ser definido em produção.");
  }

  if (provider === "openai" && !hasOpenAiKey) {
    errors.push("OPENAI_API_KEY deve ser definida quando AI_PROVIDER=openai em produção.");
  }

  if (provider === "gemini" && !hasGeminiKey && !hasOpenAiKey) {
    errors.push("GEMINI_API_KEY ou OPENAI_API_KEY deve ser definida quando AI_PROVIDER=gemini em produção.");
  }

  if (!provider && !hasOpenAiKey && !hasGeminiKey) {
    errors.push("Defina OPENAI_API_KEY ou GEMINI_API_KEY em produção.");
  }

  return errors;
}

export function validateRuntimeConfig(env: RuntimeEnv = process.env): void {
  const errors = getRuntimeValidationErrors(env);

  if (errors.length > 0) {
    throw new Error(`Configuração inválida de produção: ${errors.join(" ")}`);
  }
}
