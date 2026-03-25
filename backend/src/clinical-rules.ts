export const CLINICAL_RULES = {
  idadeIdosaMinima: 60,
  idadeJovemIntensaMax: 25,
  idadeAdultaModeradaMax: 40,
  idadeAvancadoIntensaMax: 35,
  idadeRecuperacaoArticularMin: 40,
  imcObesidade: 30,
  imcObesidadeGrave: 35,
  imcRiscoMaximo: 40,
  imcDesnutricao: 18.5,
  riscoArticularPattern: "joelho|quadril|coluna|lombar|articul|hernia|dor\\s*cronica|tendinit|bursit|lesa",
  comorbidadePattern: "hiperten|diabet|insulin|cardi|asma|dpo|tireo|fibromial|lupus|artrite|artrose",
} as const;
