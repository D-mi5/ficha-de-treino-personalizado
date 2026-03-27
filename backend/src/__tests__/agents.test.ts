import { describe, expect, it } from "vitest";
import { applyTechniqueSafetyGuards } from "../agents.js";
import { WorkoutResponse } from "../types.js";

function buildBaseResponse(): WorkoutResponse {
  return {
    workoutPlan: {
      analise: "Analise valida.",
      ajusteObjetivo: "Objetivo mantido.",
      estrategia: "Estratégia valida.",
      ciclo: "Ciclo semanal.",
      treinos: [
        {
          dia: "A",
          nome: "Treino A",
          exercicios: [
            { nome: "Exercicio 1", series: 4, repeticoes: "8 a 10", carga: "alta", grupoMuscular: "gluteos", tecnicaAvancada: "drop-set" },
            { nome: "Exercicio 2", series: 4, repeticoes: "8 a 10", carga: "alta", grupoMuscular: "gluteos", tecnicaAvancada: "rest-pause" },
            { nome: "Exercicio 3", series: 4, repeticoes: "8 a 10", carga: "alta", grupoMuscular: "gluteos", tecnicaAvancada: "bi-set" },
            { nome: "Exercicio 4", series: 4, repeticoes: "8 a 10", carga: "alta", grupoMuscular: "gluteos" },
          ],
        },
      ],
      distribuicaoSemanal: ["Segunda: Treino A", "Quinta: Treino A"],
      substituicoes: [],
      cards: {
        comentarios: ["Comentario 1", "Comentario 2"],
        dicas: ["Dica 1", "Dica 2"],
      },
      observacoesFinais: "Fechamento valido.",
    },
    analysis: {
      imc: 22.8,
      classificacaoImc: "peso adequado",
      intensidadeSugerida: "intensa",
      progressaoSemanal: "Progressao valida.",
      contextoClinico: "Sem restricoes relevantes.",
      mensagemAjuste: null,
      objetivoFinal: "hipertrofia",
      diasTreinoAjustados: 4,
      motivoAjusteDiasTreino: null,
      nivelRisco: "baixo",
      comentariosEssenciais: ["Comentario A", "Comentario B"],
    },
    generationMeta: {
      source: "ai",
      provider: "gemini",
      model: "gemini-2.5-flash",
      attempts: 2,
    },
  };
}

describe("applyTechniqueSafetyGuards", () => {
  it("removes advanced techniques when profile is not advanced", () => {
    const response = buildBaseResponse();
    const guarded = applyTechniqueSafetyGuards(response, {
      nome: "Cliente",
      idade: 30,
      peso: 63,
      altura: 1.66,
      objetivo: "hipertrofia",
      nivel: "intermediario",
      focoTreino: "gluteo",
      diasSemana: 4,
      periodicidade: "semanal",
      observacoes: "Sem restricoes.",
    });

    if (typeof guarded.workoutPlan === "string") {
      throw new Error("Structured workout plan expected");
    }

    const techniques = guarded.workoutPlan.treinos.flatMap((treino) => treino.exercicios.map((exercicio) => exercicio.tecnicaAvancada));
    expect(techniques.every((value) => value === undefined)).toBe(true);
  });

  it("limits advanced techniques to two per training block", () => {
    const response = buildBaseResponse();
    const guarded = applyTechniqueSafetyGuards(response, {
      nome: "Cliente",
      idade: 30,
      peso: 63,
      altura: 1.66,
      objetivo: "hipertrofia",
      nivel: "avancado",
      focoTreino: "gluteo",
      diasSemana: 4,
      periodicidade: "semanal",
      observacoes: "Sem restricoes.",
    });

    if (typeof guarded.workoutPlan === "string") {
      throw new Error("Structured workout plan expected");
    }

    const treino = guarded.workoutPlan.treinos[0];
    const techniqueCount = treino.exercicios.filter((exercicio) => exercicio.tecnicaAvancada).length;

    expect(techniqueCount).toBe(2);
    expect(treino.exercicios[0].tecnicaAvancada).toBe("drop-set");
    expect(treino.exercicios[1].tecnicaAvancada).toBe("rest-pause");
    expect(treino.exercicios[2].tecnicaAvancada).toBeUndefined();
  });
});
