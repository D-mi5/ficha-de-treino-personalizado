export type Objetivo = "emagrecimento" | "hipertrofia" | "definicao";
export type Nivel = "iniciante" | "intermediario" | "avancado";
export type Intensidade = "leve" | "moderada" | "intensa";
export type FocoTreino = "nenhum" | "quadriceps" | "gluteo" | "posteriores" | "costas" | "peito";
export type PeriodicidadeFicha = "semanal" | "quinzenal" | "mensal";
export type NivelRisco = "baixo" | "moderado" | "alto";

export interface WorkoutExercise {
  nome: string;
  series: number;
  repeticoes: string;
  carga: "leve" | "moderada" | "alta";
  grupoMuscular: string;
}

export interface WorkoutBlock {
  dia: string;
  nome: string;
  exercicios: WorkoutExercise[];
}

export interface WorkoutCards {
  comentarios: string[];
  dicas: string[];
}

export interface StructuredWorkoutPlan {
  analise: string;
  ajusteObjetivo: string;
  estrategia: string;
  ciclo: string;
  treinos: WorkoutBlock[];
  distribuicaoSemanal: string[];
  substituicoes: string[];
  cards: WorkoutCards;
  observacoesFinais: string;
}

export interface ClientProfile {
  nome?: string;
  idade: number;
  peso: number;
  altura: number;
  objetivo: Objetivo;
  nivel: Nivel;
  focoTreino?: FocoTreino;
  diasSemana: number;
  periodicidade?: PeriodicidadeFicha;
  observacoes?: string;
}

export interface WorkoutAnalysis {
  imc: number;
  classificacaoImc: string;
  intensidadeSugerida: Intensidade;
  progressaoSemanal: string;
  contextoClinico: string;
  mensagemAjuste: string | null;
  objetivoFinal: Objetivo;
  diasTreinoAjustados: number;
  motivoAjusteDiasTreino: string | null;
  nivelRisco: NivelRisco;
  comentariosEssenciais: string[];
}

export interface WorkoutResponse {
  workoutPlan: string | StructuredWorkoutPlan;
  analysis: WorkoutAnalysis;
}
