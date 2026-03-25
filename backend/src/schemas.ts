import { z } from "zod";

export const profileSchema = z.object({
  idade: z.number().int().min(14).max(85),
  peso: z.number().min(35).max(250),
  altura: z.number().min(1.3).max(2.2),
  objetivo: z.enum(["emagrecimento", "hipertrofia", "definicao"]),
  nivel: z.enum(["iniciante", "intermediario", "avancado"]),
  diasSemana: z.number().int().min(2).max(7),
  observacoes: z.string().max(400).optional(),
});

export const workoutAnalysisSchema = z.object({
  imc: z.number().min(10).max(80),
  classificacaoImc: z.string().min(1).max(120),
  intensidadeSugerida: z.enum(["leve", "moderada", "intensa"]),
  progressaoSemanal: z.string().min(1).max(500),
  contextoClinico: z.string().max(1000).optional(),
  mensagemAjuste: z.string().max(1000).nullable().optional(),
});

export const workoutResponseSchema = z.object({
  workoutPlan: z.string().min(1).max(12000),
  analysis: workoutAnalysisSchema,
});

export const historySyncSchema = z.object({
  entries: z
    .array(
      z.object({
        id: z.string().min(1).max(120),
        createdAt: z.string().datetime(),
        payload: profileSchema.passthrough(),
        result: workoutResponseSchema,
      }),
    )
    .max(100)
    .optional(),
});

export const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
