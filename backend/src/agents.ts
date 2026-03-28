import OpenAI from "openai";
import { buildLocalWorkoutFallback } from "./local-workout-plan.js";
import { logger } from "./logger.js";
import { analyzeProfile } from "./metrics.js";
import { buildWorkoutPrompt } from "./prompt.js";
import { ClientProfile, GenerationFallbackReason, WorkoutResponse } from "./types.js";
import { workoutResponseSchema } from "./schemas.js";
import { buildComplianceRetryInstruction } from "./workout-output-validator.js";
import { CLINICAL_RULES } from "./clinical-rules.js";

type AiProvider = "openai" | "gemini";

const GEMINI_OPENAI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";

const cachedClients: Partial<Record<AiProvider, OpenAI>> = {};
const IA_TIMEOUT_MS = Number(process.env.IA_TIMEOUT_MS || 45000);
const IA_MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 800;
const TRANSIENT_RETRY_BASE_DELAY_MS = 1200;
const AI_SCHEMA_DEBUG = String(process.env.AI_SCHEMA_DEBUG || "").trim().toLowerCase() === "true";
const MAX_ADVANCED_TECHNIQUES_PER_TRAINING = 3;
const AI_TEMPERATURE = Number(process.env.AI_TEMPERATURE || 0.25);
const AI_MAX_TOKENS = Number(process.env.AI_MAX_TOKENS || 5000);
const AI_SYSTEM_PROMPT = [
  "Você é uma personal trainer sênior com foco em segurança clínica, prescrição feminina e resposta estruturada.",
  "Responda somente com JSON válido, sem markdown e sem texto fora do objeto.",
  "Siga rigorosamente o contrato solicitado pelo prompt do usuário.",
  "Priorize consistência clínica, clareza, segurança articular e aderência exata aos campos esperados.",
].join(" ");

type ParseFailureReason = "empty" | "json-parse" | "schema";

class WorkoutPayloadParseError extends Error {
  reason: ParseFailureReason;
  details: string[];

  constructor(message: string, reason: ParseFailureReason, details: string[] = []) {
    super(message);
    this.name = "WorkoutPayloadParseError";
    this.reason = reason;
    this.details = details;
  }
}

function hasValidKey(value: string | undefined): boolean {
  return Boolean(value && value.trim() && !value.includes("sua_chave_aqui"));
}

export interface GenerationReadiness {
  configured: boolean;
  providerPreference: string;
  availableProviders: AiProvider[];
  hasOpenAiKey: boolean;
  hasGeminiKey: boolean;
}

