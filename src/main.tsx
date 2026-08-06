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
