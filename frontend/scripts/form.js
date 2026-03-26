const form = document.getElementById("workout-form");
const alturaInput = document.getElementById("altura-input");
const focoTreinoWrapper = document.getElementById("foco-treino-wrapper");
const focoTreinoSelect = document.getElementById("foco-treino-select");
const submitWorkoutBtn = document.getElementById("submit-workout");
const formFeedbackEl = document.getElementById("form-feedback");

function showFormFeedback(message) {
  if (!formFeedbackEl) {
    return;
  }

  formFeedbackEl.textContent = message;
  formFeedbackEl.classList.remove("hidden", "status-inline-success");
  formFeedbackEl.classList.add("status-inline-error");
}

function clearFormFeedback() {
  if (!formFeedbackEl) {
    return;
  }

  formFeedbackEl.textContent = "";
  formFeedbackEl.classList.add("hidden");
  formFeedbackEl.classList.remove("status-inline-error", "status-inline-success");
}

function setSubmitLoading(isLoading) {
  if (!(submitWorkoutBtn instanceof HTMLButtonElement)) {
    return;
  }

  submitWorkoutBtn.disabled = isLoading;
  submitWorkoutBtn.classList.toggle("is-loading", isLoading);
  submitWorkoutBtn.textContent = isLoading ? "Preparando sua ficha..." : "Gerar minha ficha agora";
}

function formatAlturaValue(rawValue) {
  const onlyAllowed = rawValue.replace(/[^\d.,]/g, "").replace(/,/g, ".");

  if (!onlyAllowed) {
    return "";
  }

  // Caso a usuaria digite apenas numeros (ex.: 174), convertemos para 1.74.
  if (/^\d+$/.test(onlyAllowed)) {
    if (onlyAllowed.length <= 1) {
      return onlyAllowed;
    }

    const integerPart = onlyAllowed.slice(0, 1);
    const decimalPart = onlyAllowed.slice(1, 3);
    return decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
  }

  const [integerPartRaw, decimalPartRaw = ""] = onlyAllowed.split(".");
  const integerPart = integerPartRaw.slice(0, 1);
  const decimalPart = decimalPartRaw.replace(/\./g, "").slice(0, 2);

  if (!integerPart) {
    return "";
  }

  return decimalPart.length > 0 ? `${integerPart}.${decimalPart}` : integerPart;
}

alturaInput?.addEventListener("input", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  target.value = formatAlturaValue(target.value);
});

function shouldShowFocoTreino(nivel) {
  return nivel === "intermediario" || nivel === "avancado";
}

function validatePayloadInput({ nome, idade, peso, altura, diasSemana }) {
  if (nome.length < 2) {
    return "Informe o nome da cliente com pelo menos 2 caracteres.";
  }

  if (!Number.isFinite(idade) || idade < 14 || idade > 85) {
    return "Informe uma idade válida entre 14 e 85 anos.";
  }

  if (!Number.isFinite(peso) || peso < 35 || peso > 250) {
    return "Informe um peso válido entre 35kg e 250kg.";
  }

  if (!Number.isFinite(altura) || altura < 1.3 || altura > 2.2) {
    return "Informe a altura no formato 1.74 (entre 1.30 e 2.20).";
  }

  if (!Number.isFinite(diasSemana) || diasSemana < 2 || diasSemana > 6) {
    return "Selecione uma frequência semanal entre 2 e 6 dias.";
  }

  return "";
}

function buildPayloadFromForm(formData) {
  const nome = String(formData.get("nome") || "").trim();
  const nivel = String(formData.get("nivel"));
  const focoTreinoRaw = String(formData.get("focoTreino") || "nenhum");
  const focoTreino = shouldShowFocoTreino(nivel) ? focoTreinoRaw : "nenhum";
  const periodicidade = String(formData.get("periodicidade") || "semanal");
  const rawAltura = String(formData.get("altura") || "");
  const altura = Number(rawAltura.replace(",", "."));
  const idade = Number(formData.get("idade"));
  const peso = Number(formData.get("peso"));
  const diasSemana = Number(formData.get("diasSemana"));

  const validationMessage = validatePayloadInput({ nome, idade, peso, altura, diasSemana });
  if (validationMessage) {
    return { payload: null, validationMessage };
  }

  return {
    payload: {
      nome,
      idade,
      peso,
      altura,
      objetivo: String(formData.get("objetivo")),
      nivel,
      focoTreino,
      diasSemana,
      periodicidade,
      observacoes: String(formData.get("observacoes") || "").trim(),
    },
    validationMessage: "",
  };
}

function syncFocoTreinoVisibility() {
  if (!(form instanceof HTMLFormElement) || !(focoTreinoWrapper instanceof HTMLElement) || !(focoTreinoSelect instanceof HTMLSelectElement)) {
    return;
  }

  const nivel = String(new FormData(form).get("nivel") || "");
  const showFocoTreino = shouldShowFocoTreino(nivel);

  focoTreinoWrapper.classList.toggle("hidden", !showFocoTreino);
  focoTreinoSelect.disabled = !showFocoTreino;

  if (!showFocoTreino) {
    focoTreinoSelect.value = "nenhum";
  }
}

form?.addEventListener("change", (event) => {
  const target = event.target;
  if (target instanceof HTMLSelectElement && target.name === "nivel") {
    syncFocoTreinoVisibility();
  }
});

syncFocoTreinoVisibility();

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  clearFormFeedback();

  const formData = new FormData(form);
  const { payload, validationMessage } = buildPayloadFromForm(formData);
  if (!payload) {
    showFormFeedback(validationMessage);
    return;
  }

  setSubmitLoading(true);
  localStorage.setItem("workoutPayload", JSON.stringify(payload));
  localStorage.removeItem("workoutResult");
  window.location.href = "/resultado";
});
