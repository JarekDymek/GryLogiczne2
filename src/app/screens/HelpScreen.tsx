import {
  ArrowLeft,
  ChevronDown,
  Download,
  Search,
  ShieldAlert,
  Upload,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { exportFullBackup, parseFullBackup, restoreFullBackup } from "../backup";
import { MowLogo } from "../components/Brand";
import { getHelpTopics } from "../help/topics";
import {
  defaultAppData,
  importAppData,
  type AppDataRecoveryRecord,
} from "../storage";
import type { AppData } from "../types";
import { resetStoredProgress } from "../../games/t-puzzle/progress";
import "./HelpScreen.css";

interface HelpScreenProps {
  data: AppData;
  recovery: AppDataRecoveryRecord | null;
  onBack: () => void;
  onRestoreData: (data: AppData) => void;
}

function downloadText(contents: string, fileName: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function HelpScreen({ data, recovery, onBack, onRestoreData }: HelpScreenProps) {
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const importRef = useRef<HTMLInputElement | null>(null);
  const topics = useMemo(
    () => getHelpTopics(recovery ? "recovery" : "home", query),
    [query, recovery],
  );

  async function exportBackup() {
    setBusy(true);
    setMessage("Przygotowuję pełną kopię z grafikami…");
    try {
      const contents = await exportFullBackup(data);
      downloadText(
        contents,
        `gry-logiczne-pelna-kopia-${new Date().toISOString().slice(0, 10)}.json`,
      );
      setMessage("Pełna kopia została pobrana. Zachowaj ją poza aplikacją.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nie udało się przygotować kopii.");
    } finally {
      setBusy(false);
    }
  }

  async function importBackup(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      if (file.size > 120 * 1024 * 1024) {
        throw new Error("Kopia przekracza bezpieczny limit 120 MB.");
      }
      const raw = await file.text();
      let imported: AppData;
      let fullBackup: ReturnType<typeof parseFullBackup> | null = null;
      try {
        fullBackup = parseFullBackup(raw);
        imported = fullBackup.appData;
      } catch {
        imported = importAppData(raw);
      }
      if (!window.confirm(
        "Zastąpić lokalne profile, wyniki, ustawienia i grafiki danymi z wybranej kopii?",
      )) return;

      const restoredAssets = fullBackup ? await restoreFullBackup(fullBackup) : 0;
      onRestoreData(imported);
      setMessage(
        `Kopia została przywrócona${restoredAssets ? ` wraz z ${restoredAssets} grafikami` : ""}.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Plik nie zawiera prawidłowej kopii danych.",
      );
    } finally {
      setBusy(false);
      if (importRef.current) importRef.current.value = "";
    }
  }

  function startFresh() {
    if (!window.confirm(
      "Rozpocząć od nowa? Oryginalny uszkodzony zapis zostanie zachowany w archiwum odzyskiwania, ale bez kopii nie da się odtworzyć brakujących danych.",
    )) return;
    try {
      resetStoredProgress();
      onRestoreData(defaultAppData());
      setMessage("Utworzono nowy profil. Uszkodzony surowy zapis zachowano w lokalnym archiwum.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nie udało się zapisać nowych danych.");
    }
  }

  return (
    <main className="screen-shell help-screen">
      <header className="screen-header">
        <button type="button" className="icon-button" onClick={onBack} aria-label="Wróć">
          <ArrowLeft />
        </button>
        <MowLogo className="header-logo" />
        <div>
          <span>INSTRUKCJE I DANE</span>
          <h1>Pomoc</h1>
        </div>
      </header>

      {recovery ? (
        <section className="help-recovery" role="alert">
          <ShieldAlert aria-hidden="true" />
          <div>
            <span>WYKRYTO PROBLEM Z LOKALNYMI DANYMI</span>
            <h2>Oryginalny zapis nie został nadpisany</h2>
            <p>
              Automatyczny zapis jest zatrzymany. Najbezpieczniej przywrócić wcześniejszą pełną kopię.
              Wykryto: {new Date(recovery.detectedAt).toLocaleString("pl-PL")}.
            </p>
            <small>{recovery.reason}</small>
          </div>
          <div className="help-recovery-actions">
            <button
              type="button"
              onClick={() => downloadText(
                recovery.rawValue,
                `gry-logiczne-uszkodzony-zapis-${recovery.detectedAt.slice(0, 10)}.txt`,
                "text/plain;charset=utf-8",
              )}
            >
              <Download /> Pobierz surowy zapis
            </button>
            <button type="button" className="danger-outline" onClick={startFresh}>
              Rozpocznij od nowa
            </button>
          </div>
        </section>
      ) : null}

      <section className="help-backup-panel" aria-labelledby="backup-heading">
        <div>
          <span>BEZPIECZEŃSTWO PROFILI</span>
          <h2 id="backup-heading">Kopia i odzyskiwanie danych</h2>
          <p>Profile graczy pozostają lokalne. Zapisz kopię poza aplikacją przed reinstalacją lub zmianą telefonu.</p>
        </div>
        <div className="help-backup-actions">
          <button type="button" disabled={busy} onClick={() => void exportBackup()}>
            <Download /> Pobierz pełną kopię
          </button>
          <button type="button" disabled={busy} onClick={() => importRef.current?.click()}>
            <Upload /> Importuj kopię
          </button>
          <input
            ref={importRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(event) => void importBackup(event.target.files?.[0])}
          />
        </div>
        {message ? <p className="screen-note" role="status">{message}</p> : null}
      </section>

      <label className="help-search">
        <Search aria-hidden="true" />
        <span>Znajdź instrukcję</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Np. obrót, kopia, właściciel"
        />
      </label>

      <section className="help-topic-list" aria-live="polite">
        {topics.map((topic) => (
          <details key={topic.id} className="help-topic">
            <summary>
              <span className="help-topic-symbol" aria-hidden="true">{topic.symbol}</span>
              <span>
                <strong>{topic.title}</strong>
                <small>{topic.summary}</small>
              </span>
              <ChevronDown aria-hidden="true" />
            </summary>
            <ol>
              {topic.steps.map((step) => <li key={step}>{step}</li>)}
            </ol>
          </details>
        ))}
        {topics.length === 0 ? (
          <p className="help-empty">Nie znaleziono instrukcji. Spróbuj krótszego hasła.</p>
        ) : null}
      </section>
    </main>
  );
}
