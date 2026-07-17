import {
  ArrowLeft,
  Check,
  Copy,
  Crown,
  LoaderCircle,
  LogOut,
  Play,
  Radio,
  RefreshCcw,
  Share2,
  Users,
  Wifi,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getTPuzzleLevels } from "../../games/t-puzzle/levels";
import { puzzleFamilies } from "../../games/t-puzzle/pieces";
import { SOCIAL_GRADES, TIME_LIMITS } from "../../games/t-puzzle/progress";
import {
  canStartMultiplayer,
  normalizeRoomCode,
  rankMultiplayerParticipants,
  type MultiplayerRoomSnapshot,
  type MultiplayerSettings,
  type PeerRoomState,
} from "../multiplayer/multiplayer";
import type { PlayerProfile } from "../types";
import { PlayerAvatar } from "../components/Brand";

interface MultiplayerScreenProps {
  profile: PlayerProfile;
  state: PeerRoomState;
  initialSettings: MultiplayerSettings;
  launchedRoundId: string | null;
  startAtLocal: () => number | null;
  onCreate: (settings: MultiplayerSettings) => Promise<string>;
  onJoin: (code: string) => Promise<void>;
  onReady: (ready: boolean) => void;
  onUpdateSettings: (settings: MultiplayerSettings) => void;
  onStartRound: () => boolean;
  onResetLobby: () => void;
  onLaunchGame: (settings: MultiplayerSettings, startAt: number, roundId: string) => void;
  onLeave: () => void;
  onBack: () => void;
}

function resultLabel(snapshot: MultiplayerRoomSnapshot, participantId: string): string {
  const participant = snapshot.participants.find((entry) => entry.id === participantId);
  if (!participant?.result) {
    return snapshot.phase === "playing" ? "układa" : participant?.ready ? "gotowy" : "czeka";
  }
  return participant.result.success
    ? `${participant.result.elapsedSeconds} s · ${participant.result.moves} ruchów`
    : "nie zaliczył";
}

