import { z } from "zod";

const focoTreinoSchema = z.enum(["nenhum", "quadriceps", "gluteo", "posteriores", "costas", "peito"]);

const profileSchemaBase = z.object({
  nome: z.string().trim().min(2).max(80).optional(),
  idade: z.number().int().min(14).max(85),
  peso: z.number().min(35).max(250),
  altura: z.number().min(1.3).max(2.2),
  objetivo: z.enum(["emagrecimento", "hipertrofia", "definicao"]),
  nivel: z.enum(["iniciante", "intermediario", "avancado"]),
  focoTreino: focoTreinoSchema.optional().default("nenhum"),
  diasSemana: z.number().int().min(2).max(7),
  periodicidade: z.enum(["semanal", "quinzenal", "mensal"]).optional().default("semanal"),
  observacoes: z.string().max(400).optional(),
});

export const profileSchema = profileSchemaBase.superRefine((data, ctx) => {
  if (data.nivel === "iniciante" && data.focoTreino !== "nenhum") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["focoTreino"],
      message: "Para nível iniciante, o foco de treino deve ser 'nenhum'.",
    });
  }
});

export const workoutAnalysisSchema = z.object({
  imc: z.number().min(10).max(80),
  classificacaoImc: z.string().min(1).max(120),
  intensidadeSugerida: z.enum(["leve", "moderada", "intensa"]),
  progressaoSemanal: z.string().min(1).max(500),
  contextoClinico: z.string().max(1000),
  mensagemAjuste: z.string().max(1000).nullable(),
  objetivoFinal: z.enum(["emagrecimento", "hipertrofia", "definicao"]),
  diasTreinoAjustados: z.number().int().min(1).max(7),
  motivoAjusteDiasTreino: z.string().max(500).nullable(),
  nivelRisco: z.enum(["baixo", "moderado", "alto"]),
  comentariosEssenciais: z.array(z.string().min(1).max(240)).max(6),
});

const exercicioSchema = z.object({
  nome: z.string().min(1),
  series: z.number().min(1).max(6),
  repeticoes: z.string().min(1),
  carga: z.enum(["leve", "moderada", "alta"]),
  grupoMuscular: z.string().min(1),
});

const treinoSchema = z.object({
  dia: z.string().min(1),
  nome: z.string().min(1),
  exercicios: z.array(exercicioSchema).min(3).max(10),
});

const cardsSchema = z.object({
  comentarios: z.array(z.string().min(1).max(200)).min(2).max(6),
  dicas: z.array(z.string().min(1).max(200)).min(2).max(6),
});

export const workoutPlanSchema = z.object({
  analise: z.string().min(1),
  ajusteObjetivo: z.string().min(1),
  estrategia: z.string().min(1),
  ciclo: z.string().min(1),
  treinos: z.array(treinoSchema).min(1).max(6),
  distribuicaoSemanal: z.array(z.string().min(1)).min(2).max(7),
  substituicoes: z.array(z.string().min(1)).max(6),
  cards: cardsSchema,
  observacoesFinais: z.string().min(1),
});

export const workoutResponseSchema = z.object({
  workoutPlan: workoutPlanSchema,
  analysis: workoutAnalysisSchema,
});

// Histórico pode conter entradas antigas sem todos os novos campos analíticos.
const historyWorkoutAnalysisSchema = z.object({
  imc: z.number().min(10).max(80),
  classificacaoImc: z.string().min(1).max(120),
  intensidadeSugerida: z.enum(["leve", "moderada", "intensa"]),
  progressaoSemanal: z.string().min(1).max(500),
  contextoClinico: z.string().max(1000).optional(),
  mensagemAjuste: z.string().max(1000).nullable().optional(),
  objetivoFinal: z.enum(["emagrecimento", "hipertrofia", "definicao"]).optional(),
  diasTreinoAjustados: z.number().int().min(1).max(7).optional(),
  motivoAjusteDiasTreino: z.string().max(500).nullable().optional(),
  nivelRisco: z.enum(["baixo", "moderado", "alto"]).optional(),
  comentariosEssenciais: z.array(z.string().min(1).max(240)).max(6).optional(),
});

const historyWorkoutResponseSchema = z.object({
  workoutPlan: z.union([z.string().min(1).max(12000), workoutPlanSchema]),
  analysis: z.union([historyWorkoutAnalysisSchema, workoutAnalysisSchema]),
});

export const historySyncSchema = z.object({
  entries: z
    .array(
      z.object({
        id: z.string().min(1).max(120),
        createdAt: z.string().datetime(),
        payload: profileSchemaBase.passthrough(),
        result: historyWorkoutResponseSchema,
      }),
    )
    .max(100)
    .optional(),
});

export const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
