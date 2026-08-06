export const PWA_UPDATE_READY_EVENT = "gry-logiczne:pwa-update-ready";

export function registerServiceWorker() {
  if (import.meta.env.DEV || !("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    const baseUrl = import.meta.env.BASE_URL;
    navigator.serviceWorker.register(`${baseUrl}sw.js`, { scope: baseUrl }).then((registration) => {
      const announceUpdate = () => window.dispatchEvent(new Event(PWA_UPDATE_READY_EVENT));
      const hadController = Boolean(navigator.serviceWorker.controller);
      if (registration.waiting && navigator.serviceWorker.controller) announceUpdate();
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) announceUpdate();
        });
      });
      if (hadController) navigator.serviceWorker.addEventListener("controllerchange", announceUpdate, { once: true });
    }).catch(() => {
      // PWA should never block the game if registration fails.
    });
  });
}
