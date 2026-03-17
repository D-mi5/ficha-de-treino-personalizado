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

// Toggle entre abas
tabLoginEl?.addEventListener("click", () => {
  loginFormEl?.classList.remove("hidden");
  signupFormEl?.classList.add("hidden");
  tabLoginEl.classList.add("active");
  tabLoginEl.classList.remove("border-white/30");
  tabLoginEl.classList.add("border-neonGreen/60", "text-neonGreen");
  tabSignupEl.classList.remove("active");
  tabSignupEl.classList.add("border-white/30");
  tabSignupEl.classList.remove("border-neonGreen/60", "text-neonGreen");
});

tabSignupEl?.addEventListener("click", () => {
  loginFormEl?.classList.add("hidden");
  signupFormEl?.classList.remove("hidden");
  tabSignupEl.classList.add("active");
  tabSignupEl.classList.remove("border-white/30");
  tabSignupEl.classList.add("border-neonGreen/60", "text-neonGreen");
  tabLoginEl.classList.remove("active");
  tabLoginEl.classList.add("border-white/30");
  tabLoginEl.classList.remove("border-neonGreen/60", "text-neonGreen");
});

// Login
loginSubmitEl?.addEventListener("click", async () => {
  const email = loginEmailEl?.value?.trim();
  const password = loginPasswordEl?.value;

  if (!email || !password) {
    if (loginErrorEl) loginErrorEl.textContent = "Preencha e-mail e senha.";
    loginErrorEl?.classList.remove("hidden");
    return;
  }

  try {
    await window.apiClient.login(email, password);

    window.location.href = "/dashboard";
  } catch (error) {
    console.error(error);
    if (loginErrorEl) {
      loginErrorEl.textContent =
        error instanceof Error && error.message
          ? error.message
          : "Tivemos uma instabilidade. Tente novamente em instantes.";
    }
    loginErrorEl?.classList.remove("hidden");
  }
});

// Signup
signupSubmitEl?.addEventListener("click", async () => {
  const email = signupEmailEl?.value?.trim();
  const password = signupPasswordEl?.value;
  const passwordConfirm = signupPasswordConfirmEl?.value;

  if (!email || !password || !passwordConfirm) {
    if (signupErrorEl) signupErrorEl.textContent = "Preencha todos os campos.";
    signupErrorEl?.classList.remove("hidden");
    return;
  }

  if (password !== passwordConfirm) {
    if (signupErrorEl) signupErrorEl.textContent = "As senhas não coincidem.";
    signupErrorEl?.classList.remove("hidden");
    return;
  }

  if (password.length < 6) {
    if (signupErrorEl) signupErrorEl.textContent = "A senha precisa ter no mínimo 6 caracteres.";
    signupErrorEl?.classList.remove("hidden");
    return;
  }

  try {
    await window.apiClient.register(email, password);

    window.location.href = "/dashboard";
  } catch (error) {
    console.error(error);
    if (signupErrorEl) {
      signupErrorEl.textContent =
        error instanceof Error && error.message
          ? error.message
          : "Tivemos uma instabilidade. Tente novamente em instantes.";
    }
    signupErrorEl?.classList.remove("hidden");
  }
});
