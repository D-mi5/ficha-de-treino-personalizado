import { describe, expect, it } from "vitest";
import { analyzeProfile } from "../metrics.js";
import { buildWorkoutPrompt } from "../prompt.js";

describe("Workout prompt contract", () => {
  it("describes the JSON mapping and optional tecnicaAvancada field", () => {
    const profile = {
      nome: "Cliente Teste",
      idade: 31,
      peso: 63,
      altura: 1.66,
      objetivo: "hipertrofia" as const,
      nivel: "avancado" as const,
      focoTreino: "gluteo" as const,
      diasSemana: 4,
      periodicidade: "semanal" as const,
      observacoes: "Sem restrições relevantes.",
    };

    const analysis = analyzeProfile(profile);
    const prompt = buildWorkoutPrompt(profile, analysis);

    expect(prompt).toContain('1) Análise da cliente -> campo "analise"');
    expect(prompt).toContain('5) Ficha detalhada -> campo "treinos"');
    expect(prompt).toContain('Valores padronizados aceitos para "tecnicaAvancada"');
    expect(prompt).toContain('"tecnicaAvancada": "drop-set"');
    expect(prompt).toContain('Se não houver técnica avançada, omita o campo "tecnicaAvancada".');
    expect(prompt).toContain("Não use markdown. Retorne somente o JSON válido do contrato.");
  });
});