export function getGenerationReadiness(): GenerationReadiness {
  const providerPreference = (process.env.AI_PROVIDER || "").trim().toLowerCase() || "auto";
  const hasOpenAiKey = hasValidKey(process.env.OPENAI_API_KEY);
  const hasGeminiKey = hasValidKey(process.env.GEMINI_API_KEY) || hasOpenAiKey;
  const availableProviders = resolveProviderOrder();

  return {
    configured: hasOpenAiKey || hasGeminiKey,
    providerPreference,
    availableProviders,
    hasOpenAiKey,
    hasGeminiKey,
  };
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

function normalizeCargaValue(value: unknown): unknown {
  const normalized = String(value || "").trim().toLowerCase();

  if (!normalized) {
    return value;
  }

  if (normalized === "leve") return "leve";
  if (normalized === "moderada" || normalized === "moderado" || normalized === "media" || normalized === "média") return "moderada";
  if (normalized === "alta" || normalized === "intensa") return "alta";

  return value;
}

function normalizeTechniqueValue(value: unknown): unknown {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (!normalized) {
    return value;
  }

  const map: Record<string, string> = {
    superserie: "superserie",
    "super-serie": "superserie",
    "super serie": "superserie",
    biset: "bi-set",
    "bi set": "bi-set",
    "bi-set": "bi-set",
    triset: "tri-set",
    "tri set": "tri-set",
    "tri-set": "tri-set",
    restpause: "rest-pause",
    "rest pause": "rest-pause",
    "rest-pause": "rest-pause",
    dropset: "drop-set",
    "drop set": "drop-set",
    "drop-set": "drop-set",
    piramide: "piramide",
    "serie combinada": "serie combinada",
    "serie-combinada": "serie combinada",
  };

  return map[normalized] || value;
}

function normalizeWorkoutPlanCandidate(candidate: unknown): unknown {
  if (!candidate || typeof candidate !== "object") {
    return candidate;
  }

  const plan = candidate as Record<string, unknown>;
  const normalizedPlan: Record<string, unknown> = { ...plan };

  if (Array.isArray(plan.treinos)) {
    normalizedPlan.treinos = plan.treinos.map((treino) => {
      if (!treino || typeof treino !== "object") {
        return treino;
      }

      const normalizedTreino = { ...(treino as Record<string, unknown>) };

      if (Array.isArray(normalizedTreino.exercicios)) {
        normalizedTreino.exercicios = normalizedTreino.exercicios.map((exercicio) => {
          if (!exercicio || typeof exercicio !== "object") {
            return exercicio;
          }

          const normalizedExercicio = { ...(exercicio as Record<string, unknown>) };

          if (typeof normalizedExercicio.series === "string") {
            const parsedSeries = Number.parseInt(normalizedExercicio.series, 10);
            if (Number.isFinite(parsedSeries)) {
              normalizedExercicio.series = parsedSeries;
            }
          }

          if (typeof normalizedExercicio.repeticoes === "number") {
            normalizedExercicio.repeticoes = String(normalizedExercicio.repeticoes);
          }

          normalizedExercicio.carga = normalizeCargaValue(normalizedExercicio.carga);

          if (Object.prototype.hasOwnProperty.call(normalizedExercicio, "tecnicaAvancada")) {
            normalizedExercicio.tecnicaAvancada = normalizeTechniqueValue(normalizedExercicio.tecnicaAvancada);
          }

          return normalizedExercicio;
        });
      }

      return normalizedTreino;
    });
  }

  return normalizedPlan;
}

function hasClinicalBlockForTechniques(profile: ClientProfile, analysis: WorkoutResponse["analysis"]): boolean {
  if (analysis.nivelRisco === "alto") return true;
  if (profile.idade >= 60) return true;
  if (analysis.imc >= CLINICAL_RULES.imcObesidade) return true;

  const notes = (profile.observacoes || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const hasArticularRisk = new RegExp(CLINICAL_RULES.riscoArticularPattern).test(notes);
  const hasComorbidade = new RegExp(CLINICAL_RULES.comorbidadePattern).test(notes);

  return hasArticularRisk || hasComorbidade;
}

function profileAllowsAdvancedTechniques(profile: ClientProfile, analysis: WorkoutResponse["analysis"]): boolean {
  if (profile.nivel === "iniciante") return false;
  if (!profile.focoTreino || profile.focoTreino === "nenhum") return false;
  if (analysis.objetivoFinal !== "hipertrofia" && analysis.objetivoFinal !== "definicao") return false;
  if (hasClinicalBlockForTechniques(profile, analysis)) return false;
  return true;
}

export function applyTechniqueSafetyGuards(response: WorkoutResponse, profile: ClientProfile): WorkoutResponse {
  if (typeof response.workoutPlan === "string") {
    return response;
  }

  const canUseAdvancedTechniques = profileAllowsAdvancedTechniques(profile, response.analysis);

  const treinos = response.workoutPlan.treinos.map((treino) => {
    let preservedTechniques = 0;

    const exercicios = treino.exercicios.map((exercicio) => {
      const cleanNome = canUseAdvancedTechniques
        ? exercicio.nome
        : exercicio.nome.replace(/\s*\([^)]*(?:bi-set|tri-set|drop-set|rest-pause|superserie|pir[aâ]mide|serie combinada)[^)]*\)/gi, "").trim();

      if (!exercicio.tecnicaAvancada) {
        return { ...exercicio, nome: cleanNome };
      }

      if (!canUseAdvancedTechniques) {
        const { tecnicaAvancada: _tecnicaAvancada, ...safeExercise } = exercicio;
        return { ...safeExercise, nome: cleanNome };
      }

      preservedTechniques += 1;
      if (preservedTechniques <= MAX_ADVANCED_TECHNIQUES_PER_TRAINING) {
        return exercicio;
      }

      const { tecnicaAvancada: _tecnicaAvancada, ...safeExercise } = exercicio;
      return safeExercise;
    });

    return {
      ...treino,
      exercicios,
    };
  });

  return {
    ...response,
    workoutPlan: {
      ...response.workoutPlan,
      treinos,
    },
  };
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

  const normalizedWorkoutPlan = normalizeWorkoutPlanCandidate(parsedWorkoutPlan);

  const structuredValidation = workoutResponseSchema.safeParse({
    workoutPlan: normalizedWorkoutPlan,
    analysis,
  });

  if (!structuredValidation.success) {
    const details = structuredValidation.error.issues
      .slice(0, 8)
      .map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join(".") : "root";
        return `${path}: ${issue.message}`;
      });

    throw new WorkoutPayloadParseError(
      "A IA não retornou um JSON válido no formato obrigatório.",
      "schema",
      details,
    );
  }

  return structuredValidation.data;
}

