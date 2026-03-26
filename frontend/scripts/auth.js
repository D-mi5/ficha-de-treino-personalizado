const tabLoginEl = document.getElementById("tab-login");
const tabSignupEl = document.getElementById("tab-signup");
const loginFormEl = document.getElementById("login-form");
const signupFormEl = document.getElementById("signup-form");

const loginEmailEl = document.getElementById("login-email");
const loginPasswordEl = document.getElementById("login-password");
const loginPasswordToggleEl = document.getElementById("login-password-toggle");
const loginSubmitEl = document.getElementById("login-submit");
const loginErrorEl = document.getElementById("login-error");

const signupEmailEl = document.getElementById("signup-email");
const signupPasswordEl = document.getElementById("signup-password");
const signupPasswordConfirmEl = document.getElementById("signup-password-confirm");
const signupPasswordToggleEl = document.getElementById("signup-password-toggle");
const signupPasswordConfirmToggleEl = document.getElementById("signup-password-confirm-toggle");
const signupPasswordStrengthEl = document.getElementById("signup-password-strength");
const signupPasswordStrengthBarEl = document.getElementById("signup-password-strength-bar");
const signupPasswordStrengthLabelEl = document.getElementById("signup-password-strength-label");
const signupSubmitEl = document.getElementById("signup-submit");
const signupErrorEl = document.getElementById("signup-error");

const params = new URLSearchParams(window.location.search);
const nextPath = params.get("next") || "/form";
const prefillLoginEmail = (params.get("prefillEmail") || "").trim();

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function getSafeErrorMessage(error) {
  return error instanceof Error && error.message
    ? error.message
    : "Tivemos uma instabilidade. Tente novamente em instantes.";
}

function showError(errorEl, message) {
  if (!errorEl) {
    return;
  }

  errorEl.textContent = message;
  errorEl.classList.remove("hidden", "status-inline-success");
  errorEl.classList.add("status-inline-error");
}

function clearError(errorEl) {
  if (!errorEl) {
    return;
  }

  errorEl.textContent = "";
  errorEl.classList.add("hidden");
  errorEl.classList.remove("status-inline-error", "status-inline-success");
}

function setButtonLoading(buttonEl, isLoading, baseLabel, loadingLabel) {
  if (!(buttonEl instanceof HTMLButtonElement)) {
    return;
  }

  buttonEl.disabled = isLoading;
  buttonEl.classList.toggle("is-loading", isLoading);
  buttonEl.textContent = isLoading ? loadingLabel : baseLabel;
}

function setTabActiveState(activeTab) {
  const isLoginActive = activeTab === "login";

  if (isLoginActive) {
    tabLoginEl?.classList.add("active");
    tabLoginEl?.classList.remove("border-white/30");
    tabLoginEl?.classList.add("border-neonGreen/60", "text-neonGreen");
    tabSignupEl?.classList.remove("active");
    tabSignupEl?.classList.add("border-white/30");
    tabSignupEl?.classList.remove("border-neonGreen/60", "text-neonGreen");
    return;
  }

  tabSignupEl?.classList.add("active");
  tabSignupEl?.classList.remove("border-white/30");
  tabSignupEl?.classList.add("border-neonGreen/60", "text-neonGreen");
  tabLoginEl?.classList.remove("active");
  tabLoginEl?.classList.add("border-white/30");
  tabLoginEl?.classList.remove("border-neonGreen/60", "text-neonGreen");
}

function evaluatePasswordStrength(password) {
  const safePassword = String(password || "");
  let score = 0;

  if (safePassword.length >= 8) score += 1;
  if (safePassword.length >= 12) score += 1;
  if (/[A-Z]/.test(safePassword) && /[a-z]/.test(safePassword)) score += 1;
  if (/\d/.test(safePassword)) score += 1;
  if (/[^A-Za-z0-9]/.test(safePassword)) score += 1;

  if (safePassword.length === 0) {
    return { label: "Força da senha", levelClass: "", width: "0%" };
  }

  if (score <= 2) {
    return { label: "Senha fraca", levelClass: "is-weak", width: "34%" };
  }

  if (score <= 4) {
    return { label: "Senha média", levelClass: "is-medium", width: "67%" };
  }

  return { label: "Senha forte", levelClass: "is-strong", width: "100%" };
}

function renderPasswordStrength(password) {
  if (!signupPasswordStrengthEl || !signupPasswordStrengthBarEl || !signupPasswordStrengthLabelEl) {
    return;
  }

  const result = evaluatePasswordStrength(password);

  if (!password) {
    signupPasswordStrengthEl.classList.add("hidden");
  } else {
    signupPasswordStrengthEl.classList.remove("hidden");
  }

  signupPasswordStrengthBarEl.classList.remove("is-weak", "is-medium", "is-strong");
  if (result.levelClass) {
    signupPasswordStrengthBarEl.classList.add(result.levelClass);
  }
  signupPasswordStrengthBarEl.style.width = result.width;
  signupPasswordStrengthLabelEl.textContent = result.label;
}

