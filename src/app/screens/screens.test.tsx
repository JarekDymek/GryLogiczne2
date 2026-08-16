import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { PlayerProfile, ScoreBreakdown } from "../types";
import { DuelResultScreen, HandoffScreen } from "./DuelFlowScreens";
import { HomeScreen } from "./HomeScreen";
import { ResultScreen } from "./ResultScreen";
import { MentorsScreen } from "./MentorsScreen";
import { OwnerSignIn } from "./OwnerCatalogScreen";
import { SetupScreen } from "./SetupScreen";
import { DEFAULT_MENTORS, defaultMentorSettings } from "../mentors/catalog";
import { normalizeAppData } from "../storage";
import { getTPuzzleLevels } from "../../games/t-puzzle/levels";
import type { PuzzleFamilyId } from "../../games/t-puzzle/types";

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
  activeMentorId: "mentor-fokus",
  mentorMode: "fixed",
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
  hintPenalty: 0,
  repeatMultiplier: 1,
  total: 265,
};

const noop = () => undefined;

function completedFamilyTargets(familyId: PuzzleFamilyId): string[] {
  return getTPuzzleLevels(familyId).map(
    (level) => `${level.id}:${level.targets[0].id}`,
  );
}

const completedBystryProfile: PlayerProfile = {
  ...profile,
  completedTargets: completedFamilyTargets("gardner"),
};

const completedNobProfile: PlayerProfile = {
  ...completedBystryProfile,
  completedTargets: [
    ...completedBystryProfile.completedTargets,
    ...completedFamilyTargets("nob"),
  ],
};

