import { Play, Shield, Swords, Trophy } from "lucide-react";
import type { MatchResult, PlayerProfile } from "../types";
import { PlayerAvatar } from "../components/Brand";

export function HandoffScreen({
  nextPlayer,
  onReady,
  onCancel,
}: {
  nextPlayer: PlayerProfile;
  onReady: () => void;
  onCancel: () => void;
}) {
  return (
    <main className="handoff-screen">
      <Shield />
      <span>PRZEKAŻ URZĄDZENIE</span>
      <h1>Wynik pierwszej rundy jest ukryty</h1>
      <PlayerAvatar avatarId={nextPlayer.avatarId} />
      <strong>{nextPlayer.nickname}</strong>
      <p>Gdy zawodnik B jest gotowy i nie widzi poprzedniej planszy, rozpocznij identyczną próbę.</p>
      <button type="button" className="screen-primary-action" onClick={onReady}>
        <Play />
        Gotowy · start rundy B
      </button>
      <button type="button" className="text-button" onClick={onCancel}>Anuluj pojedynek</button>
    </main>
  );
}

export function DuelResultScreen({
  match,
  profiles,
  onRematch,
  onMenu,
}: {
  match: MatchResult;
  profiles: PlayerProfile[];
  onRematch: () => void;
  onMenu: () => void;
}) {
  const first = profiles.find((profile) => profile.id === match.playerAId);
  const second = profiles.find((profile) => profile.id === match.playerBId);
  const winner = profiles.find((profile) => profile.id === match.winnerProfileId);

  return (
    <main className="duel-result-screen">
      <Trophy />
      <span>WYNIK POJEDYNKU</span>
      <h1>{winner ? `Wygrywa ${winner.nickname}` : "Remis"}</h1>
      <section>
        {match.rounds.map((round, index) => {
          const profile = index === 0 ? first : second;
          return (
            <article key={round.profileId} className={round.profileId === match.winnerProfileId ? "winner" : ""}>
              {profile ? <PlayerAvatar avatarId={profile.avatarId} /> : null}
              <strong>{profile?.nickname ?? "Zawodnik"}</strong>
              <span>{round.success ? "Zaliczone" : "Nieukończone"}</span>
              <b>{round.points} pkt</b>
              <small>{round.elapsedSeconds}s · {round.moves} ruchów · {round.resets} resetów</small>
              <em>{match.leaguePoints[round.profileId]} pkt ligowe</em>
            </article>
          );
        })}
        <Swords />
      </section>
      <div className="duel-result-actions">
        <button type="button" className="primary" onClick={onRematch}><Swords /> Rewanż</button>
        <button type="button" onClick={onMenu}>Menu</button>
      </div>
    </main>
  );
}
