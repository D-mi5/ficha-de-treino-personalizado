if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Falha ao registrar service worker:", error);
    });
  });
}

let deferredPrompt = null;

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt = event;

  const installBtn = document.getElementById("install-app");
  if (installBtn) {
    installBtn.classList.remove("hidden");
  }
});

window.addEventListener("appinstalled", () => {
  const installBtn = document.getElementById("install-app");
  if (installBtn) {
    installBtn.classList.add("hidden");
  }
  deferredPrompt = null;
});

document.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  if (target.id !== "install-app") {
    return;
  }

  if (!deferredPrompt) {
    return;
  }

  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  target.classList.add("hidden");
});