describe("game screens", () => {
  it("renders the complete home navigation and MOW branding", () => {
    const html = renderToStaticMarkup(
      <HomeScreen
        profile={profile}
        onPlay={noop}
        onDuel={noop}
        onMultiplayer={noop}
        onTeams={noop}
        onRanking={noop}
        onProfile={noop}
        onEducator={noop}
        onHelp={noop}
        onInstall={noop}
      />,
    );

    expect(html).toContain("MOW MALBORK");
    expect(html).toContain("Logo Młodzieżowego Ośrodka Wychowawczego");
    expect(html).toContain("Graj");
    expect(html).toContain("Pojedynek");
    expect(html).toContain("Gra online");
    expect(html).toContain("Drużyny");
    expect(html).toContain("Ranking");
    expect(html).not.toContain("Katalog wszystkich figur");
    expect(html).toContain("Profil i skórki");
    expect(html).toContain("Zainstaluj aplikację");
    expect(html).toContain("Panel właściciela");
    expect(html).toContain("Pomoc");
  });

  it("offers owner login without opening the email link in an external browser", () => {
    const html = renderToStaticMarkup(
      <OwnerSignIn state={{ status: "signed-out" }} onRefresh={noop} />,
    );

    expect(html).toContain("Edge nie otwiera linku?");
    expect(html).toContain("Kopiuj adres linku");
    expect(html).toContain("Zaloguj w tej aplikacji");
    expect(html).toContain('type="password"');
  });

  it.each([
    ["gardner", profile],
    ["nob", completedBystryProfile],
    ["asymmetric", completedNobProfile],
  ] as const)(
    "renders T, 2, 3 consistently in the %s setup",
    (familyId, setupProfile) => {
      const html = renderToStaticMarkup(
        <SetupScreen
          profile={setupProfile}
          session={{
            familyId,
            levelIndex: 0,
            targetIndex: 0,
            socialGrade: "0",
            mode: "solo",
            profileId: profile.id,
          }}
          onChange={noop}
          onStart={noop}
          onBack={noop}
        />,
      );

      expect(html).toContain("Litera T");
      expect(html).not.toContain("Wariant 1");
      expect(html).toContain('aria-label="Figura T: Litera T"');
      expect(html).toContain('aria-label="Figura 2:');
      expect(html).toContain('aria-label="Figura 3:');
    },
  );

  it("pokazuje rodziny kolejno jako Bystry, Nob i Asymetryczne", () => {
    const initialHtml = renderToStaticMarkup(
      <SetupScreen
        profile={{ ...profile, completedTargets: [] }}
        session={{ familyId: "gardner", levelIndex: 0, targetIndex: 0, socialGrade: "0", mode: "solo", profileId: profile.id }}
        onChange={noop}
        onStart={noop}
        onBack={noop}
      />,
    );
    const afterBystryHtml = renderToStaticMarkup(
      <SetupScreen
        profile={completedBystryProfile}
        session={{ familyId: "nob", levelIndex: 0, targetIndex: 0, socialGrade: "0", mode: "solo", profileId: profile.id }}
        onChange={noop}
        onStart={noop}
        onBack={noop}
      />,
    );
    const afterNobHtml = renderToStaticMarkup(
      <SetupScreen
        profile={completedNobProfile}
        session={{ familyId: "asymmetric", levelIndex: 0, targetIndex: 0, socialGrade: "0", mode: "solo", profileId: profile.id }}
        onChange={noop}
        onStart={noop}
        onBack={noop}
      />,
    );

    expect(initialHtml).toContain(">Bystry</button>");
    expect(initialHtml).not.toContain(">Nob</button>");
    expect(initialHtml).not.toContain(">Asymetryczne</button>");
    expect(afterBystryHtml).toContain(">Nob</button>");
    expect(afterBystryHtml).not.toContain(">Asymetryczne</button>");
    expect(afterNobHtml).toContain(">Asymetryczne</button>");
  });

  it.each(["nob", "asymmetric"] as const)(
    "renders a fitted SVG preview and Gardner-based name for every first-level %s figure",
    (familyId) => {
      const setupProfile = familyId === "nob" ? completedBystryProfile : completedNobProfile;
      for (const [targetIndex, expectedName] of ["Litera T", "Grube T", "Pochylone T"].entries()) {
        const html = renderToStaticMarkup(
          <SetupScreen
            profile={setupProfile}
            session={{ familyId, levelIndex: 0, targetIndex, socialGrade: "0", mode: "solo", profileId: profile.id }}
            onChange={noop}
            onStart={noop}
            onBack={noop}
          />,
        );

        expect(html).toContain(`aria-label="Jednolita figura: ${expectedName}"`);
        expect(html.match(/<polygon[^>]+fill="#14213d"/g)).toHaveLength(4);
        expect(html).not.toContain("target-placeholder");
      }
    },
  );

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
        mentorPresentation={{
          event: "personal-record",
          mentor: DEFAULT_MENTORS[0],
          reaction: DEFAULT_MENTORS[0].reactions.find((entry) => entry.category === "record")!,
        }}
        onNext={noop}
        onRematch={noop}
        onMenu={noop}
      />,
    );

    expect(html).toContain("ZALICZONE");
    expect(html).toContain("Nowy rekord osobisty");
    expect(html).toContain("Nowy poziom odblokowany");
    expect(html).toContain("Kapitan Fokus");
    expect(html).toContain("Nowy rekord");
    expect(html).toContain("Dalej");
    expect(html).toContain("Rewanż");
    expect(html).toContain("Menu");
  });

  it("renders a player-safe mentor library without management actions", () => {
    const data = {
      ...normalizeAppData({ profiles: [profile], activeProfileId: profile.id }),
      mentors: DEFAULT_MENTORS,
      mentorSettings: defaultMentorSettings(),
    };
    const html = renderToStaticMarkup(
      <MentorsScreen
        data={data}
        activeProfile={profile}
        route={{ view: "library" }}
        managerAccess="player"
        onBack={noop}
        onNavigate={noop}
        onReplaceData={noop}
        onUpdateProfile={noop}
      />,
    );

    expect(html).toContain("Mentorzy i reakcje");
    expect(html).toContain("Kapitan Fokus");
    expect(html).not.toContain("Dodaj postać");
    expect(html).not.toContain("ZARZĄDZANIE");
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
