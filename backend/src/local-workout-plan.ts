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
  bracos: [
    { nome: "Rosca direta", grupoMuscular: "biceps" },
    { nome: "Rosca alternada", grupoMuscular: "biceps" },
    { nome: "Rosca martelo", grupoMuscular: "biceps" },
    { nome: "Tríceps na polia", grupoMuscular: "triceps" },
    { nome: "Tríceps testa", grupoMuscular: "triceps" },
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
  bracos: ["Rosca direta", "Rosca alternada", "Rosca martelo", "Tríceps na polia", "Tríceps testa"],
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
      bannedByGroup.add("Crucifixo máquina");
    }
  }

  if (risks.joelho) {
    if (group === "quadriceps") {
      bannedByGroup.add("Afundo no smith");
      bannedByGroup.add("Hack machine");
      bannedByGroup.add("Agachamento guiado");
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

function reduceLoad(load: WorkoutLoad): WorkoutLoad {
  if (load === "alta") return "moderada";
  if (load === "moderada") return "leve";
  return "leve";
}

function adjustLoadForSpecificRisk(exerciseName: string, baseLoad: WorkoutLoad, risks: RegionalRiskFlags): WorkoutLoad {
  if (risks.coluna && /agachamento guiado|leg press|stiff|levantamento romeno|remada unilateral/i.test(exerciseName)) {
    return reduceLoad(baseLoad);
  }

  if (risks.ombro && /supino|crucifixo|desenvolvimento|elevacao lateral|elevação lateral/i.test(exerciseName)) {
    return reduceLoad(baseLoad);
  }

  if (risks.joelho && /leg press|agachamento guiado|hack machine|afundo/i.test(exerciseName)) {
    return reduceLoad(baseLoad);
  }

  return baseLoad;
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

  if (risks.joelho && (exerciseName === "Leg press" || exerciseName === "Agachamento guiado")) {
    return `${exerciseName} (amplitude curta, controle excêntrico e sem dor)`;
  }

  if (risks.ombro && exerciseName === "Supino máquina") {
    return "Supino máquina (pegada neutra e amplitude sem dor)";
  }

  if (risks.ombro && exerciseName === "Elevação lateral") {
    return "Elevação lateral (amplitude parcial e controle escapular)";
  }

  if (risks.coluna && exerciseName === "Prancha") {
    return "Prancha modificada (apoio de joelhos se necessario)";
  }

  return exerciseName;
}

function resolvePrimaryBlockTechnique(focusNormalized: string): "tri-set" | "bi-set" {
  // Alterna mensalmente para variar estímulo entre fichas de meses consecutivos.
  const evenMonth = new Date().getMonth() % 2 === 0;

  if (focusNormalized === "gluteo") {
    // Para glúteos, priorizar bi-set deixa a execução mais fluida e reduz repetição textual em descrições.
    return "bi-set";
  }

  if (focusNormalized === "posteriores") {
    return evenMonth ? "bi-set" : "tri-set";
  }

  return evenMonth ? "tri-set" : "bi-set";
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
    // Para evitar repetição de exercícios entre técnicas, usar apenas UMA técnica de bloco por treino.
    const primaryTechnique = resolvePrimaryBlockTechnique(focusNormalized);
    return exercises.map((exercise, idx) => {
      const techPosition = focusIndexes.indexOf(idx);
      if (techPosition === 0) return { ...exercise, tecnicaAvancada: primaryTechnique };
      return exercise;
    });
  }

  // Avançada com foco: aplicar até 3 técnicas apenas no grupamento foco.
  if (profile.nivel === "avancado" && analysis.intensidadeSugerida === "intensa") {
    // Regra prática: escolher um bloco (tri-set OU bi-set) + rest-pause para não repetir combinação de exercícios.
    const primaryTechnique = resolvePrimaryBlockTechnique(focusNormalized);
    return exercises.map((exercise, idx) => {
      const techPosition = focusIndexes.indexOf(idx);
      if (techPosition === 0) return { ...exercise, tecnicaAvancada: primaryTechnique };

      // Evita sobreposição: se a técnica principal for tri-set, os 3 primeiros exercícios do foco
      // já pertencem ao mesmo bloco. Nesse caso, não aplicar rest-pause neles.
      if (primaryTechnique === "tri-set") {
        return exercise;
      }

      if (techPosition === 1) return { ...exercise, tecnicaAvancada: "rest-pause" };
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
  const baseCarga = getCarga(profile, analysis);
  const risks = detectRegionalRisks(profile);

  const base = dedupeTemplates(templates)
    .slice(0, 6)
    .map((item) => {
      const adaptedName = adaptExerciseNameForRisk(item.nome, risks);

      return {
      nome: adaptedName,
      series,
      repeticoes: item.nome.toLowerCase().includes("prancha")
        ? "30 a 45 segundos"
        : item.grupoMuscular === "cardiorrespiratorio"
          ? "15 a 25 minutos"
          : repeticoes,
      carga: adjustLoadForSpecificRisk(adaptedName, baseCarga, risks),
      grupoMuscular: item.grupoMuscular,
    };
    });

  const withTechniques = assignTecnicas(base, profile, analysis, isEmphasisDay);
  return appendTechniqueGuidance(withTechniques);
}

function normalizeFocusValue(value: string | undefined): string {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "";
  if (normalized === "costa") return "costas";
  return normalized;
}

function getFocusGroup(profile: ClientProfile): string | null {
  const focus = normalizeFocusValue(profile.focoTreino);

  if (!focus || focus === "nenhum") {
    return null;
  }

  return focus;
}

function buildWorkoutTemplates(days: number, profile: ClientProfile, analysis: WorkoutAnalysis): Array<{ dia: string; nome: string; grupos: string[] }> {
  const focus = getFocusGroup(profile);

  if (days <= 2) {
    return [
      { dia: "A", nome: "Inferiores completos 1", grupos: ["quadriceps", "posteriores", "gluteo", "panturrilhas"] },
      { dia: "B", nome: "Inferiores completos 2", grupos: ["quadriceps", "posteriores", "gluteo", "panturrilhas"] },
    ];
  }

  if (days === 3) {
    return [
      { dia: "A", nome: focus === "quadriceps" ? "Quadríceps prioritários" : "Quadríceps e panturrilhas", grupos: [focus === "quadriceps" ? focus : "quadriceps", "panturrilhas"] },
      { dia: "B", nome: focus === "costas" ? "Costas prioritárias" : focus === "peito" ? "Peito prioritário" : "Superiores completo", grupos: [focus === "costas" || focus === "peito" ? focus : "costas", "peito", "ombros", "core"] },
      { dia: "C", nome: focus === "gluteo" ? "Glúteos prioritários" : focus === "posteriores" ? "Posteriores prioritários" : "Glúteos e posteriores", grupos: [focus === "gluteo" ? "gluteo" : focus === "posteriores" ? "posteriores" : "gluteo", "posteriores"] },
    ];
  }

  if (days === 4) {
    return [
      { dia: "A", nome: focus === "quadriceps" ? "Quadríceps prioritários" : "Quadríceps e panturrilhas", grupos: [focus === "quadriceps" ? focus : "quadriceps", "panturrilhas"] },
      { dia: "B", nome: focus === "costas" ? "Costas prioritárias" : "Costas e abdômen", grupos: [focus === "costas" ? focus : "costas", "core"] },
      { dia: "C", nome: focus === "gluteo" ? "Glúteos prioritários" : "Glúteos e posteriores", grupos: [focus === "gluteo" ? "gluteo" : "gluteo", "posteriores"] },
      { dia: "D", nome: focus === "peito" ? "Peito prioritário" : "Peito e ombros", grupos: [focus === "peito" ? focus : "peito", "ombros", "cardio"] },
    ];
  }

  if (days === 5) {
    // 5 dias: quadríceps, costas, glúteos, peito+ombros, posteriores — todos separados
    return [
      { dia: "A", nome: focus === "quadriceps" ? "Quadríceps prioritários" : "Quadríceps e panturrilhas", grupos: [focus === "quadriceps" ? focus : "quadriceps", "panturrilhas"] },
      { dia: "B", nome: focus === "costas" ? "Costas prioritárias" : "Costas e abdômen", grupos: [focus === "costas" ? focus : "costas", "core"] },
      { dia: "C", nome: focus === "gluteo" ? "Glúteos prioritários" : "Glúteos e panturrilhas", grupos: [focus === "gluteo" ? "gluteo" : "gluteo", "panturrilhas"] },
      { dia: "D", nome: focus === "peito" ? "Peito prioritário" : "Peito e ombros", grupos: [focus === "peito" ? focus : "peito", "ombros", "cardio"] },
      { dia: "E", nome: focus === "posteriores" ? "Posteriores prioritários" : "Posteriores e panturrilhas", grupos: [focus === "posteriores" ? focus : "posteriores", "panturrilhas"] },
    ];
  }

  // 6 dias: avançado com grupamentos separados e dia de braços
  return [
    { dia: "A", nome: focus === "quadriceps" ? "Quadríceps prioritários" : "Quadríceps e panturrilhas", grupos: [focus === "quadriceps" ? focus : "quadriceps", "panturrilhas"] },
    { dia: "B", nome: focus === "costas" ? "Costas prioritárias" : "Costas e abdômen", grupos: [focus === "costas" ? focus : "costas", "core"] },
    { dia: "C", nome: focus === "gluteo" ? "Glúteos prioritários" : "Glúteos e panturrilhas", grupos: [focus === "gluteo" ? "gluteo" : "gluteo", "panturrilhas"] },
    { dia: "D", nome: focus === "peito" ? "Peito prioritário" : "Peito e ombros", grupos: [focus === "peito" ? focus : "peito", "ombros", "cardio"] },
    { dia: "E", nome: focus === "posteriores" ? "Posteriores prioritários" : "Posteriores e panturrilhas", grupos: [focus === "posteriores" ? focus : "posteriores", "panturrilhas"] },
    { dia: "F", nome: "Braços e abdômen", grupos: ["bracos", "core"] },
  ];
}

function buildWorkoutBlocks(profile: ClientProfile, analysis: WorkoutAnalysis): WorkoutBlock[] {
  const adjustedDays = clamp(analysis.diasTreinoAjustados || profile.diasSemana, 2, 6);
  const templates = buildWorkoutTemplates(adjustedDays, profile, analysis);
  const focus = getFocusGroup(profile);
  const orderedTemplates = [...templates];
  if (focus) {
    const currentIndex = orderedTemplates.findIndex((template) => template.grupos.includes(focus));
    if (currentIndex > 0) {
      const [focusTemplate] = orderedTemplates.splice(currentIndex, 1);
      orderedTemplates.unshift(focusTemplate);
    }
  }

  const emphasisIndex = focus
    ? orderedTemplates.findIndex((template) => template.grupos.includes(focus))
    : -1;
  const usedExerciseNames = new Set<string>();

  return orderedTemplates.map((template, idx) => {
    const selectedTemplates: WorkoutTemplate[] = [];

    for (const group of template.grupos) {
      const groupTemplates = selectTemplatesForGroup(group, profile, analysis);
      const uniqueForWeek = groupTemplates.filter((item) => !usedExerciseNames.has(item.nome));
      const source = uniqueForWeek.length > 0 ? uniqueForWeek : groupTemplates;

      for (const item of source) {
        if (selectedTemplates.length >= 7) {
          break;
        }

        if (selectedTemplates.some((selected) => selected.nome === item.nome)) {
          continue;
        }

        // Repetição semanal só entra como último recurso quando não há opções inéditas.
        if (usedExerciseNames.has(item.nome) && uniqueForWeek.length > 0) {
          continue;
        }

        selectedTemplates.push(item);
      }

      if (selectedTemplates.length >= 7) {
        break;
      }
    }

    if (selectedTemplates.length < 3) {
      for (const group of template.grupos) {
        const groupTemplates = selectTemplatesForGroup(group, profile, analysis);

        for (const item of groupTemplates) {
          if (selectedTemplates.length >= 3) {
            break;
          }

          if (selectedTemplates.some((selected) => selected.nome === item.nome)) {
            continue;
          }

          selectedTemplates.push(item);
        }

        if (selectedTemplates.length >= 3) {
          break;
        }
      }
    }

    // Treino de ênfase = primeiro treino da semana que contém o grupo foco.
    const isEmphasisDay = emphasisIndex >= 0 && idx === emphasisIndex;
    let exercises = selectedTemplates;

    if (isEmphasisDay && focus) {
      const focusGroupMuscular = focus === "gluteo" ? "gluteos" : focus;
      const emphasisExercises = selectedTemplates.filter((item) => item.grupoMuscular === focusGroupMuscular);
      const focusPool = selectTemplatesForGroup(focus, profile, analysis)
        .filter((item) => !emphasisExercises.some((selected) => selected.nome === item.nome));

      while (emphasisExercises.length < 6 && focusPool.length > 0) {
        const next = focusPool.shift();
        if (!next) break;
        emphasisExercises.push(next);
      }

      const lowerBodyFocus = new Set(["quadriceps", "posteriores", "gluteo"]);
      if (lowerBodyFocus.has(focus)) {
        const calfPool = selectTemplatesForGroup("panturrilhas", profile, analysis)
          .filter((item) => !emphasisExercises.some((selected) => selected.nome === item.nome));

        while (emphasisExercises.length < 5 && calfPool.length > 0) {
          const nextCalf = calfPool.shift();
          if (!nextCalf) break;
          emphasisExercises.push(nextCalf);
        }
      }

      if (emphasisExercises.length >= 3) {
        exercises = emphasisExercises.slice(0, 6);
      }
    }

    exercises.forEach((item) => usedExerciseNames.add(item.nome));

    return {
      dia: String.fromCharCode(65 + idx),
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

  if (risks.ombro) {
    substitutions.unshift("Se houver dor no ombro, evitar movimentos acima da cabeça e substituir por máquinas guiadas com pegada neutra e amplitude sem dor.");
  }

  if (risks.joelho) {
    substitutions.unshift("Se houver dor no joelho, reduzir amplitude em leg press/agachamentos e priorizar cadeira extensora/flexora com controle de movimento.");
  }

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
  const levelGuidance = profile.nivel === "intermediario"
    ? "Para nível intermediário, iniciar em carga moderada e evoluir para moderada-alta nas semanas 2 e 3 quando houver execução limpa e recuperação adequada."
    : profile.nivel === "avancado"
      ? "Para nível avançado, manter estímulo pesado desde a semana 1 e evoluir carga com técnicas avançadas quando clinicamente permitido."
      : "Para nível iniciante, priorizar adaptação técnica, mobilidade e consistência sem técnicas avançadas.";

  if (profile.periodicidade === "mensal") {
    return `Ciclo mensal com progressão simples por 4 semanas. Semana 1 com adaptação técnica, semanas 2 e 3 com aumento gradual de carga, e semana 4 consolidando execução com controle de fadiga. ${levelGuidance} ${analysis.progressaoSemanal}`;
  }

  if (profile.periodicidade === "quinzenal") {
    return `Ciclo quinzenal com execução estável na primeira semana e progressão leve de carga ou repetições na segunda semana, respeitando recuperação e segurança. ${levelGuidance} ${analysis.progressaoSemanal}`;
  }

  return `Ciclo semanal objetivo para execução imediata, com foco em consistência, técnica e segurança. ${levelGuidance} ${analysis.progressaoSemanal}`;
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
  const levelProgressionText = profile.nivel === "intermediario"
    ? " Intermediária: manter base moderada com progressão para moderada-alta ao longo dos ciclos mensais quando houver boa execução e recuperação."
    : profile.nivel === "avancado"
      ? " Avançada: treino mais pesado como padrão, com técnicas avançadas aplicadas de forma estratégica quando clinicamente permitido."
      : "";
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

  return `A divisão com ${blocks.length} treinos foi escolhida para equilibrar objetivo, nível ${profile.nivel}, periodicidade ${profile.periodicidade || "semanal"} e segurança clínica. O plano prioriza recuperação coerente, exercícios reais de academia e progressão compatível com ${analysis.nivelRisco === "alto" ? "maior cautela clínica" : "boa margem de evolução"}.${emphasisText}${levelProgressionText}${guidanceText}`;
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