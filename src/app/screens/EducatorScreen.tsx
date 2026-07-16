import {
  ArrowLeft,
  Check,
  Download,
  FileJson,
  KeyRound,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  UserRoundCog,
  Users,
} from "lucide-react";
import { useRef, useState } from "react";
import { buildRanking } from "../rankings";
import { exportAppData, hashPin, importAppData } from "../storage";
import type { AppData, PlayerProfile, Team } from "../types";

interface EducatorScreenProps {
  data: AppData;
  onBack: () => void;
  onReplaceData: (data: AppData) => void;
  onUpdateProfile: (profile: PlayerProfile) => void;
  onCreateProfile: () => void;
  onDeleteProfile: (profileId: string) => void;
  onResetProfile: (profileId: string) => void;
  onSaveTeam: (team: Team) => void;
  onDeleteTeam: (teamId: string) => void;
  onFullReset: () => void;
}

function downloadText(contents: string, fileName: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function attemptsCsv(data: AppData): string {
  const header = [
    "data",
    "profil",
    "figura",
    "stopien",
    "zaliczenie",
    "punkty",
    "czas",
    "ruchy",
    "resety",
  ];
  const rows = data.attempts.map((attempt) => [
    attempt.completedAt,
    data.profiles.find((profile) => profile.id === attempt.profileId)?.nickname ?? attempt.profileId,
    attempt.targetKey,
    attempt.grade,
    attempt.success ? "tak" : "nie",
    attempt.points,
    attempt.elapsedSeconds,
    attempt.moves,
    attempt.resets,
  ]);
  return [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
}

export function EducatorScreen({
  data,
  onBack,
  onReplaceData,
  onUpdateProfile,
  onCreateProfile,
  onDeleteProfile,
  onResetProfile,
  onSaveTeam,
  onDeleteTeam,
  onFullReset,
}: EducatorScreenProps) {
  const [pin, setPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [message, setMessage] = useState("");
  const [teamName, setTeamName] = useState("");
  const [teamColor, setTeamColor] = useState("#2563eb");
  const importRef = useRef<HTMLInputElement | null>(null);
  const ranking = buildRanking(data.profiles, data.attempts, "week");

  function authorize() {
    if (!data.settings.educatorPinHash) {
      if (newPin.length < 4) {
        setMessage("Ustaw PIN składający się z co najmniej 4 znaków.");
        return;
      }
      onReplaceData({
        ...data,
        settings: { ...data.settings, educatorPinHash: hashPin(newPin) },
      });
      setUnlocked(true);
      setMessage("PIN został ustawiony lokalnie.");
      return;
    }
    if (hashPin(pin) === data.settings.educatorPinHash) {
      setUnlocked(true);
      setMessage("");
    } else {
      setMessage("Nieprawidłowy PIN.");
    }
  }

  async function importBackup(file?: File) {
    if (!file) {
      return;
    }
    try {
      const imported = importAppData(await file.text());
      if (!window.confirm("Zastąpić lokalne profile i wyniki danymi z kopii?")) {
        return;
      }
      onReplaceData(imported);
      setMessage("Kopia została zaimportowana.");
    } catch {
      setMessage("Plik nie zawiera prawidłowej kopii danych.");
    }
  }

  function createTeam() {
    if (!teamName.trim()) {
      return;
    }
    onSaveTeam({
      id: `team-${Date.now()}`,
      name: teamName.trim(),
      color: teamColor,
      memberProfileIds: [],
      createdAt: new Date().toISOString(),
    });
    setTeamName("");
  }

  if (!unlocked) {
    return (
      <main className="screen-shell educator-login">
        <header className="screen-header">
          <button type="button" className="icon-button" onClick={onBack} aria-label="Wróć"><ArrowLeft /></button>
          <div><span>PANEL WYCHOWAWCY</span><h1>Dostęp chroniony</h1></div>
        </header>
        <section className="pin-panel">
          <ShieldCheck />
          <h2>{data.settings.educatorPinHash ? "Wprowadź PIN" : "Ustaw lokalny PIN"}</h2>
          <p>PIN nie jest zapisany jawnie w kodzie aplikacji ani wysyłany do sieci.</p>
          <input
            type="password"
            inputMode="numeric"
            value={data.settings.educatorPinHash ? pin : newPin}
            onChange={(event) =>
              data.settings.educatorPinHash ? setPin(event.target.value) : setNewPin(event.target.value)
            }
            aria-label="PIN wychowawcy"
          />
          <button type="button" className="screen-primary-action" onClick={authorize}>
            <KeyRound />
            {data.settings.educatorPinHash ? "Odblokuj panel" : "Ustaw PIN"}
          </button>
          {message ? <p className="screen-note">{message}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <main className="screen-shell educator-screen">
      <header className="screen-header">
        <button type="button" className="icon-button" onClick={onBack} aria-label="Wróć"><ArrowLeft /></button>
        <div><span>PANEL WYCHOWAWCY</span><h1>Zarządzanie lokalne</h1></div>
        <ShieldCheck />
      </header>

      <section className="admin-summary">
        <div><span>Profile</span><strong>{data.profiles.length}</strong></div>
        <div><span>Próby</span><strong>{data.attempts.length}</strong></div>
        <div><span>Pojedynki</span><strong>{data.matches.length}</strong></div>
        <div><span>Drużyny</span><strong>{data.teams.length}</strong></div>
      </section>

      <section className="admin-section">
        <div className="section-heading">
          <div><span>ZAWODNICY</span><h2>Profile i grupy</h2></div>
          <button type="button" onClick={onCreateProfile}><Plus /> Nowy profil</button>
        </div>
        <div className="admin-profile-list">
          {data.profiles.map((profile) => (
            <article key={profile.id}>
              <UserRoundCog />
              <input
                value={profile.nickname}
                aria-label={`Pseudonim ${profile.nickname}`}
                onChange={(event) => onUpdateProfile({ ...profile, nickname: event.target.value })}
              />
              <input
                value={profile.groupName}
                aria-label={`Grupa ${profile.nickname}`}
                onChange={(event) => onUpdateProfile({ ...profile, groupName: event.target.value })}
              />
              <select
                value={data.teams.find((team) => team.memberProfileIds.includes(profile.id))?.id ?? ""}
                onChange={(event) => {
                  for (const team of data.teams) {
                    const without = team.memberProfileIds.filter((id) => id !== profile.id);
                    onSaveTeam({
                      ...team,
                      memberProfileIds:
                        event.target.value === team.id ? [...without, profile.id] : without,
                    });
                  }
                }}
                aria-label={`Drużyna ${profile.nickname}`}
              >
                <option value="">Bez drużyny</option>
                {data.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
              </select>
              <button type="button" onClick={() => {
                if (window.confirm(`Wyzerować postęp profilu ${profile.nickname}?`)) onResetProfile(profile.id);
              }} aria-label={`Wyzeruj ${profile.nickname}`}><RotateCcw /></button>
              <button type="button" onClick={() => {
                if (window.confirm(`Usunąć profil ${profile.nickname}?`)) onDeleteProfile(profile.id);
              }} aria-label={`Usuń ${profile.nickname}`}><Trash2 /></button>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-section">
        <div className="section-heading"><div><span>DRUŻYNY</span><h2>Grupy wychowawcze</h2></div><Users /></div>
        <div className="team-creator">
          <input value={teamName} onChange={(event) => setTeamName(event.target.value)} placeholder="Nazwa drużyny" />
          <input type="color" value={teamColor} onChange={(event) => setTeamColor(event.target.value)} aria-label="Kolor drużyny" />
          <button type="button" onClick={createTeam}><Plus /> Dodaj</button>
        </div>
        <div className="admin-team-list">
          {data.teams.map((team) => (
            <article key={team.id}>
              <i style={{ background: team.color }} />
              <strong>{team.name}</strong>
              <span>{team.memberProfileIds.length} zawodników</span>
              <button type="button" onClick={() => {
                if (window.confirm(`Usunąć drużynę ${team.name}?`)) onDeleteTeam(team.id);
              }}><Trash2 /></button>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-section">
        <div className="section-heading"><div><span>USTAWIENIA</span><h2>Bezpieczeństwo i treści</h2></div><Save /></div>
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={data.settings.allowCustomTextures}
            onChange={(event) =>
              onReplaceData({
                ...data,
                settings: { ...data.settings, allowCustomTextures: event.target.checked },
              })
            }
          />
          <span><strong>Własne grafiki skórek</strong><small>Wyłącz, jeśli urządzenie jest używane bez nadzoru.</small></span>
        </label>
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={data.settings.reducedEffects}
            onChange={(event) =>
              onReplaceData({
                ...data,
                settings: { ...data.settings, reducedEffects: event.target.checked },
              })
            }
          />
          <span><strong>Ograniczone animacje</strong><small>Zmniejsza liczbę efektów niezależnie od ustawień systemu.</small></span>
        </label>
      </section>

      <section className="admin-section">
        <div className="section-heading"><div><span>RANKING TYGODNIA</span><h2>Podgląd</h2></div><Check /></div>
        <ol className="admin-ranking">
          {ranking.slice(0, 8).map((entry) => (
            <li key={entry.profile.id}><span>{entry.profile.nickname}</span><strong>{entry.points} pkt</strong></li>
          ))}
        </ol>
      </section>

      <section className="admin-section backup-section">
        <div className="section-heading"><div><span>DANE</span><h2>Kopia, import i eksport</h2></div><FileJson /></div>
        <input ref={importRef} type="file" accept="application/json" hidden onChange={(event) => void importBackup(event.target.files?.[0])} />
        <div>
          <button type="button" onClick={() => downloadText(exportAppData(data), "gry-logiczne-kopia.json", "application/json")}><Download /> Eksport JSON</button>
          <button type="button" onClick={() => downloadText(attemptsCsv(data), "gry-logiczne-wyniki.csv", "text/csv")}><Download /> Eksport CSV</button>
          <button type="button" onClick={() => importRef.current?.click()}><Upload /> Import kopii</button>
        </div>
      </section>

      <button type="button" className="danger-zone" onClick={() => {
        if (window.confirm("Usunąć wszystkie lokalne profile, wyniki i ustawienia z tego urządzenia?")) onFullReset();
      }}>
        <Trash2 />
        Pełny reset urządzenia
      </button>
      {message ? <p className="screen-note">{message}</p> : null}
    </main>
  );
}
