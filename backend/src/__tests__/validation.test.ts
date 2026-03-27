import { describe, expect, it } from "vitest";
import { authSchema, historySyncSchema, profileSchema, workoutResponseSchema } from "../schemas.js";

describe("Schema validation", () => {
  it("accepts a valid workout profile", () => {
    const parsed = profileSchema.safeParse({
      idade: 29,
      peso: 64,
      altura: 1.68,
      objetivo: "definicao",
      nivel: "intermediario",
      focoTreino: "gluteo",
      diasSemana: 4,
      observacoes: "Sem restricoes clinicas relevantes",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects invalid objective in profile", () => {
    const parsed = profileSchema.safeParse({
      idade: 29,
      peso: 64,
      altura: 1.68,
      objetivo: "forca",
      nivel: "intermediario",
      diasSemana: 4,
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects focoTreino for iniciantes when different from nenhum", () => {
    const parsed = profileSchema.safeParse({
      idade: 26,
      peso: 62,
      altura: 1.66,
      objetivo: "emagrecimento",
      nivel: "iniciante",
      focoTreino: "gluteo",
      diasSemana: 3,
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects invalid age range", () => {
    const parsed = profileSchema.safeParse({
      idade: 90,
      peso: 64,
      altura: 1.68,
      objetivo: "hipertrofia",
      nivel: "intermediario",
      diasSemana: 4,
    });

    expect(parsed.success).toBe(false);
  });

  it("accepts auth credentials with valid email and password", () => {
    const parsed = authSchema.safeParse({
      email: "cliente@example.com",
      password: "123456",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects short auth password", () => {
    const parsed = authSchema.safeParse({
      email: "cliente@example.com",
      password: "123",
    });

    expect(parsed.success).toBe(false);
  });

  it("accepts history sync payload with valid profile/result", () => {
    const parsed = historySyncSchema.safeParse({
      entries: [
        {
          id: "entry-1",
          createdAt: new Date().toISOString(),
          payload: {
            idade: 28,
            peso: 62,
            altura: 1.65,
            objetivo: "hipertrofia",
            nivel: "intermediario",
            diasSemana: 4,
            custom: "extra",
          },
          result: {
            workoutPlan: "Treino A",
            analysis: {
              imc: 22.8,
              classificacaoImc: "peso adequado",
              intensidadeSugerida: "moderada",
              progressaoSemanal: "Aumentar 3% por semana",
            },
          },
        },
      ],
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects history sync payload when profile is incomplete", () => {
    const parsed = historySyncSchema.safeParse({
      entries: [
        {
          id: "entry-1",
          createdAt: new Date().toISOString(),
          payload: {
            idade: 28,
          },
          result: {
            workoutPlan: "Treino A",
            analysis: {
              imc: 22.8,
              classificacaoImc: "peso adequado",
              intensidadeSugerida: "moderada",
              progressaoSemanal: "Aumentar 3% por semana",
            },
          },
        },
      ],
    });

    expect(parsed.success).toBe(false);
  });

  it("accepts structured workout response with optional tecnicaAvancada", () => {
    const parsed = workoutResponseSchema.safeParse({
      workoutPlan: {
        analise: "Cliente avançada, baixo risco e boa tolerância de recuperação.",
        ajusteObjetivo: "Objetivo mantido em hipertrofia.",
        estrategia: "Divisão com ênfase em glúteos e uso pontual de intensificação.",
        ciclo: "Ciclo semanal com progressão simples.",
        treinos: [
          {
            dia: "A",
            nome: "Glúteos prioritários",
            exercicios: [
              {
                nome: "Elevação pélvica",
                series: 4,
                repeticoes: "8 a 10",
                carga: "alta",
                grupoMuscular: "gluteos",
                tecnicaAvancada: "rest-pause",
              },
              {
                nome: "Agachamento guiado",
                series: 4,
                repeticoes: "8 a 10",
                carga: "alta",
                grupoMuscular: "quadriceps",
              },
              {
                nome: "Abdução de quadril",
                series: 3,
                repeticoes: "12 a 15",
                carga: "moderada",
                grupoMuscular: "gluteos",
              },
            ],
          },
        ],
        distribuicaoSemanal: ["Segunda: Treino A", "Quinta: Treino A"],
        substituicoes: ["Trocar por máquina guiada se houver desconforto articular."],
        cards: {
          comentarios: ["Mantenha execução controlada.", "Use intensificação com critério."],
          dicas: ["Aqueça antes das séries principais.", "Respeite recuperação entre sessões."],
        },
        observacoesFinais: "Evolua a carga apenas com técnica estável.",
      },
      analysis: {
        imc: 22.8,
        classificacaoImc: "peso adequado",
        intensidadeSugerida: "intensa",
        progressaoSemanal: "Aumentar a carga quando completar a faixa alvo com boa execução.",
        contextoClinico: "Sem restrições relevantes.",
        mensagemAjuste: null,
        objetivoFinal: "hipertrofia",
        diasTreinoAjustados: 4,
        motivoAjusteDiasTreino: null,
        nivelRisco: "baixo",
        comentariosEssenciais: ["Recuperação adequada.", "Boa tolerância para progressão."],
      },
      generationMeta: {
        source: "ai",
        provider: "openai",
        model: "gpt-4o-mini",
        attempts: 1,
      },
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects tecnicaAvancada outside the standardized contract", () => {
    const parsed = workoutResponseSchema.safeParse({
      workoutPlan: {
        analise: "Analise válida.",
        ajusteObjetivo: "Objetivo mantido.",
        estrategia: "Estratégia válida.",
        ciclo: "Ciclo semanal.",
        treinos: [
          {
            dia: "A",
            nome: "Treino A",
            exercicios: [
              {
                nome: "Cadeira extensora",
                series: 3,
                repeticoes: "10 a 12",
                carga: "moderada",
                grupoMuscular: "quadriceps",
                tecnicaAvancada: "dropset",
              },
              {
                nome: "Leg press",
                series: 3,
                repeticoes: "10 a 12",
                carga: "moderada",
                grupoMuscular: "quadriceps",
              },
              {
                nome: "Hack machine",
                series: 3,
                repeticoes: "10 a 12",
                carga: "moderada",
                grupoMuscular: "quadriceps",
              },
            ],
          },
        ],
        distribuicaoSemanal: ["Segunda: Treino A", "Quarta: Treino A"],
        substituicoes: [],
        cards: {
          comentarios: ["Comentário 1", "Comentário 2"],
          dicas: ["Dica 1", "Dica 2"],
        },
        observacoesFinais: "Fechamento válido.",
      },
      analysis: {
        imc: 22.8,
        classificacaoImc: "peso adequado",
        intensidadeSugerida: "moderada",
        progressaoSemanal: "Progressão estável.",
        contextoClinico: "Sem restrições relevantes.",
        mensagemAjuste: null,
        objetivoFinal: "hipertrofia",
        diasTreinoAjustados: 4,
        motivoAjusteDiasTreino: null,
        nivelRisco: "baixo",
        comentariosEssenciais: ["Comentário A", "Comentário B"],
      },
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects invalid generation source metadata", () => {
    const parsed = workoutResponseSchema.safeParse({
      workoutPlan: {
        analise: "Analise válida.",
        ajusteObjetivo: "Objetivo mantido.",
        estrategia: "Estratégia válida.",
        ciclo: "Ciclo semanal.",
        treinos: [
          {
            dia: "A",
            nome: "Treino A",
            exercicios: [
              { nome: "Cadeira extensora", series: 3, repeticoes: "10 a 12", carga: "moderada", grupoMuscular: "quadriceps" },
              { nome: "Leg press", series: 3, repeticoes: "10 a 12", carga: "moderada", grupoMuscular: "quadriceps" },
              { nome: "Hack machine", series: 3, repeticoes: "10 a 12", carga: "moderada", grupoMuscular: "quadriceps" },
            ],
          },
        ],
        distribuicaoSemanal: ["Segunda: Treino A", "Quarta: Treino A"],
        substituicoes: [],
        cards: { comentarios: ["Comentário 1", "Comentário 2"], dicas: ["Dica 1", "Dica 2"] },
        observacoesFinais: "Fechamento válido.",
      },
      analysis: {
        imc: 22.8,
        classificacaoImc: "peso adequado",
        intensidadeSugerida: "moderada",
        progressaoSemanal: "Progressão estável.",
        contextoClinico: "Sem restrições relevantes.",
        mensagemAjuste: null,
        objetivoFinal: "hipertrofia",
        diasTreinoAjustados: 4,
        motivoAjusteDiasTreino: null,
        nivelRisco: "baixo",
        comentariosEssenciais: ["Comentário A", "Comentário B"],
      },
      generationMeta: {
        source: "ia",
      },
    });

    expect(parsed.success).toBe(false);
  });

});