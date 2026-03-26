import OpenAI from "openai";
import { buildLocalWorkoutFallback } from "./local-workout-plan.js";
import { analyzeProfile } from "./metrics.js";
import { buildWorkoutPrompt } from "./prompt.js";
import { ClientProfile, WorkoutResponse } from "./types.js";
import { workoutResponseSchema } from "./schemas.js";
import { buildComplianceRetryInstruction } from "./workout-output-validator.js";

type AiProvider = "openai" | "gemini";

const GEMINI_OPENAI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";

const cachedClients: Partial<Record<AiProvider, OpenAI>> = {};
const IA_TIMEOUT_MS = Number(process.env.IA_TIMEOUT_MS || 45000);
const IA_MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 800;
const TRANSIENT_RETRY_BASE_DELAY_MS = 1200;

type ParseFailureReason = "empty" | "json-parse" | "schema";

class WorkoutPayloadParseError extends Error {
  reason: ParseFailureReason;

  constructor(message: string, reason: ParseFailureReason) {
    super(message);
    this.name = "WorkoutPayloadParseError";
    this.reason = reason;
  }
}

function hasValidKey(value: string | undefined): boolean {
  return Boolean(value && value.trim() && !value.includes("sua_chave_aqui"));
}

function resolveProviderOrder(): AiProvider[] {
  const explicitProvider = process.env.AI_PROVIDER?.trim().toLowerCase();
  const hasGemini = hasValidKey(process.env.GEMINI_API_KEY) || hasValidKey(process.env.OPENAI_API_KEY);
  const hasOpenAi = hasValidKey(process.env.OPENAI_API_KEY);

  if (explicitProvider === "gemini") {
    return hasOpenAi ? ["gemini", "openai"] : ["gemini"];
  }

  if (explicitProvider === "openai") {
    return hasGemini ? ["openai", "gemini"] : ["openai"];
  }

  if (hasGemini && hasOpenAi) {
    return ["gemini", "openai"];
  }

  if (hasGemini) {
    return ["gemini"];
  }

  return ["openai"];
}

function getModel(provider: AiProvider): string {
  if (provider === "gemini") {
    return process.env.GEMINI_MODEL || "gemini-2.5-flash";
  }

  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

function getApiKey(provider: AiProvider): string {
  const rawKey =
    provider === "gemini"
      ? process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY
      : process.env.OPENAI_API_KEY;

  const apiKey = rawKey?.trim();

  if (!apiKey || apiKey.includes("sua_chave_aqui")) {
    const expectedEnv = provider === "gemini" ? "GEMINI_API_KEY" : "OPENAI_API_KEY";
    throw new Error(`${expectedEnv} não foi configurada corretamente no arquivo .env`);
  }

  return apiKey;
}

function getOpenAiClient(provider: AiProvider): OpenAI {
  const cached = cachedClients[provider];
  if (cached) {
    return cached;
  }

  const apiKey = getApiKey(provider);

  if (provider === "gemini") {
    const client = new OpenAI({
      apiKey,
      baseURL: GEMINI_OPENAI_BASE_URL,
    });
    cachedClients[provider] = client;
    return client;
  }

  const client = new OpenAI({ apiKey });
  cachedClients[provider] = client;
  return client;
}

function isTransientAiError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  return (
    message.includes("503")
    || message.includes("429")
    || message.includes("temporarily unavailable")
    || message.includes("service unavailable")
    || message.includes("rate limit")
  );
}

function isWorkoutPayloadParseError(error: unknown): error is WorkoutPayloadParseError {
  return error instanceof WorkoutPayloadParseError;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractJsonObjectCandidate(content: string): string {
  const trimmed = String(content || "").trim();
  if (!trimmed) {
    return "";
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1).trim();
  }

  return trimmed;
}

function parseJsonWithRecovery(candidate: string): unknown {
  try {
    return JSON.parse(candidate);
  } catch {
    const withoutBom = candidate.replace(/^\uFEFF/, "");
    const withoutTrailingCommas = withoutBom.replace(/,(\s*[}\]])/g, "$1");
    return JSON.parse(withoutTrailingCommas);
  }
}

