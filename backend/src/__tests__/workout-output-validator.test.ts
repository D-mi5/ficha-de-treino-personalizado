import { describe, expect, it } from "vitest";
import { buildComplianceRetryInstruction, validateWorkoutOutput } from "../workout-output-validator.js";
import { ClientProfile } from "../types.js";

const baseProfile: ClientProfile = {
  nome: "Ana",
  idade: 29,
  peso: 64,
  altura: 1.68,
  objetivo: "hipertrofia",
  nivel: "intermediario",
  focoTreino: "gluteo",
  diasSemana: 4,
  periodicidade: "semanal",
  observacoes: "Sem comorbidades relevantes",
};

const validWorkoutPlan = `
1) Análise da cliente
Cliente com IMC adequado e boa resposta para progressão.

2) Ajuste de objetivo
Objetivo foi mantido em hipertrofia.

3) Estratégia da ficha
A divisão foi escolhida para priorizar recuperação e ênfase muscular.

4) Estrutura do ciclo
Ciclo semanal com progressão simples.

Enfase aplicada: gluteo

5) Ficha detalhada
Treino A
Elevacao pelvica - 4x10 a 12 - carga moderada (gluteo)
Agachamento guiado - 3x10 a 12 - carga moderada (quadriceps)

6) Distribuição por dias
Segunda treino A, terça cardio leve, quinta treino A.

7) Substituições inteligentes
Substituicoes: hip thrust por glute bridge.

8) Dicas finais
1) Hidrate-se.
2) Mantenha técnica.
3) Respeite recuperação.

9) Comentários curtos para cards
Cards: constância, hidratação e execução.

10) Fechamento profissional
Siga com consistência e segurança para evolução progressiva.
`;

describe("workout output validator", () => {
  it("accepts a compliant output", () => {
    const result = validateWorkoutOutput(validWorkoutPlan, baseProfile);

    expect(result.ok).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("rejects output when required sections are missing", () => {
    const result = validateWorkoutOutput("Treino A\nAgachamento - 3x10 - carga moderada (quadriceps)", baseProfile);

    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.includes("Seção obrigatória ausente"))).toBe(true);
  });

  it("rejects output when emphasis line is missing for focused profile", () => {
    const noEmphasis = validWorkoutPlan.replace("Enfase aplicada: gluteo\n\n", "");
    const result = validateWorkoutOutput(noEmphasis, baseProfile);

    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.includes("Enfase aplicada"))).toBe(true);
  });

  it("rejects invalid exercise format", () => {
    const invalidFormat = validWorkoutPlan.replace(
      "Elevacao pelvica - 4x10 a 12 - carga moderada (gluteo)",
      "Elevacao pelvica - 4x10 a 12 - carga moderada gluteo",
    );

    const result = validateWorkoutOutput(invalidFormat, baseProfile);

    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.includes("formato esperado"))).toBe(true);
  });

  it("builds retry instruction with numbered issues", () => {
    const instruction = buildComplianceRetryInstruction([
      "Seção obrigatória ausente: ajuste de objetivo.",
      "Linha obrigatória ausente: Enfase aplicada: <foco escolhido>.",
    ]);

    expect(instruction).toContain("1)");
    expect(instruction).toContain("2)");
    expect(instruction).toContain("Reescreva a resposta inteira do zero");
  });
});
