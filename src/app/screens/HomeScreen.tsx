import {
  Download,
  Gamepad2,
  Medal,
  Play,
  Settings,
  Shirt,
  Swords,
  Trophy,
  Users,
  Wifi,
} from "lucide-react";
import { ACHIEVEMENTS } from "../achievements";
import type { PlayerProfile } from "../types";
import { MowLogo, PlayerAvatar } from "../components/Brand";

interface HomeScreenProps {
  profile: PlayerProfile;
  onPlay: () => void;
  onDuel: () => void;
  onMultiplayer: () => void;
  onTeams: () => void;
  onRanking: () => void;
  onProfile: () => void;
  onEducator: () => void;
  onInstall?: () => void;
}

export function HomeScreen({
  profile,
  onPlay,
  onDuel,
  onMultiplayer,
  onTeams,
  onRanking,
  onProfile,
  onEducator,
  onInstall,
}: HomeScreenProps) {
  const lastAchievement = [...profile.achievementIds]
    .reverse()
    .map((id) => ACHIEVEMENTS.find((achievement) => achievement.id === id))
    .find(Boolean);

  return (
    <main className="home-screen">
      <header className="home-header">
        <div className="brand-lockup">
          <MowLogo />
          <div>
            <span>MOW MALBORK</span>
            <h1>Gry logiczne</h1>
          </div>
        </div>
        <button type="button" className="icon-button ghost" onClick={onEducator} aria-label="Panel wychowawcy">
          <Settings />
        </button>
      </header>

      <section className="player-banner">
        <PlayerAvatar avatarId={profile.avatarId} />
        <div className="player-banner-copy">
          <span>AKTYWNY ZAWODNIK</span>
          <strong>{profile.nickname}</strong>
          <small>{profile.groupName}</small>
        </div>
        <div className="player-level">
          <span>POZIOM</span>
          <strong>{profile.experienceLevel}</strong>
        </div>
      </section>

      <section className="home-score-strip" aria-label="Statystyki zawodnika">
        <div>
          <Trophy />
          <span>Punkty</span>
          <strong>{profile.totalPoints.toLocaleString("pl-PL")}</strong>
        </div>
        <div>
          <Medal />
          <span>Zwycięstwa</span>
          <strong>{profile.wins}</strong>
        </div>
        <div>
          <Swords />
          <span>Seria</span>
          <strong>{profile.winStreak}</strong>
        </div>
      </section>

      <button type="button" className="primary-play-button" onClick={onPlay}>
        <Play />
        <span>
          <strong>Graj</strong>
          <small>Wybierz poziom i rozpocznij próbę</small>
        </span>
      </button>

      <nav className="home-actions" aria-label="Tryby gry">
        <button type="button" className="online-action" onClick={onMultiplayer}>
          <Wifi />
          <span>Gra online</span>
        </button>
        <button type="button" onClick={onDuel}>
          <Swords />
          <span>Pojedynek</span>
        </button>
        <button type="button" onClick={onTeams}>
          <Users />
          <span>Drużyny</span>
        </button>
        <button type="button" onClick={onRanking}>
          <Trophy />
          <span>Ranking</span>
        </button>
        <button type="button" onClick={onProfile}>
          <Shirt />
          <span>Profil i skórki</span>
        </button>
      </nav>

      <section className="achievement-highlight">
        <div className="achievement-icon">
          {lastAchievement ? <Medal /> : <Gamepad2 />}
        </div>
        <div>
          <span>OSTATNIE OSIĄGNIĘCIE</span>
          <strong>{lastAchievement?.name ?? "Pierwszy krok czeka"}</strong>
          <small>{lastAchievement?.description ?? "Rozwiąż pierwszą planszę."}</small>
        </div>
      </section>

      {onInstall ? (
        <button type="button" className="install-home-button" onClick={onInstall}>
          <Download />
          Zainstaluj aplikację
        </button>
      ) : null}
    </main>
  );
}
