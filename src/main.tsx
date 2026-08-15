import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { PwaUpdateBanner } from "./app/components/PwaUpdateBanner";
import { registerServiceWorker } from "./pwa/registerServiceWorker";
import { isOwnerAuthCallback, ownerPanelUrlAfterAuth } from "./app/owner/routes";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
    <PwaUpdateBanner />
  </StrictMode>,
);

registerServiceWorker();

async function restoreOwnerRouteAfterAuth(): Promise<void> {
  if (!isOwnerAuthCallback(window.location.search)) return;

  const { getOwnerAuthClient } = await import("./app/owner/supabaseOwnerAuth");
  await getOwnerAuthClient()?.auth.getSession();
  window.location.replace(ownerPanelUrlAfterAuth(window.location.href));
}

void restoreOwnerRouteAfterAuth();
