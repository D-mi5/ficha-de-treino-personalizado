export type Objetivo = "emagrecimento" | "hipertrofia" | "definicao";
export type Nivel = "iniciante" | "intermediario" | "avancado";

export interface ClientProfile {
  idade: number;
  peso: number;
  altura: number;
  objetivo: Objetivo;
  nivel: Nivel;
  diasSemana: number;
  observacoes?: string;
}

export interface WorkoutAnalysis {
  imc: number;
  classificacaoImc: string;
  intensidadeSugerida: "leve" | "moderada" | "intensa";
  progressaoSemanal: string;
}

export interface WorkoutResponse {
  workoutPlan: string;
  analysis: WorkoutAnalysis;
}
