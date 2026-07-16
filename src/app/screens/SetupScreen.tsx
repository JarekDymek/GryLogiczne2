import { ArrowLeft, Check, Lock, Play, Timer } from "lucide-react";
import { getTPuzzleLevels } from "../../games/t-puzzle/levels";
import { puzzleFamilies } from "../../games/t-puzzle/pieces";
import {
  SOCIAL_GRADES,
  TIME_LIMITS,
  type SocialGrade,
} from "../../games/t-puzzle/progress";
import type { PuzzleFamilyId } from "../../games/t-puzzle/types";
import type { GameSession, PlayerProfile } from "../types";

interface SetupScreenProps {
  profile: PlayerProfile;
  session: GameSession;
  onChange: (session: GameSession) => void;
  onStart: () => void;
  onBack: () => void;
}

function targetAsset(path?: string): string | undefined {
  return path ? `${import.meta.env.BASE_URL}${path}` : undefined;
}

function highestUnlockedLevel(profile: PlayerProfile, familyId: PuzzleFamilyId): number {
  const levels = getTPuzzleLevels(familyId);
  let highest = 0;
  for (let index = 0; index < levels.length - 1; index += 1) {
    const solved = levels[index].targets.some((target) =>
      profile.completedTargets.includes(`${levels[index].id}:${target.id}`),
    );
    if (!solved) {
      break;
    }
    highest = index + 1;
  }
  return highest;
}

export function SetupScreen({
  profile,
  session,
  onChange,
  onStart,
  onBack,
}: SetupScreenProps) {
  const levels = getTPuzzleLevels(session.familyId);
  const unlocked = highestUnlockedLevel(profile, session.familyId);
  const level = levels[Math.min(session.levelIndex, unlocked)];
  const target = level.targets[session.targetIndex];

  function selectFamily(familyId: PuzzleFamilyId) {
    onChange({ ...session, familyId, levelIndex: 0, targetIndex: 0 });
  }

  return (
    <main className="screen-shell setup-screen">
      <header className="screen-header">
        <button type="button" className="icon-button" onClick={onBack} aria-label="Wróć">
          <ArrowLeft />
        </button>
        <div>
          <span>PRZYGOTOWANIE PRÓBY</span>
          <h1>{profile.nickname}</h1>
        </div>
      </header>

      <section className="setup-band">
        <h2>Rodzina układanki</h2>
        <div className="segmented-control">
          {puzzleFamilies.map((family) => (
            <button
              key={family.id}
              type="button"
              className={family.id === session.familyId ? "active" : ""}
              onClick={() => selectFamily(family.id)}
            >
              {family.shortName}
            </button>
          ))}
        </div>
      </section>

      <section className="setup-band">
        <div className="section-heading">
          <div>
            <span>POZIOM</span>
            <h2>{level.displayNumber}. {level.name}</h2>
          </div>
          <small>{unlocked + 1}/{levels.length} odblokowanych</small>
        </div>
        <div className="level-rail">
          {levels.map((entry, index) => {
            const available = index <= unlocked;
            const solved = entry.targets.filter((item) =>
              profile.completedTargets.includes(`${entry.id}:${item.id}`),
            ).length;
            return (
              <button
                key={entry.id}
                type="button"
                disabled={!available}
                className={[
                  index === session.levelIndex ? "active" : "",
                  solved === 3 ? "completed" : solved > 0 ? "partial" : "",
                ].filter(Boolean).join(" ")}
                onClick={() =>
                  onChange({ ...session, levelIndex: index, targetIndex: 0 })
                }
                aria-label={
                  available
                    ? `Poziom ${entry.displayNumber}, zaliczone ${solved} z 3`
                    : `Poziom ${entry.displayNumber}, zablokowany`
                }
              >
                {available ? entry.displayNumber : <Lock />}
                <small>{available ? `${solved}/3` : ""}</small>
              </button>
            );
          })}
        </div>
      </section>

      <section className="setup-band variant-section">
        <div className="target-showcase">
          <span>CEL</span>
          {target.previewImagePath ? (
            <img src={targetAsset(target.previewImagePath)} alt={`Jednolita figura: ${target.name}`} />
          ) : (
            <div className="target-placeholder">{target.displayNumber}</div>
          )}
          <strong>{target.name}</strong>
        </div>
        <div className="variant-picker">
          <span>WARIANT</span>
          {level.targets.map((entry, index) => {
            const complete = profile.completedTargets.includes(`${level.id}:${entry.id}`);
            return (
              <button
                key={entry.id}
                type="button"
                className={index === session.targetIndex ? "active" : ""}
                onClick={() => onChange({ ...session, targetIndex: index })}
              >
                {index + 1}
                {complete ? <Check /> : null}
              </button>
            );
          })}
        </div>
      </section>

      <section className="setup-band">
        <div className="section-heading">
          <div>
            <span>STOPIEŃ USPOŁECZNIENIA</span>
            <h2>Wybierz limit czasu</h2>
          </div>
          <Timer />
        </div>
        <div className="grade-grid">
          {SOCIAL_GRADES.map((grade: SocialGrade) => (
            <button
              key={grade}
              type="button"
              className={grade === session.socialGrade ? "active" : ""}
              onClick={() => onChange({ ...session, socialGrade: grade })}
            >
              <strong>{grade}</strong>
              <span>{TIME_LIMITS[grade]} s</span>
            </button>
          ))}
        </div>
      </section>

      <button type="button" className="screen-primary-action" onClick={onStart}>
        <Play />
        <span>
          <strong>Start próby</strong>
          <small>{target.name} · {TIME_LIMITS[session.socialGrade]} sekund</small>
        </span>
      </button>
    </main>
  );
}
