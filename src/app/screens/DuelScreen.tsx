import { ArrowLeft, Play, Shuffle, Swords } from "lucide-react";
import { getTPuzzleLevels } from "../../games/t-puzzle/levels";
import { puzzleFamilies } from "../../games/t-puzzle/pieces";
import { SOCIAL_GRADES, TIME_LIMITS } from "../../games/t-puzzle/progress";
import type { DuelSetup, PlayerProfile } from "../types";
import { PlayerAvatar } from "../components/Brand";

interface DuelScreenProps {
  profiles: PlayerProfile[];
  setup: DuelSetup;
  onChange: (setup: DuelSetup) => void;
  onStart: () => void;
  onBack: () => void;
}

export function DuelScreen({
  profiles,
  setup,
  onChange,
  onStart,
  onBack,
}: DuelScreenProps) {
  const levels = getTPuzzleLevels(setup.familyId);
  const canStart = setup.playerAId !== setup.playerBId && profiles.length >= 2;

  function randomize() {
    const family = puzzleFamilies[Math.floor(Math.random() * puzzleFamilies.length)];
    const levelIndex = Math.floor(Math.random() * Math.min(12, getTPuzzleLevels(family.id).length));
    const targetIndex = Math.floor(Math.random() * 3);
    onChange({ ...setup, familyId: family.id, levelIndex, targetIndex });
  }

  return (
    <main className="screen-shell duel-screen">
      <header className="screen-header">
        <button type="button" className="icon-button" onClick={onBack} aria-label="Wróć">
          <ArrowLeft />
        </button>
        <div>
          <span>POJEDYNEK 1 NA 1</span>
          <h1>Jedno urządzenie, te same zasady</h1>
        </div>
      </header>

      <section className="duel-players">
        <label>
          ZAWODNIK A
          <select value={setup.playerAId} onChange={(event) => onChange({ ...setup, playerAId: event.target.value })}>
            {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.nickname}</option>)}
          </select>
          {profiles.find((profile) => profile.id === setup.playerAId) ? (
            <PlayerAvatar avatarId={profiles.find((profile) => profile.id === setup.playerAId)!.avatarId} />
          ) : null}
        </label>
        <Swords className="duel-versus" />
        <label>
          ZAWODNIK B
          <select value={setup.playerBId} onChange={(event) => onChange({ ...setup, playerBId: event.target.value })}>
            {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.nickname}</option>)}
          </select>
          {profiles.find((profile) => profile.id === setup.playerBId) ? (
            <PlayerAvatar avatarId={profiles.find((profile) => profile.id === setup.playerBId)!.avatarId} />
          ) : null}
        </label>
      </section>

      <section className="duel-settings">
        <div className="section-heading">
          <div><span>IDENTYCZNE WYZWANIE</span><h2>Plansza pojedynku</h2></div>
          <button type="button" className="icon-button" onClick={randomize} aria-label="Wylosuj planszę"><Shuffle /></button>
        </div>
        <div className="duel-select-grid">
          <label>
            Rodzina
            <select
              value={setup.familyId}
              onChange={(event) =>
                onChange({
                  ...setup,
                  familyId: event.target.value as DuelSetup["familyId"],
                  levelIndex: 0,
                })
              }
            >
              {puzzleFamilies.map((family) => <option key={family.id} value={family.id}>{family.shortName}</option>)}
            </select>
          </label>
          <label>
            Poziom
            <select value={setup.levelIndex} onChange={(event) => onChange({ ...setup, levelIndex: Number(event.target.value) })}>
              {levels.slice(0, 12).map((level, index) => <option key={level.id} value={index}>{level.displayNumber}. {level.name}</option>)}
            </select>
          </label>
          <label>
            Wariant
            <select value={setup.targetIndex} onChange={(event) => onChange({ ...setup, targetIndex: Number(event.target.value) })}>
              {[0, 1, 2].map((index) => <option key={index} value={index}>{index + 1}</option>)}
            </select>
          </label>
          <label>
            Stopień
            <select value={setup.socialGrade} onChange={(event) => onChange({ ...setup, socialGrade: event.target.value as DuelSetup["socialGrade"] })}>
              {SOCIAL_GRADES.map((grade) => <option key={grade} value={grade}>{grade} · {TIME_LIMITS[grade]} s</option>)}
            </select>
          </label>
        </div>
      </section>

      <div className="duel-rules">
        <strong>Porównanie:</strong>
        <span>zaliczenie → punkty → czas → ruchy → resety</span>
        <small>Zwycięstwo 3 pkt ligowe · remis 1 pkt · porażka 0 pkt</small>
      </div>

      <button type="button" className="screen-primary-action" disabled={!canStart} onClick={onStart}>
        <Play />
        <span><strong>Rozpocznij pojedynek</strong><small>Najpierw gra zawodnik A</small></span>
      </button>
      {!canStart ? <p className="screen-note">Utwórz co najmniej dwa profile i wybierz różnych zawodników.</p> : null}
    </main>
  );
}
