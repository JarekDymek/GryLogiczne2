import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { PlayerProfile, ScoreBreakdown } from "../types";
import { DuelResultScreen, HandoffScreen } from "./DuelFlowScreens";
import { HomeScreen } from "./HomeScreen";
import { ResultScreen } from "./ResultScreen";

const profile: PlayerProfile = {
  id: "player-1",
  nickname: "Atlas",
  playerNumber: "12",
  groupName: "Grupa VI",
  avatarId: "bolt",
  totalPoints: 1250,
  experienceLevel: 4,
  winStreak: 3,
  wins: 8,
  completedAttempts: 11,
  completedTargets: ["gardner-stage-01:gardner-figure-001"],
  bestGrade: "+2",
  achievementIds: ["first-step"],
  unlockedSkinIds: ["classic", "neon"],
  skinUnlockedAt: {
    classic: "2026-07-01T10:00:00.000Z",
    neon: "2026-07-16T10:00:00.000Z",
  },
  activeSkinId: "neon",
  featuredAchievementIds: ["first-step"],
  createdAt: "2026-07-01T10:00:00.000Z",
  updatedAt: "2026-07-16T10:00:00.000Z",
};

const score: ScoreBreakdown = {
  base: 100,
  timeBonus: 30,
  moveBonus: 20,
  noResetBonus: 25,
  firstSolutionBonus: 75,
  personalBestBonus: 0,
  levelCompleteBonus: 0,
  streakBonus: 15,
  repeatMultiplier: 1,
  total: 265,
};

const noop = () => undefined;

describe("game screens", () => {
  it("renders the complete home navigation and MOW branding", () => {
    const html = renderToStaticMarkup(
      <HomeScreen
        profile={profile}
        onPlay={noop}
        onDuel={noop}
        onTeams={noop}
        onRanking={noop}
        onProfile={noop}
        onEducator={noop}
        onInstall={noop}
      />,
    );

    expect(html).toContain("MOW MALBORK");
    expect(html).toContain("Logo Młodzieżowego Ośrodka Wychowawczego");
    expect(html).toContain("Graj");
    expect(html).toContain("Pojedynek");
    expect(html).toContain("Drużyny");
    expect(html).toContain("Ranking");
    expect(html).toContain("Profil i skórki");
    expect(html).toContain("Zainstaluj aplikację");
  });

  it("renders success rewards and all result actions", () => {
    const html = renderToStaticMarkup(
      <ResultScreen
        result={{
          success: true,
          targetKey: "gardner-stage-01:gardner-figure-001",
          familyId: "gardner",
          levelIndex: 0,
          targetIndex: 0,
          grade: "0",
          elapsedSeconds: 32,
          remainingSeconds: 43,
          moves: 9,
          resets: 0,
        }}
        score={score}
        totalPoints={1515}
        personalBest
        unlockedAchievements={[]}
        unlockedSkins={[]}
        nextLevelUnlocked
        onNext={noop}
        onRematch={noop}
        onMenu={noop}
      />,
    );

    expect(html).toContain("ZALICZONE");
    expect(html).toContain("Nowy rekord osobisty");
    expect(html).toContain("Nowy poziom odblokowany");
    expect(html).toContain("Dalej");
    expect(html).toContain("Rewanż");
    expect(html).toContain("Menu");
  });

  it("renders a respectful timeout state without a false next action", () => {
    const html = renderToStaticMarkup(
      <ResultScreen
        result={{
          success: false,
          targetKey: "gardner-stage-01:gardner-figure-001",
          familyId: "gardner",
          levelIndex: 0,
          targetIndex: 0,
          grade: "0",
          elapsedSeconds: 75,
          remainingSeconds: 0,
          moves: 12,
          resets: 1,
        }}
        score={{ ...score, total: 0 }}
        totalPoints={profile.totalPoints}
        personalBest={false}
        unlockedAchievements={[]}
        unlockedSkins={[]}
        nextLevelUnlocked={false}
        onNext={noop}
        onRematch={noop}
        onMenu={noop}
      />,
    );

    expect(html).toContain("Spróbuj ponownie");
    expect(html).toContain("Układ pozostaje do zdobycia");
    expect(html).not.toContain(">Dalej<");
  });

  it("hides the first duel result on the device handoff screen", () => {
    const handoff = renderToStaticMarkup(
      <HandoffScreen nextPlayer={profile} onReady={noop} onCancel={noop} />,
    );
    const result = renderToStaticMarkup(
      <DuelResultScreen
        match={{
          id: "match-1",
          playerAId: profile.id,
          playerBId: "player-2",
          winnerProfileId: profile.id,
          leaguePoints: { [profile.id]: 3, "player-2": 0 },
          targetKey: "gardner-stage-01:gardner-figure-001",
          grade: "0",
          rounds: [
            {
              profileId: profile.id,
              success: true,
              points: 265,
              elapsedSeconds: 32,
              moves: 9,
              resets: 0,
            },
            {
              profileId: "player-2",
              success: false,
              points: 0,
              elapsedSeconds: 75,
              moves: 12,
              resets: 1,
            },
          ],
          completedAt: "2026-07-16T10:00:00.000Z",
        }}
        profiles={[profile, { ...profile, id: "player-2", nickname: "Bizon" }]}
        onRematch={noop}
        onMenu={noop}
      />,
    );

    expect(handoff).toContain("PRZEKAŻ URZĄDZENIE");
    expect(handoff).not.toContain("265");
    expect(result).toContain("Atlas");
    expect(result).toContain("Bizon");
  });
});
