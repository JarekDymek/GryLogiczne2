import { ArrowLeft, LockKeyhole, LogOut, Search, ShieldCheck, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { puzzleFamilies } from "../../games/t-puzzle/pieces";
import type { PuzzleFamilyId } from "../../games/t-puzzle/types";
import { MowLogo } from "../components/Brand";
import {
  buildOwnerCatalog,
  solutionPreviewGeometry,
  type OwnerCatalogEntry,
} from "../owner/ownerCatalog";
import type { OwnerAccessState } from "../owner/ownerAccess";
import {
  getOwnerAuthClient,
  loadOwnerAccess,
  requestOwnerMagicLink,
  signOutOwner,
} from "../owner/supabaseOwnerAuth";

const COLORS = {
  blue: "#2f80ed",
  green: "#22c55e",
  red: "#ec4899",
  yellow: "#facc15",
};

function pointsAttribute(points: Array<{ x: number; y: number }>): string {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

export function OwnerSolutionPreview({ entry }: { entry: OwnerCatalogEntry }) {
  const geometry = solutionPreviewGeometry(entry.familyId, entry.target);
  return (
    <svg
      viewBox={geometry.viewBox}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Kolorowe rozwiązanie: ${entry.target.name}`}
    >
      {geometry.polygons.map((polygon) => (
        <polygon
          key={polygon.pieceId}
          points={pointsAttribute(polygon.points)}
          fill={COLORS[polygon.color]}
          stroke="#0f172a"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

function OwnerSignIn({ state, onRefresh }: { state: OwnerAccessState; onRefresh: () => void }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    const error = await requestOwnerMagicLink(email);
    setSending(false);
    setMessage(error ?? "Link logowania został wysłany. Otwórz go na tym urządzeniu.");
  }

  return (
    <section className="owner-gate" aria-live="polite">
      <LockKeyhole aria-hidden="true" />
      <h2>Dostęp właściciela</h2>
      {state.status === "unconfigured" ? (
        <p>Panel jest bezpiecznie wyłączony do czasu skonfigurowania backendu właściciela.</p>
      ) : state.status === "forbidden" ? (
        <>
          <p>To konto nie ma przypisanej roli właściciela.</p>
          <button type="button" onClick={() => void signOutOwner().then(onRefresh)}>
            Wyloguj konto
          </button>
        </>
      ) : state.status === "error" ? (
        <>
          <p>{state.message}</p>
          <button type="button" onClick={onRefresh}>Spróbuj ponownie</button>
        </>
      ) : (
        <form onSubmit={submit}>
          <p>Zaloguj się bezpiecznym, jednorazowym linkiem wysłanym przez backend.</p>
          <label>
            Adres konta właściciela
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              inputMode="email"
              required
            />
          </label>
          <button type="submit" disabled={sending}>
            {sending ? "Wysyłanie…" : "Wyślij link logowania"}
          </button>
          {message ? <p>{message}</p> : null}
        </form>
      )}
    </section>
  );
}

export function OwnerCatalogScreen({ onBack, onMentors }: { onBack: () => void; onMentors: () => void }) {
  const [access, setAccess] = useState<OwnerAccessState>({ status: "loading" });
  const [familyId, setFamilyId] = useState<PuzzleFamilyId>("gardner");
  const [query, setQuery] = useState("");
  const catalog = useMemo(buildOwnerCatalog, []);
  const refresh = useCallback(() => {
    setAccess({ status: "loading" });
    void loadOwnerAccess().then(setAccess);
  }, []);

  useEffect(() => {
    refresh();
    const authClient = getOwnerAuthClient();
    const subscription = authClient?.auth.onAuthStateChange(() => {
      window.setTimeout(refresh, 0);
    }).data.subscription;
    return () => subscription?.unsubscribe();
  }, [refresh]);

  const visibleEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pl");
    return catalog.filter(
      (entry) =>
        entry.familyId === familyId &&
        (!normalizedQuery ||
          entry.target.name.toLocaleLowerCase("pl").includes(normalizedQuery) ||
          String(entry.target.displayNumber).includes(normalizedQuery)),
    );
  }, [catalog, familyId, query]);

  if (access.status !== "authorized") {
    return (
      <main className="screen-shell owner-screen">
        <header className="screen-header">
          <button type="button" className="icon-button" onClick={onBack} aria-label="Wróć">
            <ArrowLeft />
          </button>
          <MowLogo className="header-logo" />
          <div>
            <span>STREFA CHRONIONA</span>
            <h1>Katalog wszystkich figur</h1>
          </div>
        </header>
        {access.status === "loading" ? (
          <section className="owner-gate" aria-live="polite">
            <ShieldCheck className="spinning" aria-hidden="true" />
            <h2>Sprawdzanie uprawnień</h2>
          </section>
        ) : (
          <OwnerSignIn state={access} onRefresh={refresh} />
        )}
      </main>
    );
  }

  return (
    <main className="screen-shell owner-screen">
      <header className="screen-header owner-catalog-header">
        <button type="button" className="icon-button" onClick={onBack} aria-label="Wróć">
          <ArrowLeft />
        </button>
        <MowLogo className="header-logo" />
        <div>
          <span>TYLKO WŁAŚCICIEL</span>
          <h1>Katalog wszystkich figur</h1>
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={() => void signOutOwner().then(refresh)}
          aria-label="Wyloguj konto właściciela"
        >
          <LogOut />
        </button>
      </header>

      <section className="owner-catalog-tools">
        <button type="button" className="owner-mentor-link" onClick={onMentors}>
          <Sparkles /> Mentorzy i reakcje
        </button>
        <div className="owner-family-tabs" role="tablist" aria-label="Rodzina układanki">
          {puzzleFamilies.map((family) => (
            <button
              key={family.id}
              type="button"
              role="tab"
              aria-selected={familyId === family.id}
              className={familyId === family.id ? "active" : ""}
              onClick={() => setFamilyId(family.id)}
            >
              {family.shortName}
            </button>
          ))}
        </div>
        <label className="owner-catalog-search">
          <Search aria-hidden="true" />
          <span>Znajdź figurę</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nazwa lub numer"
          />
        </label>
        <p>{visibleEntries.length} z 102 figur · łącznie w grze: {catalog.length}</p>
      </section>

      <section className="owner-catalog-grid" aria-label="Kolorowe rozwiązania figur">
        {visibleEntries.map((entry) => (
          <article key={entry.target.id}>
            <div>
              <span>#{entry.target.displayNumber}</span>
              <strong>{entry.target.name}</strong>
              <small>Poziom {entry.levelNumber}</small>
            </div>
            <OwnerSolutionPreview entry={entry} />
          </article>
        ))}
      </section>
    </main>
  );
}
