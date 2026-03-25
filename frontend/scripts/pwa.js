const isLocalhost =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "[::1]";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    if (isLocalhost) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));

      if ("caches" in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
      }
      return;
    }

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