function classifyFallbackReason(error: unknown): GenerationFallbackReason {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error || "").toLowerCase();

  if (!message) {
    return "unknown";
  }

  if (message.includes("timeout")) {
    return "timeout";
  }

  if (message.includes("json") || message.includes("schema") || message.includes("parse")) {
    return "invalid-output";
  }

  if (message.includes("api_key") || message.includes("não foi configurada") || message.includes("not configured")) {
    return "missing-credentials";
  }

  if (message.includes("503") || message.includes("429") || message.includes("rate limit") || message.includes("service unavailable")) {
    return "provider-unavailable";
  }

  return "unknown";
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
    const issueHints = error.details.length > 0
      ? error.details.map((detail) => `Detalhe de validação: ${detail}`)
      : [];

    return buildComplianceRetryInstruction([
      "A resposta da IA não respeitou o JSON obrigatório esperado.",
      "Envie JSON válido com os campos analise, ajusteObjetivo, estrategia, ciclo, treinos, distribuicaoSemanal, substituicoes, cards e observacoesFinais.",
      ...issueHints,
    ]);
  }

  return "";
}

async function requestCompletionWithTimeout(client: OpenAI, model: string, prompt: string) {
  let timeoutHandle: NodeJS.Timeout | undefined;

  try {
    const completionPromise = client.chat.completions.create({
      model,
      temperature: AI_TEMPERATURE,
      max_tokens: AI_MAX_TOKENS,
      messages: [
        {
          role: "system",
          content: AI_SYSTEM_PROMPT,
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
        const response = parseAndValidateWorkoutResponse(content || "", analysis);

        logger.info("generate_workout_provider_success", {
          provider,
          model,
          attempt,
          objetivo: profile.objetivo,
          diasSemana: profile.diasSemana,
        });

        return applyTechniqueSafetyGuards({
          ...response,
          generationMeta: {
            source: "ai",
            provider,
            model,
            attempts: attempt,
          },
        }, profile);
      } catch (error) {
        lastError = error;

        if (AI_SCHEMA_DEBUG && isWorkoutPayloadParseError(error) && error.reason === "schema") {
          logger.warn("generate_workout_schema_mismatch", {
            provider,
            attempt,
            issues: error.details.slice(0, 5),
          });
        }

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
  const fallbackResponse = buildLocalWorkoutFallback(profile, analysis);
  const fallbackReason = classifyFallbackReason(lastError);

  logger.warn("generate_workout_fallback_local", {
    reason: fallbackReason,
    objetivo: profile.objetivo,
    diasSemana: profile.diasSemana,
  });

  return applyTechniqueSafetyGuards({
    ...fallbackResponse,
    generationMeta: {
      source: "fallback-local",
      attempts: IA_MAX_ATTEMPTS,
      fallbackReason,
    },
  }, profile);
}
