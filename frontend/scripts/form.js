const form = document.getElementById("workout-form");
const alturaInput = document.getElementById("altura-input");

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

form?.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const rawAltura = String(formData.get("altura") || "");
  const altura = Number(rawAltura.replace(",", "."));

  if (!Number.isFinite(altura) || altura < 1.3 || altura > 2.2) {
    alert("Informe a altura no formato 1.74 (entre 1.30 e 2.20).");
    return;
  }

  const payload = {
    idade: Number(formData.get("idade")),
    peso: Number(formData.get("peso")),
    altura,
    objetivo: String(formData.get("objetivo")),
    nivel: String(formData.get("nivel")),
    diasSemana: Number(formData.get("diasSemana")),
    observacoes: String(formData.get("observacoes") || "").trim(),
  };

  localStorage.setItem("workoutPayload", JSON.stringify(payload));
  window.location.href = "/resultado";
});
