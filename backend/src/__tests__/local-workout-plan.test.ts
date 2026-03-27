import { describe, expect, it } from "vitest";
import { buildLocalWorkoutFallback } from "../local-workout-plan.js";
import { analyzeProfile } from "../metrics.js";
import { workoutResponseSchema } from "../schemas.js";

describe("Local workout fallback", () => {
  it("builds a structured workout response valid for the frontend contract", () => {
    const profile = {
      nome: "Cliente Teste",
      idade: 34,
      peso: 68,
      altura: 1.67,
      objetivo: "hipertrofia" as const,
      nivel: "intermediario" as const,
      focoTreino: "gluteo" as const,
      diasSemana: 4,
      periodicidade: "semanal" as const,
      observacoes: "Sem restrições relevantes.",
    };

    const analysis = analyzeProfile(profile);
    const result = buildLocalWorkoutFallback(profile, analysis);
    const parsed = workoutResponseSchema.safeParse(result);

    expect(parsed.success).toBe(true);
    expect(typeof result.workoutPlan).toBe("object");
    if (typeof result.workoutPlan !== "string") {
      expect(result.workoutPlan.treinos.length).toBeGreaterThanOrEqual(2);
      expect(result.workoutPlan.distribuicaoSemanal.length).toBe(result.workoutPlan.treinos.length);
      expect(result.workoutPlan.cards.dicas.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("keeps fallback conservative for beginner emagrecimento with obesity", () => {
    const profile = {
      nome: "Cliente Iniciante",
      idade: 27,
      peso: 88,
      altura: 1.62,
      objetivo: "emagrecimento" as const,
      nivel: "iniciante" as const,
      focoTreino: "nenhum" as const,
      diasSemana: 3,
      periodicidade: "semanal" as const,
      observacoes: "Sedentária recente, sem lesões diagnosticadas, refere cansaço fácil.",
    };

    const analysis = analyzeProfile(profile);
    const result = buildLocalWorkoutFallback(profile, analysis);

    expect(typeof result.workoutPlan).toBe("object");
    if (typeof result.workoutPlan === "string") {
      throw new Error("Structured workout plan expected");
    }

    const exercicios = result.workoutPlan.treinos.flatMap((treino) => treino.exercicios);
    const nomes = exercicios.map((exercicio) => exercicio.nome);
    const cargas = new Set(exercicios.map((exercicio) => exercicio.carga));

    expect(cargas.has("leve")).toBe(true);
    expect(nomes).not.toContain("Hack machine");
    expect(nomes).not.toContain("Afundo no smith");
    expect(nomes).not.toContain("Stiff com halteres");
    expect(nomes).not.toContain("Levantamento romeno");
  });
});