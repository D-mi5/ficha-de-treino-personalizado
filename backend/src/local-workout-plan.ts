import { ClientProfile, StructuredWorkoutPlan, WorkoutAnalysis, WorkoutBlock, WorkoutExercise, WorkoutResponse } from "./types.js";

type WorkoutLoad = WorkoutExercise["carga"];

interface WorkoutTemplate {
  nome: string;
  grupoMuscular: string;
}

interface RegionalRiskFlags {
  joelho: boolean;
  ombro: boolean;
  coluna: boolean;
}

const WEEK_DAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const EXERCISE_LIBRARY: Record<string, WorkoutTemplate[]> = {
  quadriceps: [
    { nome: "Cadeira extensora", grupoMuscular: "quadriceps" },
    { nome: "Leg press", grupoMuscular: "quadriceps" },
    { nome: "Hack machine", grupoMuscular: "quadriceps" },
    { nome: "Agachamento guiado", grupoMuscular: "quadriceps" },
    { nome: "Afundo no smith", grupoMuscular: "quadriceps" },
  ],
  gluteo: [
    { nome: "Elevação pélvica", grupoMuscular: "gluteos" },
    { nome: "Coice na polia", grupoMuscular: "gluteos" },
    { nome: "Abdução de quadril", grupoMuscular: "gluteos" },
    { nome: "Agachamento sumô", grupoMuscular: "gluteos" },
    { nome: "Passada com halteres", grupoMuscular: "gluteos" },
  ],
  posteriores: [
    { nome: "Stiff com halteres", grupoMuscular: "posteriores" },
    { nome: "Mesa flexora", grupoMuscular: "posteriores" },
    { nome: "Levantamento romeno", grupoMuscular: "posteriores" },
    { nome: "Glute bridge", grupoMuscular: "posteriores" },
    { nome: "Cadeira flexora", grupoMuscular: "posteriores" },
  ],
  costas: [
    { nome: "Puxada na frente", grupoMuscular: "costas" },
    { nome: "Remada baixa", grupoMuscular: "costas" },
    { nome: "Pulldown na polia", grupoMuscular: "costas" },
    { nome: "Remada unilateral", grupoMuscular: "costas" },
    { nome: "Face pull", grupoMuscular: "costas" },
  ],
  peito: [
    { nome: "Supino máquina", grupoMuscular: "peito" },
    { nome: "Crucifixo máquina", grupoMuscular: "peito" },
    { nome: "Supino com halteres", grupoMuscular: "peito" },
    { nome: "Peck deck", grupoMuscular: "peito" },
  ],
  ombros: [
    { nome: "Desenvolvimento com halteres", grupoMuscular: "ombros" },
    { nome: "Elevação lateral", grupoMuscular: "ombros" },
    { nome: "Elevação frontal", grupoMuscular: "ombros" },
  ],
  core: [
    { nome: "Prancha", grupoMuscular: "abdomen" },
    { nome: "Abdominal infra", grupoMuscular: "abdomen" },
    { nome: "Abdominal máquina", grupoMuscular: "abdomen" },
  ],
  panturrilhas: [
    { nome: "Panturrilha em pé", grupoMuscular: "panturrilhas" },
    { nome: "Panturrilha sentada", grupoMuscular: "panturrilhas" },
  ],
  cardio: [
    { nome: "Caminhada inclinada", grupoMuscular: "cardiorrespiratorio" },
    { nome: "Bicicleta ergométrica", grupoMuscular: "cardiorrespiratorio" },
    { nome: "Elíptico moderado", grupoMuscular: "cardiorrespiratorio" },
  ],
};