function bindPasswordToggle(buttonEl, inputEl) {
  if (!(buttonEl instanceof HTMLButtonElement) || !(inputEl instanceof HTMLInputElement)) {
    return;
  }

  const openIconEl = buttonEl.querySelector(".icon-eye-open");
  const closedIconEl = buttonEl.querySelector(".icon-eye-closed");

  function renderVisibilityState(isVisible) {
    const isPasswordHidden = !isVisible;

    if (openIconEl instanceof SVGElement) {
      openIconEl.style.display = isVisible ? "block" : "none";
    }

    if (closedIconEl instanceof SVGElement) {
      closedIconEl.style.display = isPasswordHidden ? "block" : "none";
    }

    buttonEl.setAttribute("aria-pressed", isVisible ? "true" : "false");
    buttonEl.setAttribute("aria-label", isPasswordHidden ? "Mostrar senha" : "Ocultar senha");
    buttonEl.setAttribute("title", isPasswordHidden ? "Mostrar senha" : "Ocultar senha");
  }

  renderVisibilityState(inputEl.type !== "password");

  buttonEl.addEventListener("click", () => {
    const isCurrentlyVisible = inputEl.type !== "password";

    if (!isCurrentlyVisible) {
      inputEl.type = "text";
      renderVisibilityState(true);
    } else {
      inputEl.type = "password";
      renderVisibilityState(false);
    }

    inputEl.focus();
  });
}

function activateLoginTab({ focusField = false } = {}) {
  loginFormEl?.classList.remove("hidden");
  signupFormEl?.classList.add("hidden");
  setTabActiveState("login");

  clearError(loginErrorEl);
  clearError(signupErrorEl);

  if (focusField) {
    if (loginPasswordEl instanceof HTMLInputElement && loginEmailEl instanceof HTMLInputElement && loginEmailEl.value) {
      loginPasswordEl.focus();
    } else if (loginEmailEl instanceof HTMLInputElement) {
      loginEmailEl.focus();
    }
  }
}

function activateSignupTab({ focusField = false } = {}) {
  loginFormEl?.classList.add("hidden");
  signupFormEl?.classList.remove("hidden");
  setTabActiveState("signup");

  clearError(loginErrorEl);
  clearError(signupErrorEl);

  if (focusField && signupEmailEl instanceof HTMLInputElement) {
    signupEmailEl.focus();
  }
}

function transferSignupEmailToLogin() {
  if (!(signupEmailEl instanceof HTMLInputElement) || !(loginEmailEl instanceof HTMLInputElement)) {
    return;
  }

  loginEmailEl.value = signupEmailEl.value.trim();
}

function openLoginFormAfterSignup(email) {
  if (loginEmailEl instanceof HTMLInputElement) {
    loginEmailEl.value = normalizeEmail(email);
  }

  // Mantém a URL consistente com o estado atual da aba sem recarregar a página.
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set("mode", "login");
  nextUrl.searchParams.set("prefillEmail", normalizeEmail(email));
  window.history.replaceState({}, "", `${nextUrl.pathname}?${nextUrl.searchParams.toString()}`);

  activateLoginTab({ focusField: true });
}

// Toggle entre abas
tabLoginEl?.addEventListener("click", () => {
  activateLoginTab({ focusField: true });
});

tabSignupEl?.addEventListener("click", () => {
  activateSignupTab({ focusField: true });
});

// Login
loginFormEl?.addEventListener("submit", async (event) => {
  event.preventDefault();

  clearError(loginErrorEl);
  const email = normalizeEmail(loginEmailEl?.value);
  const password = loginPasswordEl?.value;

  if (!email || !password) {
    showError(loginErrorEl, "Preencha e-mail e senha.");
    return;
  }

  try {
    setButtonLoading(loginSubmitEl, true, "Entrar na minha conta", "Entrando...");
    await window.apiClient.login(email, password);
    window.location.href = nextPath;
  } catch (error) {
    console.error(error);
    showError(loginErrorEl, getSafeErrorMessage(error));
  } finally {
    setButtonLoading(loginSubmitEl, false, "Entrar na minha conta", "Entrando...");
  }
});

// Signup
signupFormEl?.addEventListener("submit", async (event) => {
  event.preventDefault();

  clearError(signupErrorEl);
  const email = normalizeEmail(signupEmailEl?.value);
  const password = signupPasswordEl?.value;
  const passwordConfirm = signupPasswordConfirmEl?.value;

  if (!email || !password || !passwordConfirm) {
    showError(signupErrorEl, "Preencha todos os campos.");
    return;
  }

  if (password !== passwordConfirm) {
    showError(signupErrorEl, "As senhas não coincidem.");
    return;
  }

  if (password.length < 6) {
    showError(signupErrorEl, "A senha precisa ter no mínimo 6 caracteres.");
    return;
  }

  try {
    setButtonLoading(signupSubmitEl, true, "Criar minha conta", "Criando conta...");
    await window.apiClient.register(email, password);

    if (signupPasswordEl instanceof HTMLInputElement) {
      signupPasswordEl.value = "";
      renderPasswordStrength("");
    }

    if (signupPasswordConfirmEl instanceof HTMLInputElement) {
      signupPasswordConfirmEl.value = "";
    }

    transferSignupEmailToLogin();
    openLoginFormAfterSignup(email);
    return;
  } catch (error) {
    console.error("Signup error:", error);
    showError(signupErrorEl, getSafeErrorMessage(error));
  } finally {
    setButtonLoading(signupSubmitEl, false, "Criar minha conta", "Criando conta...");
  }
});

if (params.get("mode") === "login") {
  activateLoginTab({ focusField: true });
} else {
  activateSignupTab({ focusField: true });
}

if (prefillLoginEmail && loginEmailEl instanceof HTMLInputElement) {
  loginEmailEl.value = prefillLoginEmail;
  activateLoginTab({ focusField: true });
}

if (signupPasswordEl instanceof HTMLInputElement) {
  signupPasswordEl.addEventListener("input", (event) => {
    const value = event?.target instanceof HTMLInputElement ? event.target.value : "";
    renderPasswordStrength(value);
  });
}

bindPasswordToggle(signupPasswordToggleEl, signupPasswordEl);
bindPasswordToggle(signupPasswordConfirmToggleEl, signupPasswordConfirmEl);
bindPasswordToggle(loginPasswordToggleEl, loginPasswordEl);