function parseAndValidateWorkoutResponse(content: string, analysis: WorkoutResponse["analysis"]): WorkoutResponse {
  const normalizedContent = String(content || "").trim();
  if (!normalizedContent) {
    throw new WorkoutPayloadParseError("A IA não retornou conteúdo para a ficha de treino.", "empty");
  }

  const jsonCandidate = extractJsonObjectCandidate(normalizedContent);

  let parsedWorkoutPlan: unknown;
  try {
    parsedWorkoutPlan = parseJsonWithRecovery(jsonCandidate);
  } catch {
    throw new WorkoutPayloadParseError("A IA não retornou um JSON parseável no formato obrigatório.", "json-parse");
  }

  const structuredValidation = workoutResponseSchema.safeParse({
    workoutPlan: parsedWorkoutPlan,
    analysis,
  });

  if (!structuredValidation.success) {
    throw new WorkoutPayloadParseError(
      "A IA não retornou um JSON válido no formato obrigatório.",
      "schema",
    );
  }

  return structuredValidation.data;
}

function getComplianceInstructionFromError(error: unknown): string {
  if (!isWorkoutPayloadParseError(error)) {
    return "";
  }

  if (error.reason === "json-parse") {
    return buildComplianceRetryInstruction([
      "A resposta da IA deve ser JSON válido puro, sem texto fora do objeto JSON.",
      "Retorne somente o objeto JSON com os campos obrigatórios do contrato.",
    ]);
  }

  if (error.reason === "schema") {
    return buildComplianceRetryInstruction([
      "A resposta da IA não respeitou o JSON obrigatório esperado.",
      "Envie JSON válido com os campos analise, ajusteObjetivo, estrategia, ciclo, treinos, distribuicaoSemanal, substituicoes, cards e observacoesFinais.",
    ]);
  }

  return "";
}

async function requestCompletionWithTimeout(client: OpenAI, model: string, prompt: string) {
  let timeoutHandle: NodeJS.Timeout | undefined;

  try {
    const completionPromise = client.chat.completions.create({
      model,
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content:
            "Você é uma profissional de educação física e personal trainer sênior, com linguagem objetiva, segura e baseada em evidências.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error(`Timeout: A IA levou mais de ${IA_TIMEOUT_MS / 1000}s para responder. Tente novamente.`));
      }, IA_TIMEOUT_MS);
    });

    return await Promise.race([completionPromise, timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

export async function generateWorkout(profile: ClientProfile): Promise<WorkoutResponse> {
  const providers = resolveProviderOrder();
  const analysis = analyzeProfile(profile);
  const prompt = buildWorkoutPrompt(profile, analysis);

  let lastError: unknown;
  let complianceInstruction = "";

  attemptLoop:
  for (let attempt = 1; attempt <= IA_MAX_ATTEMPTS; attempt += 1) {
    const promptForAttempt = complianceInstruction
      ? `${prompt}\n\n${complianceInstruction}`
      : prompt;

    for (let providerIndex = 0; providerIndex < providers.length; providerIndex += 1) {
      const provider = providers[providerIndex];
      const hasAlternativeProvider = providerIndex < providers.length - 1;

      try {
        const client = getOpenAiClient(provider);
        const model = getModel(provider);
        const completion = await requestCompletionWithTimeout(client, model, promptForAttempt);
        const content = completion.choices[0]?.message?.content?.trim();
        return parseAndValidateWorkoutResponse(content || "", analysis);
      } catch (error) {
        lastError = error;

        if (attempt < IA_MAX_ATTEMPTS) {
          const instruction = getComplianceInstructionFromError(error);
          if (instruction) {
            complianceInstruction = instruction;
            await delay(RETRY_BASE_DELAY_MS * attempt);
            continue attemptLoop;
          }
        }

        if (hasAlternativeProvider) {
          continue;
        }

        if (attempt < IA_MAX_ATTEMPTS && isTransientAiError(error)) {
          await delay(TRANSIENT_RETRY_BASE_DELAY_MS * attempt);
          continue attemptLoop;
        }

        break attemptLoop;
      }
    }
  }

  // Falha controlada de provedor/parsing: mantém contrato estruturado com fallback local.
  return buildLocalWorkoutFallback(profile, analysis);
}