export function MultiplayerScreen({
  profile,
  state,
  initialSettings,
  launchedRoundId,
  startAtLocal,
  onCreate,
  onJoin,
  onReady,
  onUpdateSettings,
  onStartRound,
  onResetLobby,
  onLaunchGame,
  onLeave,
  onBack,
}: MultiplayerScreenProps) {
  const roomFromUrl = new URLSearchParams(window.location.search).get("room") ?? "";
  const [joinCode, setJoinCode] = useState(normalizeRoomCode(roomFromUrl));
  const [formError, setFormError] = useState("");
  const [copied, setCopied] = useState(false);
  const snapshot = state.snapshot;
  const settings = snapshot?.settings ?? initialSettings;
  const levels = getTPuzzleLevels(settings.familyId);
  const localParticipant = snapshot?.participants.find(
    (participant) => participant.id === state.localParticipantId,
  );
  const ranking = useMemo(
    () => (snapshot ? rankMultiplayerParticipants(snapshot.participants) : []),
    [snapshot],
  );

  useEffect(() => {
    if (
      !snapshot?.roundId ||
      !snapshot.startAtHost ||
      launchedRoundId === snapshot.roundId ||
      localParticipant?.result ||
      (snapshot.phase !== "countdown" && snapshot.phase !== "playing")
    ) {
      return;
    }
    onLaunchGame(
      snapshot.settings,
      startAtLocal() ?? Date.now(),
      snapshot.roundId,
    );
  }, [launchedRoundId, localParticipant?.result, onLaunchGame, snapshot, startAtLocal]);

  async function createRoom() {
    setFormError("");
    try {
      await onCreate(initialSettings);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Nie udało się utworzyć pokoju.");
    }
  }

  async function joinRoom() {
    setFormError("");
    try {
      await onJoin(joinCode);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Nie udało się dołączyć do pokoju.");
    }
  }

  async function shareRoom() {
    if (!snapshot) {
      return;
    }
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("room", snapshot.roomCode);
    const shareData = {
      title: "T-Puzzle MOW",
      text: `Dołącz do pokoju ${snapshot.roomCode}`,
      url: url.toString(),
    };
    if (navigator.share) {
      await navigator.share(shareData);
      return;
    }
    await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function copyCode() {
    if (!snapshot) {
      return;
    }
    await navigator.clipboard.writeText(snapshot.roomCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function leaveRoom() {
    onLeave();
    const url = new URL(window.location.href);
    url.searchParams.delete("room");
    window.history.replaceState({}, "", url);
  }

  return (
    <main className="screen-shell multiplayer-screen">
      <header className="screen-header">
        <button
          type="button"
          className="icon-button"
          onClick={snapshot ? leaveRoom : onBack}
          aria-label="Wróć"
        >
          <ArrowLeft />
        </button>
        <div>
          <span>GRA ONLINE</span>
          <h1>{snapshot ? `Pokój ${snapshot.roomCode}` : "Wspólny start na wielu urządzeniach"}</h1>
        </div>
        <Wifi className={state.status === "connected" ? "online" : ""} />
      </header>

      {!snapshot ? (
        <>
          <section className="multiplayer-intro">
            <Radio />
            <div>
              <strong>Jedna plansza, ten sam zegar</strong>
              <p>Host wybiera wyzwanie. Od 2 do 8 osób układa je równocześnie na swoich urządzeniach.</p>
            </div>
          </section>

          <section className="multiplayer-entry-grid">
            <article>
              <Crown />
              <h2>Utwórz pokój</h2>
              <p>Otrzymasz kod do przekazania pozostałym graczom.</p>
              <button
                type="button"
                className="screen-primary-action"
                disabled={state.status === "connecting"}
                onClick={() => void createRoom()}
              >
                {state.status === "connecting" ? <LoaderCircle className="spinning" /> : <Users />}
                Utwórz
              </button>
            </article>
            <article>
              <Wifi />
              <h2>Dołącz kodem</h2>
              <label>
                KOD POKOJU
                <input
                  type="text"
                  value={joinCode}
                  maxLength={6}
                  inputMode="text"
                  autoComplete="off"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="go"
                  placeholder="ABC234"
                  onChange={(event) => setJoinCode(normalizeRoomCode(event.target.value))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && joinCode.length === 6) {
                      void joinRoom();
                    }
                  }}
                />
              </label>
              <button
                type="button"
                disabled={joinCode.length !== 6 || state.status === "connecting"}
                onClick={() => void joinRoom()}
              >
                {state.status === "connecting" ? <LoaderCircle className="spinning" /> : <Play />}
                Dołącz
              </button>
            </article>
          </section>
          <p className="screen-note">Tryb online wymaga internetu. Dane gry płyną szyfrowanym połączeniem WebRTC między urządzeniami.</p>
        </>
      ) : (
        <>
          <section className="room-code-panel">
            <div>
              <span>KOD POKOJU</span>
              <strong>{snapshot.roomCode}</strong>
              <small>{state.role === "host" ? "Jesteś hostem" : "Połączono z hostem"}</small>
            </div>
            <button type="button" className="icon-button" onClick={() => void copyCode()} aria-label="Kopiuj kod">
              {copied ? <Check /> : <Copy />}
            </button>
            <button type="button" className="icon-button" onClick={() => void shareRoom()} aria-label="Udostępnij pokój">
              <Share2 />
            </button>
          </section>

          {state.role === "host" && snapshot.phase === "lobby" ? (
            <section className="multiplayer-settings">
              <div className="section-heading"><div><span>WYZWANIE</span><h2>Ustawienia hosta</h2></div><Crown /></div>
              <div className="duel-select-grid">
                <label>
                  Rodzina
                  <select
                    value={settings.familyId}
                    onChange={(event) => onUpdateSettings({
                      ...settings,
                      familyId: event.target.value as MultiplayerSettings["familyId"],
                      levelIndex: 0,
                    })}
                  >
                    {puzzleFamilies.map((family) => <option key={family.id} value={family.id}>{family.shortName}</option>)}
                  </select>
                </label>
                <label>
                  Poziom
                  <select value={settings.levelIndex} onChange={(event) => onUpdateSettings({ ...settings, levelIndex: Number(event.target.value) })}>
                    {levels.map((level, index) => <option key={level.id} value={index}>{level.displayNumber}. {level.name}</option>)}
                  </select>
                </label>
                <label>
                  Wariant
                  <select value={settings.targetIndex} onChange={(event) => onUpdateSettings({ ...settings, targetIndex: Number(event.target.value) })}>
                    {[0, 1, 2].map((index) => <option key={index} value={index}>{index + 1}</option>)}
                  </select>
                </label>
                <label>
                  Stopień
                  <select value={settings.socialGrade} onChange={(event) => onUpdateSettings({ ...settings, socialGrade: event.target.value as MultiplayerSettings["socialGrade"] })}>
                    {SOCIAL_GRADES.map((grade) => <option key={grade} value={grade}>{grade} · {TIME_LIMITS[grade]} s</option>)}
                  </select>
                </label>
              </div>
            </section>
          ) : (
            <section className="room-challenge-summary">
              <span>WSPÓLNE WYZWANIE</span>
              <strong>{puzzleFamilies.find((family) => family.id === settings.familyId)?.shortName} · poziom {levels[settings.levelIndex]?.displayNumber} · wariant {settings.targetIndex + 1}</strong>
              <small>Stopień {settings.socialGrade} · {TIME_LIMITS[settings.socialGrade]} sekund</small>
            </section>
          )}

          <section className="room-participants">
            <div className="section-heading">
              <div><span>ZAWODNICY</span><h2>{snapshot.participants.filter((entry) => entry.connected).length}/8 online</h2></div>
              <Users />
            </div>
            <div>
              {(snapshot.phase === "finished" ? ranking : snapshot.participants).map((participant, index) => (
                <article key={participant.id} className={!participant.connected ? "offline" : ""}>
                  {snapshot.phase === "finished" ? <b>{index + 1}</b> : <i className={participant.ready ? "ready" : ""} />}
                  <PlayerAvatar avatarId={participant.id === state.localParticipantId ? profile.avatarId : "bolt"} />
                  <div>
                    <strong>{participant.nickname}{participant.id === snapshot.hostParticipantId ? " · host" : ""}</strong>
                    <small>{resultLabel(snapshot, participant.id)}</small>
                  </div>
                  {participant.result?.success ? <Check /> : null}
                </article>
              ))}
            </div>
          </section>

          {snapshot.phase === "lobby" ? (
            <div className="room-lobby-actions">
              <button type="button" className={localParticipant?.ready ? "ready" : ""} onClick={() => onReady(!localParticipant?.ready)}>
                <Check />
                {localParticipant?.ready ? "Gotowy" : "Zgłoś gotowość"}
              </button>
              {state.role === "host" ? (
                <button type="button" className="screen-primary-action" disabled={!canStartMultiplayer(snapshot)} onClick={onStartRound}>
                  <Play />
                  Start dla wszystkich
                </button>
              ) : (
                <p className="screen-note">Host uruchomi wspólne odliczanie, gdy wszyscy będą gotowi.</p>
              )}
            </div>
          ) : null}

          {snapshot.phase === "finished" ? (
            <div className="room-finished-actions">
              {state.role === "host" ? (
                <button type="button" className="screen-primary-action" onClick={onResetLobby}><RefreshCcw /> Nowa runda</button>
              ) : <p className="screen-note">Oczekiwanie na kolejną rundę hosta.</p>}
            </div>
          ) : null}

          <button type="button" className="room-leave-button" onClick={leaveRoom}><LogOut /> Opuść pokój</button>
        </>
      )}

      {formError || state.error ? <p className="multiplayer-error" role="alert">{formError || state.error}</p> : null}
    </main>
  );
}
