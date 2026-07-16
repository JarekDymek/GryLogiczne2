import { ArrowRight, Award, Home, RefreshCcw, Sparkles, Trophy } from "lucide-react";
import type { CSSProperties } from "react";
import type { AchievementDefinition } from "../achievements";
import type { PieceSkin } from "../skins";
import type { GameRoundResult, ScoreBreakdown } from "../types";

interface ResultScreenProps {
  result: GameRoundResult;
  score: ScoreBreakdown;
  totalPoints: number;
  bestTime?: number | null;
  personalBest: boolean;
  unlockedAchievements: AchievementDefinition[];
  unlockedSkins: PieceSkin[];
  nextLevelUnlocked: boolean;
  onNext: () => void;
  onRematch: () => void;
  onMenu: () => void;
}

export function ResultScreen({
  result,
  score,
  totalPoints,
  bestTime,
  personalBest,
  unlockedAchievements,
  unlockedSkins,
  nextLevelUnlocked,
  onNext,
  onRematch,
  onMenu,
}: ResultScreenProps) {
  return (
    <main className={`result-screen ${result.success ? "success" : "failure"}`}>
      {result.success ? (
        <div className="result-confetti" aria-hidden="true">
          {Array.from({ length: 28 }, (_, index) => (
            <span key={index} style={{ "--confetti": index } as CSSProperties} />
          ))}
        </div>
      ) : null}

      <section className="result-hero">
        <div className="result-emblem">
          {result.success ? <Trophy /> : <RefreshCcw />}
        </div>
        <span>{result.success ? "PRÓBA UKOŃCZONA" : "CZAS MINĄŁ"}</span>
        <h1>{result.success ? "ZALICZONE" : "Spróbuj ponownie"}</h1>
        <p>
          {result.success
            ? `${result.elapsedSeconds} s · ${result.moves} ruchów · ${result.resets} resetów`
            : bestTime
              ? `Najlepszy czas: ${bestTime} s. Układ pozostaje do zdobycia.`
              : "Układ pozostaje do zdobycia. Wynik próby został zapisany."}
        </p>
      </section>

      <section className="score-counter">
        <span>PUNKTY ZA PRÓBĘ</span>
        <strong>+{score.total.toLocaleString("pl-PL")}</strong>
        <small>Łącznie {totalPoints.toLocaleString("pl-PL")}</small>
      </section>

      {result.success ? (
        <section className="score-breakdown">
          <div><span>Baza</span><strong>{score.base}</strong></div>
          <div><span>Czas</span><strong>+{score.timeBonus}</strong></div>
          <div><span>Ruchy</span><strong>+{score.moveBonus}</strong></div>
          <div><span>Seria</span><strong>+{score.streakBonus}</strong></div>
        </section>
      ) : null}

      <div className="result-rewards">
        {personalBest ? (
          <div className="reward-banner">
            <Sparkles />
            <span><strong>Nowy rekord osobisty</strong><small>Lepszy czas został zapisany.</small></span>
          </div>
        ) : null}
        {nextLevelUnlocked ? (
          <div className="reward-banner">
            <ArrowRight />
            <span><strong>Nowy poziom odblokowany</strong><small>Możesz przejść do kolejnego wyzwania.</small></span>
          </div>
        ) : null}
        {unlockedAchievements.map((achievement) => (
          <div className="reward-banner gold" key={achievement.id}>
            <Award />
            <span><strong>{achievement.name}</strong><small>{achievement.description}</small></span>
          </div>
        ))}
        {unlockedSkins.map((skin) => (
          <div className="reward-banner skin-reward" key={skin.id}>
            <Sparkles />
            <span><strong>Skórka: {skin.name}</strong><small>{skin.unlockLabel}</small></span>
          </div>
        ))}
      </div>

      <nav className="result-actions">
        {result.success ? (
          <button type="button" className="primary" onClick={onNext}>
            <ArrowRight />
            Dalej
          </button>
        ) : null}
        <button type="button" onClick={onRematch}>
          <RefreshCcw />
          Rewanż
        </button>
        <button type="button" onClick={onMenu}>
          <Home />
          Menu
        </button>
      </nav>
    </main>
  );
}
