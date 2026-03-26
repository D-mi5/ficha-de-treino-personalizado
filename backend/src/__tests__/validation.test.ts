import { describe, expect, it } from "vitest";
import { authSchema, historySyncSchema, profileSchema } from "../schemas.js";

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

});