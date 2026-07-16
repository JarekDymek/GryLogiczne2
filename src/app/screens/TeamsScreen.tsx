import { ArrowLeft, Swords, Trophy, UserRoundCheck, Users } from "lucide-react";
import { buildTeamRanking } from "../rankings";
import type { AttemptResult, MatchResult, PlayerProfile, Team } from "../types";

interface TeamsScreenProps {
  teams: Team[];
  profiles: PlayerProfile[];
  attempts: AttemptResult[];
  matches: MatchResult[];
  onBack: () => void;
}

export function TeamsScreen({
  teams,
  profiles,
  attempts,
  matches,
  onBack,
}: TeamsScreenProps) {
  const ranking = buildTeamRanking(teams, profiles, attempts, matches);

  return (
    <main className="screen-shell teams-screen">
      <header className="screen-header">
        <button type="button" className="icon-button" onClick={onBack} aria-label="Wróć">
          <ArrowLeft />
        </button>
        <div>
          <span>RYWALIZACJA DRUŻYNOWA</span>
          <h1>Liga grup</h1>
        </div>
      </header>

      {ranking.length > 0 ? (
        <>
          <section className="team-leader">
            <Trophy />
            <div>
              <span>LIDER TYGODNIA</span>
              <strong>{ranking[0].team.name}</strong>
              <small>{ranking[0].score.toLocaleString("pl-PL")} punktów rankingowych</small>
            </div>
          </section>
          <section className="team-ranking-list">
            {ranking.map((entry, index) => (
              <article key={entry.team.id}>
                <span className="team-rank">{index + 1}</span>
                <i style={{ background: entry.team.color }} />
                <div>
                  <strong>{entry.team.name}</strong>
                  <small>{entry.activePlayers} aktywnych zawodników</small>
                </div>
                <span><Users /> {entry.totalPoints.toLocaleString("pl-PL")}</span>
                <span><UserRoundCheck /> śr. {entry.averagePoints}</span>
                <span><Swords /> {entry.duelWins}</span>
                <strong>{entry.score}</strong>
              </article>
            ))}
          </section>
        </>
      ) : (
        <section className="empty-state">
          <Users />
          <h2>Brak drużyn</h2>
          <p>Wychowawca może utworzyć grupy i przypisać zawodników w panelu administracyjnym.</p>
        </section>
      )}

      <section className="future-formats">
        <span>PRZYGOTOWANE FORMATY</span>
        <div>
          <strong>Sztafeta logiczna</strong>
          <strong>Liga grup</strong>
          <strong>Turniej pucharowy</strong>
          <strong>Bitwa tygodnia</strong>
        </div>
        <small>Ta wersja działa lokalnie na jednym urządzeniu, bez synchronizacji sieciowej.</small>
      </section>
    </main>
  );
}
