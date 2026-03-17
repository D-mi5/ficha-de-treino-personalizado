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

export const pdfRequestSchema = z.object({
  profile: profileSchema,
  result: z.object({
    workoutPlan: z.string().min(20),
    analysis: z.object({
      imc: z.number(),
      classificacaoImc: z.string(),
      intensidadeSugerida: z.enum(["leve", "moderada", "intensa"]),
      progressaoSemanal: z.string(),
    }),
  }),
});

export const historySyncSchema = z.object({
  entries: z
    .array(
      z.object({
        id: z.string(),
        createdAt: z.string(),
        payload: z.object({}).passthrough(),
        result: z.object({}).passthrough(),
      }),
    )
    .optional(),
});

export const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
