import { ArrowLeft, Clock3, Medal, Target, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { buildRanking, type RankingPeriod } from "../rankings";
import type { AttemptResult, PlayerProfile } from "../types";
import { PlayerAvatar } from "../components/Brand";

interface RankingScreenProps {
  profiles: PlayerProfile[];
  attempts: AttemptResult[];
  activeProfileId: string;
  onBack: () => void;
}

export function RankingScreen({
  profiles,
  attempts,
  activeProfileId,
  onBack,
}: RankingScreenProps) {
  const [period, setPeriod] = useState<RankingPeriod>("week");
  const ranking = useMemo(
    () => buildRanking(profiles, attempts, period),
    [attempts, period, profiles],
  );

  return (
    <main className="screen-shell ranking-screen">
      <header className="screen-header">
        <button type="button" className="icon-button" onClick={onBack} aria-label="Wróć">
          <ArrowLeft />
        </button>
        <div>
          <span>LOKALNA RYWALIZACJA</span>
          <h1>Ranking zawodników</h1>
        </div>
      </header>

      <div className="segmented-control ranking-period">
        <button type="button" className={period === "week" ? "active" : ""} onClick={() => setPeriod("week")}>
          Tydzień
        </button>
        <button type="button" className={period === "month" ? "active" : ""} onClick={() => setPeriod("month")}>
          Miesiąc
        </button>
        <button type="button" className={period === "all" ? "active" : ""} onClick={() => setPeriod("all")}>
          Ogólny
        </button>
      </div>

      <section className="podium">
        {ranking.slice(0, 3).map((entry, index) => (
          <div key={entry.profile.id} className={`podium-place place-${index + 1}`}>
            <span>{index === 0 ? <Trophy /> : <Medal />}</span>
            <PlayerAvatar avatarId={entry.profile.avatarId} />
            <strong>{entry.profile.nickname}</strong>
            <small>{entry.points.toLocaleString("pl-PL")} pkt</small>
          </div>
        ))}
      </section>

      <section className="ranking-list">
        {ranking.map((entry, index) => (
          <article
            key={entry.profile.id}
            className={entry.profile.id === activeProfileId ? "active-player" : ""}
          >
            <span className="rank-number">{index + 1}</span>
            <PlayerAvatar avatarId={entry.profile.avatarId} />
            <div>
              <strong>{entry.profile.nickname}</strong>
              <small>{entry.profile.groupName}</small>
            </div>
            <span title="Zwycięstwa"><Trophy /> {entry.wins}</span>
            <span title="Nowe warianty"><Target /> {entry.newVariants}</span>
            <span title="Najlepszy czas">
              <Clock3 /> {Number.isFinite(entry.bestTime) ? `${entry.bestTime}s` : "—"}
            </span>
            <strong>{entry.points.toLocaleString("pl-PL")}</strong>
          </article>
        ))}
      </section>
    </main>
  );
}
