export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    const baseUrl = import.meta.env.BASE_URL;
    navigator.serviceWorker.register(`${baseUrl}sw.js`, { scope: baseUrl }).catch(() => {
      // PWA should never block the game if registration fails.
    });
  });
}
