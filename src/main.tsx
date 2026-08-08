import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { PwaUpdateBanner } from "./app/components/PwaUpdateBanner";
import { registerServiceWorker } from "./pwa/registerServiceWorker";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
    <PwaUpdateBanner />
  </StrictMode>,
);

registerServiceWorker();

async function restoreOwnerRouteAfterAuth(): Promise<void> {
  if (new URLSearchParams(window.location.search).get("owner") !== "1") return;

  const { getOwnerAuthClient } = await import("./app/owner/supabaseOwnerAuth");
  await getOwnerAuthClient()?.auth.getSession();
  window.location.hash = "owner";
}

void restoreOwnerRouteAfterAuth();
