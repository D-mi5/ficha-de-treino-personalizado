import OpenAI from "openai";
import { analyzeProfile } from "./metrics.js";
import { buildWorkoutPrompt } from "./prompt.js";
import { ClientProfile, WorkoutResponse } from "./types.js";

type AiProvider = "openai" | "gemini";

const GEMINI_OPENAI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";

let cachedClient: OpenAI | null = null;
let cachedProvider: AiProvider | null = null;

function resolveProvider(): AiProvider {
  const explicitProvider = process.env.AI_PROVIDER?.trim().toLowerCase();

  if (explicitProvider === "gemini") {
    return "gemini";
  }

  if (explicitProvider === "openai") {
    return "openai";
  }

  if (process.env.GEMINI_API_KEY) {
    return "gemini";
  }

  return "openai";
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

function getOpenAiClient(): OpenAI {
  const provider = resolveProvider();

  if (cachedClient && cachedProvider === provider) {
    return cachedClient;
  }

  const apiKey = getApiKey(provider);

  if (provider === "gemini") {
    cachedClient = new OpenAI({
      apiKey,
      baseURL: GEMINI_OPENAI_BASE_URL,
    });
    cachedProvider = provider;
    return cachedClient;
  }

  cachedClient = new OpenAI({ apiKey });
  cachedProvider = provider;
  return cachedClient;
}

export async function generateWorkout(profile: ClientProfile): Promise<WorkoutResponse> {
  const client = getOpenAiClient();
  const provider = resolveProvider();
  const model = getModel(provider);
  const analysis = analyzeProfile(profile);
  const prompt = buildWorkoutPrompt(profile, analysis);

  const completion = await client.chat.completions.create({
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

  const workoutPlan = completion.choices[0]?.message?.content?.trim();

  if (!workoutPlan) {
    throw new Error("A IA não retornou conteúdo para a ficha de treino.");
  }

  return { workoutPlan, analysis };
}
