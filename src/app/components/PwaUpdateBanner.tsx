import { RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  activateWaitingServiceWorker,
  PWA_UPDATE_READY_EVENT,
} from "../../pwa/registerServiceWorker";

export function PwaUpdateBanner() {
  const [visible, setVisible] = useState(false);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    const show = () => setVisible(true);
    window.addEventListener(PWA_UPDATE_READY_EVENT, show);
    return () => window.removeEventListener(PWA_UPDATE_READY_EVENT, show);
  }, []);

  if (!visible) return null;
  return (
    <aside className="pwa-update-banner" role="status" aria-live="polite">
      <div><strong>Nowa wersja jest gotowa</strong><small>Odśwież po zakończeniu bieżącej rundy.</small></div>
      <button
        type="button"
        disabled={activating}
        onClick={() => {
          setActivating(true);
          void activateWaitingServiceWorker().catch(() => window.location.reload());
        }}
      ><RefreshCw /> {activating ? "Aktualizowanie…" : "Odśwież"}</button>
      <button type="button" className="icon-button" onClick={() => setVisible(false)} aria-label="Ukryj komunikat"><X /></button>
    </aside>
  );
}