const CONSERVATIVE_EXERCISE_NAMES: Partial<Record<string, string[]>> = {
  quadriceps: ["Cadeira extensora", "Leg press", "Agachamento guiado"],
  gluteo: ["Elevação pélvica", "Coice na polia", "Abdução de quadril"],
  posteriores: ["Mesa flexora", "Cadeira flexora", "Glute bridge"],
  costas: ["Puxada na frente", "Remada baixa", "Pulldown na polia", "Face pull"],
  peito: ["Supino máquina", "Crucifixo máquina", "Peck deck"],
  ombros: ["Elevação lateral"],
  cardio: ["Caminhada inclinada", "Bicicleta ergométrica", "Elíptico moderado"],
};

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function detectRegionalRisks(profile: ClientProfile): RegionalRiskFlags {
  const notes = normalizeText(profile.observacoes || "");
  return {
    joelho: /joelho|patelo|menisc|ligament|condromalac/.test(notes),
    ombro: /ombro|manguito/.test(notes),
    coluna: /coluna|lombar|cervical|ciatic|escolios|discopat|protus|hernia/.test(notes),
  };
}

function applyRegionalRestrictions(group: string, templates: WorkoutTemplate[], risks: RegionalRiskFlags): WorkoutTemplate[] {
  const bannedByGroup = new Set<string>();

  if (risks.coluna) {
    if (group === "posteriores") {
      bannedByGroup.add("Stiff com halteres");
      bannedByGroup.add("Levantamento romeno");
    }
    if (group === "gluteo") {
      bannedByGroup.add("Agachamento sumô");
      bannedByGroup.add("Passada com halteres");
    }
    if (group === "quadriceps") {
      bannedByGroup.add("Afundo no smith");
      bannedByGroup.add("Hack machine");
    }
    if (group === "ombros") {
      bannedByGroup.add("Desenvolvimento com halteres");
      bannedByGroup.add("Elevação frontal");
    }
    if (group === "costas") {
      bannedByGroup.add("Remada unilateral");
    }
  }

  if (risks.ombro) {
    if (group === "ombros") {
      bannedByGroup.add("Desenvolvimento com halteres");
      bannedByGroup.add("Elevação frontal");
    }
    if (group === "peito") {
      bannedByGroup.add("Supino com halteres");
    }
  }

  if (risks.joelho) {
    if (group === "quadriceps") {
      bannedByGroup.add("Afundo no smith");
      bannedByGroup.add("Hack machine");
    }
    if (group === "gluteo") {
      bannedByGroup.add("Passada com halteres");
      bannedByGroup.add("Agachamento sumô");
    }
  }

  if (bannedByGroup.size === 0) {
    return templates;
  }

  const filtered = templates.filter((item) => !bannedByGroup.has(item.nome));
  return filtered.length > 0 ? filtered : templates;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getSeries(profile: ClientProfile, analysis: WorkoutAnalysis): number {
  if (analysis.nivelRisco === "alto") return 2;
  if (profile.nivel === "avancado" && analysis.intensidadeSugerida !== "leve") return 4;
  return 3;
}

function getRepeticoes(profile: ClientProfile, analysis: WorkoutAnalysis): string {
  if (analysis.nivelRisco === "alto") return "10 a 12";
  if (analysis.objetivoFinal === "hipertrofia") return profile.nivel === "avancado" ? "8 a 10" : "8 a 12";
  if (analysis.objetivoFinal === "definicao") return "10 a 15";
  return "12 a 15";
}

function getCarga(profile: ClientProfile, analysis: WorkoutAnalysis): WorkoutLoad {
  if (analysis.nivelRisco === "alto") return "leve";
  if (profile.nivel === "iniciante" && analysis.objetivoFinal === "emagrecimento") return "leve";
  if (analysis.intensidadeSugerida === "intensa" && profile.nivel === "avancado") return "alta";
  if (analysis.intensidadeSugerida === "moderada") return "moderada";
  return "leve";
}

function shouldUseConservativeExerciseSelection(profile: ClientProfile, analysis: WorkoutAnalysis): boolean {
  return profile.nivel === "iniciante"
    || analysis.nivelRisco !== "baixo"
    || analysis.objetivoFinal === "emagrecimento";
}

function selectTemplatesForGroup(group: string, profile: ClientProfile, analysis: WorkoutAnalysis): WorkoutTemplate[] {
  let templates = EXERCISE_LIBRARY[group] || [];
  const risks = detectRegionalRisks(profile);

  if (!shouldUseConservativeExerciseSelection(profile, analysis)) {
    return applyRegionalRestrictions(group, templates, risks);
  }

  const allowedNames = CONSERVATIVE_EXERCISE_NAMES[group];
  if (!allowedNames || allowedNames.length === 0) {
    return templates;
  }

  const filtered = templates.filter((item) => allowedNames.includes(item.nome));
  templates = filtered.length > 0 ? filtered : templates;

  return applyRegionalRestrictions(group, templates, risks);
}

function dedupeTemplates(templates: WorkoutTemplate[]): WorkoutTemplate[] {
  const unique = new Map<string, WorkoutTemplate>();
  templates.forEach((item) => unique.set(item.nome, item));
  return Array.from(unique.values());
}

function adaptExerciseNameForRisk(exerciseName: string, risks: RegionalRiskFlags): string {
  // Keep useful lower-body patterns for spine-risk profiles, but make the execution constraint explicit.
  if (risks.coluna && (exerciseName === "Agachamento guiado" || exerciseName === "Leg press")) {
    return `${exerciseName} (amplitude confortavel e sem dor)`;
  }

  if (risks.coluna && exerciseName === "Prancha") {
    return "Prancha modificada (apoio de joelhos se necessario)";
  }

  return exerciseName;
}

function assignTecnicas(
  exercises: WorkoutExercise[],
  profile: ClientProfile,
  analysis: WorkoutAnalysis,
  isEmphasisDay: boolean, // true se esse é o treino A com foco prioritário
): WorkoutExercise[] {
  // Restrições clinicamente críticas
  if (analysis.nivelRisco === "alto") return exercises;
  if (profile.nivel === "iniciante") return exercises;

  // Técnicas só entram quando a cliente preenche foco válido no formulário.
  const focusRaw = String(profile.focoTreino || "").trim().toLowerCase();
  const focusNormalized = focusRaw === "costa" ? "costas" : focusRaw;
  const allowedFocuses = new Set(["quadriceps", "posteriores", "gluteo", "costas", "peito"]);
  if (!allowedFocuses.has(focusNormalized)) return exercises;
  if (!isEmphasisDay) return exercises;

  const focusGroupMuscular =
    focusNormalized === "gluteo"
      ? "gluteos"
      : focusNormalized;
  const focusIndexes = exercises
    .map((exercise, idx) => ({ exercise, idx }))
    .filter((item) => item.exercise.grupoMuscular === focusGroupMuscular)
    .map((item) => item.idx);

  if (focusIndexes.length === 0) return exercises;

  // Intermediária com foco: aplicar 2 técnicas apenas no grupamento foco.
  if (profile.nivel === "intermediario") {
    const techniques: Array<"bi-set" | "tri-set"> = ["bi-set", "tri-set"];
    return exercises.map((exercise, idx) => {
      const techPosition = focusIndexes.indexOf(idx);
      if (techPosition === 0) return { ...exercise, tecnicaAvancada: techniques[0] };
      if (techPosition === 1) return { ...exercise, tecnicaAvancada: techniques[1] };
      return exercise;
    });
  }

  // Avançada com foco: aplicar até 3 técnicas apenas no grupamento foco.
  if (profile.nivel === "avancado" && analysis.intensidadeSugerida === "intensa") {
    const techniques: Array<"bi-set" | "tri-set" | "rest-pause"> = ["bi-set", "tri-set", "rest-pause"];
    return exercises.map((exercise, idx) => {
      const techPosition = focusIndexes.indexOf(idx);
      if (techPosition === 0) return { ...exercise, tecnicaAvancada: techniques[0] };
      if (techPosition === 1) return { ...exercise, tecnicaAvancada: techniques[1] };
      if (techPosition === 2) return { ...exercise, tecnicaAvancada: techniques[2] };
      return exercise;
    });
  }

  return exercises;
}

function buildTechniqueInstruction(exercises: WorkoutExercise[], index: number): string {
  const exercise = exercises[index];
  if (!exercise?.tecnicaAvancada) return "";

  const sameGroupExercises = exercises.filter((item) => item.grupoMuscular === exercise.grupoMuscular);
  const sanitizeName = (name: string): string => String(name || "").split("(")[0].trim();

  if (exercise.tecnicaAvancada === "bi-set") {
    const pairNames = sameGroupExercises.slice(0, 2).map((item) => sanitizeName(item.nome));
    if (pairNames.length >= 2) {
      return `bi-set: ${pairNames[0]} + ${pairNames[1]}, sem descanso entre os 2; descansar 60-90s ao final`;
    }
    return "bi-set: combinar 2 exercicios do mesmo grupo, sem descanso entre os 2; descansar 60-90s ao final";
  }

  if (exercise.tecnicaAvancada === "tri-set") {
    const trioNames = sameGroupExercises.slice(0, 3).map((item) => sanitizeName(item.nome));
    if (trioNames.length >= 3) {
      return `tri-set: ${trioNames[0]} + ${trioNames[1]} + ${trioNames[2]}, em sequencia sem descanso; descansar 60-90s ao final`;
    }
    return "tri-set: executar 3 exercicios do mesmo grupo em sequencia, sem descanso; descansar 60-90s ao final";
  }

  if (exercise.tecnicaAvancada === "rest-pause") {
    return "rest-pause: na ultima serie, parar perto da falha tecnica, pausar 15-20s e completar 3-5 repeticoes com controle";
  }

  if (exercise.tecnicaAvancada === "drop-set") {
    return "drop-set: na ultima serie, reduzir 20-30% da carga e continuar com execucao controlada";
  }

  if (exercise.tecnicaAvancada === "superserie") {
    return "superserie: combinar 2 exercicios em sequencia, sem descanso entre eles";
  }

  if (exercise.tecnicaAvancada === "piramide") {
    return "piramide: ajustar carga e repeticoes de forma progressiva ou regressiva, mantendo tecnica limpa";
  }

  if (exercise.tecnicaAvancada === "serie combinada") {
    return "serie combinada: variar alavanca, apoio ou amplitude no mesmo exercicio com tecnica controlada";
  }

  return "";
}

function appendTechniqueGuidance(exercises: WorkoutExercise[]): WorkoutExercise[] {
  return exercises.map((exercise, index) => {
    if (!exercise.tecnicaAvancada) {
      return exercise;
    }

    const instruction = buildTechniqueInstruction(exercises, index);
    if (!instruction) {
      return exercise;
    }

    if (exercise.nome.includes("(")) {
      return { ...exercise, nome: `${exercise.nome} | ${instruction}` };
    }

    return { ...exercise, nome: `${exercise.nome} (${instruction})` };
  });
}

function toExercises(
  templates: WorkoutTemplate[],
  profile: ClientProfile,
  analysis: WorkoutAnalysis,
  isEmphasisDay: boolean = false,
): WorkoutExercise[] {
  const series = getSeries(profile, analysis);
  const repeticoes = getRepeticoes(profile, analysis);
  const carga = getCarga(profile, analysis);
  const risks = detectRegionalRisks(profile);

  const base = dedupeTemplates(templates)
    .slice(0, 6)
    .map((item) => ({
      nome: adaptExerciseNameForRisk(item.nome, risks),
      series,
      repeticoes,
      carga,
      grupoMuscular: item.grupoMuscular,
    }));

  const withTechniques = assignTecnicas(base, profile, analysis, isEmphasisDay);
  return appendTechniqueGuidance(withTechniques);
}

function getFocusGroup(profile: ClientProfile): string | null {
  if (!profile.focoTreino || profile.focoTreino === "nenhum") {
    return null;
  }

  return profile.focoTreino;
}

function buildWorkoutTemplates(days: number, profile: ClientProfile, analysis: WorkoutAnalysis): Array<{ dia: string; nome: string; grupos: string[] }> {
  const focus = getFocusGroup(profile);

  if (days <= 2) {
    return [
      { dia: "A", nome: focus === "gluteo" ? "Inferiores com ênfase em glúteos" : "Inferiores completos", grupos: [focus || "quadriceps", "posteriores", "gluteo", "panturrilhas"] },
      { dia: "B", nome: "Superiores completos", grupos: [focus === "costas" || focus === "peito" ? focus : "costas", "peito", "ombros", "core"] },
    ];
  }

  if (days === 3) {
    return [
      { dia: "A", nome: focus === "quadriceps" ? "Quadríceps e glúteos" : focus === "gluteo" ? "Glúteos e quadríceps" : "Inferiores 1", grupos: [focus || "quadriceps", "gluteo", "panturrilhas"] },
      { dia: "B", nome: "Superiores estratégicos", grupos: [focus === "costas" || focus === "peito" ? focus : "costas", "peito", "ombros"] },
      { dia: "C", nome: focus === "posteriores" ? "Posteriores e core" : "Inferiores 2 e core", grupos: [focus === "posteriores" ? "posteriores" : "posteriores", "gluteo", "core", analysis.objetivoFinal === "emagrecimento" ? "cardio" : "core"] },
    ];
  }

  if (days === 4) {
    // Treino A = só parte anterior (quadriceps + panturrilhas)
    // Treino C = parte posterior (posteriores + glúteos)
    // Exceção: foco em glúteos → glúteos ficam prioritários no Treino A
    const dayAGrupos = focus === "gluteo"
      ? ["gluteo", "quadriceps", "panturrilhas"]
      : focus === "costas" || focus === "peito"
        ? ["quadriceps", "panturrilhas"]
        : [focus || "quadriceps", "panturrilhas"];
    return [
      { dia: "A", nome: focus === "gluteo" ? "Glúteos prioritários" : focus === "quadriceps" ? "Quadríceps prioritários" : "Inferiores anteriores", grupos: dayAGrupos },
      { dia: "B", nome: focus === "costas" ? "Costas prioritárias" : focus === "peito" ? "Peito prioritário" : "Superiores 1", grupos: [focus === "costas" || focus === "peito" ? focus : "costas", "ombros", "core"] },
      { dia: "C", nome: "Posteriores e glúteos", grupos: ["posteriores", "gluteo", analysis.objetivoFinal === "emagrecimento" ? "cardio" : "core"] },
      { dia: "D", nome: "Superiores 2 e acabamento", grupos: ["costas", "peito", "ombros", "core"] },
    ];
  }

  // 5 dias: anterior e posterior bem separados, glúteos só no Treino C
  const day5AGrupos = focus === "gluteo"
    ? ["gluteo", "quadriceps", "panturrilhas"]
    : [focus === "costas" || focus === "peito" ? "quadriceps" : focus || "quadriceps", "panturrilhas"];
  return [
    { dia: "A", nome: focus === "gluteo" ? "Glúteos prioritários" : focus === "quadriceps" ? "Quadríceps prioritários" : "Inferiores anteriores", grupos: day5AGrupos },
    { dia: "B", nome: focus === "costas" ? "Costas prioritárias" : focus === "peito" ? "Peito prioritário" : "Superiores 1", grupos: [focus === "costas" || focus === "peito" ? focus : "costas", "peito", "ombros"] },
    { dia: "C", nome: "Posteriores e glúteos", grupos: ["posteriores", "gluteo", "core"] },
    { dia: "D", nome: "Superiores 2", grupos: ["costas", "peito", "ombros", "core"] },
    { dia: "E", nome: analysis.objetivoFinal === "emagrecimento" ? "Condicionamento e core" : "Acabamento e estabilidade", grupos: [analysis.objetivoFinal === "emagrecimento" ? "cardio" : "core", "panturrilhas"] },
  ].slice(0, days);
}

function buildWorkoutBlocks(profile: ClientProfile, analysis: WorkoutAnalysis): WorkoutBlock[] {
  const adjustedDays = clamp(analysis.diasTreinoAjustados || profile.diasSemana, 2, 5);
  const templates = buildWorkoutTemplates(adjustedDays, profile, analysis);
  const focus = getFocusGroup(profile);
  const emphasisIndex = focus
    ? templates.findIndex((template) => template.grupos.includes(focus))
    : -1;

  return templates.map((template, idx) => {
    const exercises = template.grupos.flatMap((group) => selectTemplatesForGroup(group, profile, analysis)).slice(0, 7);
    // Treino de ênfase = primeiro treino da semana que contém o grupo foco.
    const isEmphasisDay = emphasisIndex >= 0 && idx === emphasisIndex;
    return {
      dia: template.dia,
      nome: template.nome,
      exercicios: toExercises(exercises, profile, analysis, isEmphasisDay),
    };
  });
}

function buildDistribuicaoSemanal(blocks: WorkoutBlock[]): string[] {
  return blocks.map((block, index) => `${WEEK_DAYS[index] || `Dia ${index + 1}`}: Treino ${block.dia} - ${block.nome}`);
}

function buildSubstituicoes(profile: ClientProfile, analysis: WorkoutAnalysis): string[] {
  const risks = detectRegionalRisks(profile);
  const substitutions = [
    "Se não houver leg press, usar agachamento guiado com amplitude segura.",
    "Se a elevação pélvica estiver desconfortável, trocar por glute bridge com pausa de 2 segundos no topo.",
    "Se houver desconforto lombar em exercícios livres, priorizar máquina ou apoio guiado.",
  ];

  if (risks.coluna) {
    substitutions.unshift("Se houver dor ativa na coluna no dia, trocar agachamento guiado e leg press por cadeira extensora, mesa/cadeira flexora e glute bridge com amplitude indolor.");
    substitutions.unshift("Evitar manobras de valsalva e priorizar respiracao controlada, apoio de tronco e tempo de execucao mais lento.");
  }

  if (analysis.nivelRisco !== "baixo") {
    substitutions.push("Se houver dor articular no dia, reduzir carga e substituir por variações em máquina com execução controlada.");
  }

  if (profile.objetivo === "emagrecimento" || analysis.objetivoFinal === "emagrecimento") {
    substitutions.push("Cardio pode ser feito em bicicleta ou elíptico caso a caminhada inclinada aumente impacto articular.");
  }

  return substitutions.slice(0, 4);
}

function buildCards(profile: ClientProfile, analysis: WorkoutAnalysis) {
  const risks = detectRegionalRisks(profile);

  const isRegionalComment = (text: string): boolean => /coluna|lombar|joelho|ombro|manguito/i.test(text);
  const pickRegional = (pattern: RegExp): string | null =>
    analysis.comentariosEssenciais.find((item) => pattern.test(item)) || null;

  const regionalComments: string[] = [];
  if (risks.coluna) {
    regionalComments.push(
      pickRegional(/coluna|lombar|core/i)
        || "Na coluna, evite compressão excessiva e mantenha foco em estabilidade do core e técnica limpa.",
    );
  }
  if (risks.joelho) {
    regionalComments.push(
      pickRegional(/joelho|amplitude dolorosa/i)
        || "No joelho, evite amplitude dolorosa e evolua carga apenas com execução estável e sem dor.",
    );
  }
  if (risks.ombro) {
    regionalComments.push(
      pickRegional(/ombro|pegadas neutras|acima da cabeca/i)
        || "No ombro, priorize pegadas neutras e evite sobrecarga acima da cabeça em fases dolorosas.",
    );
  }

  const nonRegionalComments = analysis.comentariosEssenciais.filter((item) => !isRegionalComment(item));

  const comentarios = [
    nonRegionalComments[0] || "Mantenha execução limpa e progressão gradual.",
    ...regionalComments,
    `Intensidade atual: ${analysis.intensidadeSugerida}.`,
  ].filter(Boolean).slice(0, 4);

  const dicas = [
    "Faça 5 a 10 minutos de aquecimento antes do primeiro treino principal.",
    "Inclua 1 a 2 séries leves de adaptação no primeiro exercício do dia.",
    "Mantenha hidratação durante o treino e recuperação adequada ao longo da semana.",
    profile.nivel === "iniciante"
      ? "Priorize técnica, mobilidade e constância antes de buscar cargas maiores."
      : "Aumente carga apenas quando completar todas as repetições com ótima execução.",
  ].slice(0, 5);

  return { comentarios, dicas };
}

function buildCycleText(profile: ClientProfile, analysis: WorkoutAnalysis): string {
  if (profile.periodicidade === "mensal") {
    return `Ciclo mensal com progressão simples por 4 semanas. Semana 1 com adaptação técnica, semanas 2 e 3 com aumento gradual de carga, e semana 4 consolidando execução com controle de fadiga. ${analysis.progressaoSemanal}`;
  }

  if (profile.periodicidade === "quinzenal") {
    return `Ciclo quinzenal com execução estável na primeira semana e progressão leve de carga ou repetições na segunda semana, respeitando recuperação e segurança. ${analysis.progressaoSemanal}`;
  }

  return `Ciclo semanal objetivo para execução imediata, com foco em consistência, técnica e segurança. ${analysis.progressaoSemanal}`;
}

function toDisplayName(value: string | undefined): string {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return "";
  }

  return normalized
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function buildAnalise(profile: ClientProfile, analysis: WorkoutAnalysis): string {
  const displayName = toDisplayName(profile.nome);
  const nome = displayName ? `${displayName} apresenta` : "A cliente apresenta";
  return `${nome} perfil com objetivo final em ${analysis.objetivoFinal}, IMC ${analysis.imc} (${analysis.classificacaoImc}), intensidade sugerida ${analysis.intensidadeSugerida} e leitura clínica de ${analysis.contextoClinico}`;
}

function buildAjusteObjetivo(profile: ClientProfile, analysis: WorkoutAnalysis): string {
  if (analysis.mensagemAjuste) {
    return analysis.mensagemAjuste;
  }

  return `Objetivo mantido em ${analysis.objetivoFinal}, respeitando nível ${profile.nivel}, frequência semanal e margem de recuperação atual.`;
}

function buildStrategy(profile: ClientProfile, analysis: WorkoutAnalysis, blocks: WorkoutBlock[]): string {
  const focus = getFocusGroup(profile);
  const emphasisText = focus ? ` Ênfase aplicada: ${focus}.` : "";
  const risks = detectRegionalRisks(profile);
  const regionalGuidance: string[] = [];

  if (risks.coluna) {
    regionalGuidance.push("Na coluna, priorize apoio de tronco, amplitude indolor e progressão conservadora sem compressão excessiva.");
  }

  if (risks.joelho) {
    regionalGuidance.push("No joelho, mantenha amplitude confortável e aumente carga apenas sem dor durante e após o treino.");
  }

  if (risks.ombro) {
    regionalGuidance.push("No ombro, evite sobrecarga acima da cabeça em fase dolorosa e prefira variações guiadas com pegada neutra.");
  }

  const guidanceText = regionalGuidance.length === 0
    ? ""
    : regionalGuidance.length === 1
      ? ` ${regionalGuidance[0]}`
      : ` Prioridades clínicas: ${regionalGuidance.join(" ")}`;

  return `A divisão com ${blocks.length} treinos foi escolhida para equilibrar objetivo, nível ${profile.nivel}, periodicidade ${profile.periodicidade || "semanal"} e segurança clínica. O plano prioriza recuperação coerente, exercícios reais de academia e progressão compatível com ${analysis.nivelRisco === "alto" ? "maior cautela clínica" : "boa margem de evolução"}.${emphasisText}${guidanceText}`;
}

function buildObservacoesFinais(analysis: WorkoutAnalysis): string {
  return `Mantenha constância, técnica segura e evolução progressiva. Se houver dor persistente, fadiga fora do normal ou piora clínica, ajuste a carga e busque orientação profissional. ${analysis.progressaoSemanal}`;
}

export function buildLocalWorkoutFallback(profile: ClientProfile, analysis: WorkoutAnalysis): WorkoutResponse {
  const treinos = buildWorkoutBlocks(profile, analysis);
  const workoutPlan: StructuredWorkoutPlan = {
    analise: buildAnalise(profile, analysis),
    ajusteObjetivo: buildAjusteObjetivo(profile, analysis),
    estrategia: buildStrategy(profile, analysis, treinos),
    ciclo: buildCycleText(profile, analysis),
    treinos,
    distribuicaoSemanal: buildDistribuicaoSemanal(treinos),
    substituicoes: buildSubstituicoes(profile, analysis),
    cards: buildCards(profile, analysis),
    observacoesFinais: buildObservacoesFinais(analysis),
  };

  return {
    workoutPlan,
    analysis,
  };
}