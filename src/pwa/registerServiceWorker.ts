export const PWA_UPDATE_READY_EVENT = "gry-logiczne:pwa-update-ready";

let activeRegistration: ServiceWorkerRegistration | null = null;

export async function activateWaitingServiceWorker(): Promise<void> {
  if (!("serviceWorker" in navigator)) {
    window.location.reload();
    return;
  }
  const registration =
    activeRegistration ??
    (await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL)) ??
    null;
  if (!registration?.waiting) {
    window.location.reload();
    return;
  }

  navigator.serviceWorker.addEventListener(
    "controllerchange",
    () => window.location.reload(),
    { once: true },
  );
  registration.waiting.postMessage({ type: "SKIP_WAITING" });
}

export function registerServiceWorker() {
  if (import.meta.env.DEV || !("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    const baseUrl = import.meta.env.BASE_URL;
    navigator.serviceWorker.register(`${baseUrl}sw.js`, { scope: baseUrl }).then((registration) => {
      activeRegistration = registration;
      const announceUpdate = () => window.dispatchEvent(new Event(PWA_UPDATE_READY_EVENT));
      if (registration.waiting && navigator.serviceWorker.controller) announceUpdate();
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) announceUpdate();
        });
      });
    }).catch(() => {
      // PWA should never block the game if registration fails.
    });
  });
}
