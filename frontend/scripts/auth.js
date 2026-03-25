const tabLoginEl = document.getElementById("tab-login");
const tabSignupEl = document.getElementById("tab-signup");
const loginFormEl = document.getElementById("login-form");
const signupFormEl = document.getElementById("signup-form");

const loginEmailEl = document.getElementById("login-email");
const loginPasswordEl = document.getElementById("login-password");
const loginSubmitEl = document.getElementById("login-submit");
const loginErrorEl = document.getElementById("login-error");

const signupEmailEl = document.getElementById("signup-email");
const signupPasswordEl = document.getElementById("signup-password");
const signupPasswordConfirmEl = document.getElementById("signup-password-confirm");
const signupSubmitEl = document.getElementById("signup-submit");
const signupErrorEl = document.getElementById("signup-error");

const params = new URLSearchParams(window.location.search);
const nextPath = params.get("next") || "/dashboard";

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

function activateLoginTab({ focusField = false } = {}) {
  loginFormEl?.classList.remove("hidden");
  signupFormEl?.classList.add("hidden");
  tabLoginEl?.classList.add("active");
  tabLoginEl?.classList.remove("border-white/30");
  tabLoginEl?.classList.add("border-neonGreen/60", "text-neonGreen");
  tabSignupEl?.classList.remove("active");
  tabSignupEl?.classList.add("border-white/30");
  tabSignupEl?.classList.remove("border-neonGreen/60", "text-neonGreen");

  clearError(loginErrorEl);
  clearError(signupErrorEl);

  if (focusField && loginEmailEl instanceof HTMLInputElement) {
    loginEmailEl.focus();
  }
}

function activateSignupTab({ focusField = false } = {}) {
  loginFormEl?.classList.add("hidden");
  signupFormEl?.classList.remove("hidden");
  tabSignupEl?.classList.add("active");
  tabSignupEl?.classList.remove("border-white/30");
  tabSignupEl?.classList.add("border-neonGreen/60", "text-neonGreen");
  tabLoginEl?.classList.remove("active");
  tabLoginEl?.classList.add("border-white/30");
  tabLoginEl?.classList.remove("border-neonGreen/60", "text-neonGreen");

  clearError(loginErrorEl);
  clearError(signupErrorEl);

  if (focusField && signupEmailEl instanceof HTMLInputElement) {
    signupEmailEl.focus();
  }
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
  const email = loginEmailEl?.value?.trim();
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
    showError(
      loginErrorEl,
        error instanceof Error && error.message
          ? error.message
          : "Tivemos uma instabilidade. Tente novamente em instantes.",
    );
  } finally {
    setButtonLoading(loginSubmitEl, false, "Entrar na minha conta", "Entrando...");
  }
});

// Signup
signupFormEl?.addEventListener("submit", async (event) => {
  event.preventDefault();

  clearError(signupErrorEl);
  const email = signupEmailEl?.value?.trim();
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
    window.location.href = nextPath;
  } catch (error) {
    console.error(error);
    showError(
      signupErrorEl,
        error instanceof Error && error.message
          ? error.message
          : "Tivemos uma instabilidade. Tente novamente em instantes.",
    );
  } finally {
    setButtonLoading(signupSubmitEl, false, "Criar minha conta", "Criando conta...");
  }
});

if (params.get("mode") === "signup") {
  activateSignupTab({ focusField: true });
} else {
  activateLoginTab({ focusField: true });
}
