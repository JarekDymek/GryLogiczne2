import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { newlyUnlockedAchievements, type AchievementDefinition } from "./app/achievements";
import { compareDuelRounds, leaguePoints } from "./app/duels";
import { buildRanking } from "./app/rankings";
import { calculateScore, experienceLevel } from "./app/scoring";
import { PIECE_SKINS, unlockedSkinIds, type PieceSkin } from "./app/skins";
import {
  createId,
  createPlayerProfile,
  defaultAppData,
  loadAppData,
  saveAppData,
} from "./app/storage";
import type {
  AppData,
  AppView,
  AttemptResult,
  DuelSetup,
  DuelState,
  GameRoundResult,
  GameSession,
  MatchResult,
  MatchRoundResult,
  PlayerProfile,
  ScoreBreakdown,
  Team,
} from "./app/types";
import { loadCustomTexture } from "./app/customTexture";
import {
  createRuntimeParticipantId,
  type MultiplayerSettings,
} from "./app/multiplayer/multiplayer";
import { usePeerRoom } from "./app/multiplayer/usePeerRoom";
import { HomeScreen } from "./app/screens/HomeScreen";
import { SetupScreen } from "./app/screens/SetupScreen";
import { getTPuzzleLevels } from "./games/t-puzzle/levels";
import {
  loadStoredProgress,
  TIME_LIMITS,
  type SocialGrade,
} from "./games/t-puzzle/progress";

const TPuzzleGame = lazy(async () => ({
  default: (await import("./games/t-puzzle/components/TPuzzleGame")).TPuzzleGame,
}));
const ProfileScreen = lazy(async () => ({
  default: (await import("./app/screens/ProfileScreen")).ProfileScreen,
}));
const RankingScreen = lazy(async () => ({
  default: (await import("./app/screens/RankingScreen")).RankingScreen,
}));
const DuelScreen = lazy(async () => ({
  default: (await import("./app/screens/DuelScreen")).DuelScreen,
}));
const TeamsScreen = lazy(async () => ({
  default: (await import("./app/screens/TeamsScreen")).TeamsScreen,
}));
const EducatorScreen = lazy(async () => ({
  default: (await import("./app/screens/EducatorScreen")).EducatorScreen,
}));
const ResultScreen = lazy(async () => ({
  default: (await import("./app/screens/ResultScreen")).ResultScreen,
}));
const HandoffScreen = lazy(async () => ({
  default: (await import("./app/screens/DuelFlowScreens")).HandoffScreen,
}));
const DuelResultScreen = lazy(async () => ({
  default: (await import("./app/screens/DuelFlowScreens")).DuelResultScreen,
}));
const MultiplayerScreen = lazy(async () => ({
  default: (await import("./app/screens/MultiplayerScreen")).MultiplayerScreen,
}));

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface ResultViewData {
  result: GameRoundResult;
  score: ScoreBreakdown;
  totalPoints: number;
  bestTime: number | null;
  personalBest: boolean;
  unlockedAchievements: AchievementDefinition[];
  unlockedSkins: PieceSkin[];
  nextLevelUnlocked: boolean;
}

const GRADE_ORDER: SocialGrade[] = ["0", "+1", "+2", "+3", "Dyrektor"];

function LazyScreen({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <main className="screen-loading" aria-live="polite">
          <span />
          <strong>Ładowanie widoku…</strong>
        </main>
      }
    >
      {children}
    </Suspense>
  );
}

function fullLevelCount(profile: PlayerProfile): number {
  return ["gardner", "nob", "asymmetric"].reduce((total, familyId) => {
    const levels = getTPuzzleLevels(familyId as GameSession["familyId"]);
    return (
      total +
      levels.filter((level) =>
        level.targets.every((target) =>
          profile.completedTargets.includes(`${level.id}:${target.id}`),
        ),
      ).length
    );
  }, 0);
}

function bestGrade(first: SocialGrade, second: SocialGrade): SocialGrade {
  return GRADE_ORDER.indexOf(second) > GRADE_ORDER.indexOf(first) ? second : first;
}

function roundForMatch(attempt: AttemptResult): MatchRoundResult {
  return {
    profileId: attempt.profileId,
    success: attempt.success,
    points: attempt.points,
    elapsedSeconds: attempt.elapsedSeconds,
    moves: attempt.moves,
    resets: attempt.resets,
  };
}

export function App() {
  const initialData = useMemo(() => loadAppData(), []);
  const initialProgress = useMemo(() => loadStoredProgress(), []);
  const [data, setData] = useState<AppData>(initialData);
  const [view, setView] = useState<AppView>(() =>
    new URLSearchParams(window.location.search).has("room") ? "multiplayer" : "home",
  );
  const [session, setSession] = useState<GameSession>(() => ({
    familyId: initialProgress.puzzleFamilyId,
    levelIndex: initialProgress.levelIndex,
    targetIndex: initialProgress.targetIndex,
    socialGrade: initialProgress.socialGrade,
    mode: "solo",
    profileId: initialData.activeProfileId ?? initialData.profiles[0].id,
  }));
  const [resultView, setResultView] = useState<ResultViewData | null>(null);
  const [duelSetup, setDuelSetup] = useState<DuelSetup>(() => ({
      playerAId: initialData.profiles[0]?.id ?? "",
      playerBId: initialData.profiles[1]?.id ?? initialData.profiles[0]?.id ?? "",
      familyId: "gardner",
      levelIndex: 0,
      targetIndex: 0,
      socialGrade: "0",
  }));
  const [duelState, setDuelState] = useState<DuelState | null>(null);
  const [lastMatch, setLastMatch] = useState<MatchResult | null>(null);
  const [customTextureUrl, setCustomTextureUrl] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [launchedMultiplayerRoundId, setLaunchedMultiplayerRoundId] = useState<string | null>(null);
  const [synchronizedStartAt, setSynchronizedStartAt] = useState<number | undefined>();
  const multiplayerParticipantId = useRef(createRuntimeParticipantId());
  const multiplayer = usePeerRoom();

  const activeProfile =
    data.profiles.find((profile) => profile.id === data.activeProfileId) ?? data.profiles[0];
  const sessionProfile =
    data.profiles.find((profile) => profile.id === session.profileId) ?? activeProfile;

  useEffect(() => {
    saveAppData(data);
  }, [data]);

  useEffect(() => {
    let active = true;
    void loadCustomTexture(activeProfile.id).then((url) => {
      if (active) {
        setCustomTextureUrl(url);
      } else if (url) {
        URL.revokeObjectURL(url);
      }
    });
    return () => {
      active = false;
    };
  }, [activeProfile.id]);

  useEffect(() => {
    const capture = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const clear = () => setInstallPrompt(null);
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", clear);
    return () => {
      window.removeEventListener("beforeinstallprompt", capture);
      window.removeEventListener("appinstalled", clear);
    };
  }, []);

  function replaceData(next: AppData) {
    setData(next);
    if (!next.profiles.some((profile) => profile.id === next.activeProfileId)) {
      setData({ ...next, activeProfileId: next.profiles[0]?.id ?? null });
    }
  }

  function updateProfile(profile: PlayerProfile) {
    setData((current) => ({
      ...current,
      profiles: current.profiles.map((entry) => (entry.id === profile.id ? profile : entry)),
    }));
  }

  function createProfile() {
    const profile = createPlayerProfile(`Zawodnik ${data.profiles.length + 1}`, "Grupa VI");
    setData((current) => ({
      ...current,
      profiles: [...current.profiles, profile],
      activeProfileId: profile.id,
    }));
    setSession((current) => ({ ...current, profileId: profile.id }));
    setView("profile");
  }

  function deleteProfile(profileId: string) {
    if (data.profiles.length <= 1) {
      window.alert("Na urządzeniu musi pozostać co najmniej jeden profil.");
      return;
    }
    setData((current) => {
      const profiles = current.profiles.filter((profile) => profile.id !== profileId);
      return {
        ...current,
        profiles,
        activeProfileId:
          current.activeProfileId === profileId ? profiles[0].id : current.activeProfileId,
        attempts: current.attempts.filter((attempt) => attempt.profileId !== profileId),
        matches: current.matches.filter(
          (match) => match.playerAId !== profileId && match.playerBId !== profileId,
        ),
        teams: current.teams.map((team) => ({
          ...team,
          memberProfileIds: team.memberProfileIds.filter((id) => id !== profileId),
        })),
      };
    });
  }

  function resetProfile(profileId: string) {
    setData((current) => ({
      ...current,
      profiles: current.profiles.map((profile) =>
        profile.id === profileId
          ? {
              ...createPlayerProfile(profile.nickname, profile.groupName),
              id: profile.id,
              playerNumber: profile.playerNumber,
              avatarId: profile.avatarId,
              createdAt: profile.createdAt,
            }
          : profile,
      ),
      attempts: current.attempts.filter((attempt) => attempt.profileId !== profileId),
      matches: current.matches.filter(
        (match) => match.playerAId !== profileId && match.playerBId !== profileId,
      ),
    }));
  }

  function saveTeam(team: Team) {
    setData((current) => ({
      ...current,
      teams: current.teams.some((entry) => entry.id === team.id)
        ? current.teams.map((entry) => (entry.id === team.id ? team : entry))
        : [...current.teams, team],
    }));
  }

  function recordRound(round: GameRoundResult): {
    nextData: AppData;
    attempt: AttemptResult;
    result: ResultViewData;
  } {
    const profile = data.profiles.find((entry) => entry.id === session.profileId) ?? activeProfile;
    const profileAttempts = data.attempts.filter((attempt) => attempt.profileId === profile.id);
    const previousTargetWins = profileAttempts.filter(
      (attempt) => attempt.targetKey === round.targetKey && attempt.success,
    );
    const firstSolution = round.success && previousTargetWins.length === 0;
    const previousBest =
      previousTargetWins.length > 0
        ? Math.min(...previousTargetWins.map((attempt) => attempt.elapsedSeconds))
        : Number.POSITIVE_INFINITY;
    const personalBest = round.success && round.elapsedSeconds < previousBest;
    const harderGrade =
      round.success &&
      !previousTargetWins.some(
        (attempt) => GRADE_ORDER.indexOf(attempt.grade) >= GRADE_ORDER.indexOf(round.grade),
      );
    const levels = getTPuzzleLevels(round.familyId);
    const completedTargets = new Set(profile.completedTargets);
    if (round.success) {
      completedTargets.add(round.targetKey);
    }
    const completedLevel =
      round.success &&
      levels[round.levelIndex].targets.every((target) =>
        completedTargets.has(`${levels[round.levelIndex].id}:${target.id}`),
      ) &&
      !levels[round.levelIndex].targets.every((target) =>
        profile.completedTargets.includes(`${levels[round.levelIndex].id}:${target.id}`),
      );
    const score = calculateScore({
      grade: round.grade,
      success: round.success,
      remainingSeconds: round.remainingSeconds,
      moves: round.moves,
      resets: round.resets,
      firstSolution,
      personalBest,
      completedLevel,
      currentStreak: round.success ? profile.winStreak + 1 : 0,
      harderGrade,
      duel: session.mode !== "solo",
    });
    const attempt: AttemptResult = {
      id: createId("attempt"),
      profileId: profile.id,
      ...round,
      points: score.total,
      newVariant: firstSolution,
      personalBest,
      duelId: session.duelId,
      completedAt: new Date().toISOString(),
    };
    let updatedProfile: PlayerProfile = {
      ...profile,
      totalPoints: profile.totalPoints + score.total,
      winStreak: round.success ? profile.winStreak + 1 : 0,
      wins: profile.wins + (round.success ? 1 : 0),
      completedAttempts: profile.completedAttempts + 1,
      completedTargets: Array.from(completedTargets),
      bestGrade: round.success ? bestGrade(profile.bestGrade, round.grade) : profile.bestGrade,
      updatedAt: attempt.completedAt,
    };
    const dataWithAttempt: AppData = {
      ...data,
      attempts: [...data.attempts, attempt],
      profiles: data.profiles.map((entry) =>
        entry.id === profile.id ? updatedProfile : entry,
      ),
    };
    const achievementDefs = newlyUnlockedAchievements({
      profile: updatedProfile,
      attempts: dataWithAttempt.attempts,
      matches: dataWithAttempt.matches,
    });
    const achievementReward = achievementDefs.reduce(
      (sum, achievement) => sum + achievement.rewardPoints,
      0,
    );
    updatedProfile = {
      ...updatedProfile,
      totalPoints: updatedProfile.totalPoints + achievementReward,
      achievementIds: [
        ...updatedProfile.achievementIds,
        ...achievementDefs.map((achievement) => achievement.id),
      ],
    };
    const ranking = buildRanking(
      dataWithAttempt.profiles.map((entry) =>
        entry.id === profile.id ? updatedProfile : entry,
      ),
      dataWithAttempt.attempts,
      "week",
    );
    const skinIds = unlockedSkinIds({
      profile: updatedProfile,
      attempts: dataWithAttempt.attempts,
      matches: dataWithAttempt.matches,
      weeklyRank: ranking.findIndex((entry) => entry.profile.id === profile.id) + 1,
      fullLevels: fullLevelCount(updatedProfile),
      hasCustomTexture: updatedProfile.unlockedSkinIds.includes("custom"),
    });
    const newSkinIds = skinIds.filter((id) => !updatedProfile.unlockedSkinIds.includes(id));
    updatedProfile = {
      ...updatedProfile,
      experienceLevel: experienceLevel(updatedProfile.totalPoints),
      unlockedSkinIds: Array.from(
        new Set([...updatedProfile.unlockedSkinIds, ...skinIds]),
      ),
      skinUnlockedAt: {
        ...updatedProfile.skinUnlockedAt,
        ...Object.fromEntries(newSkinIds.map((skinId) => [skinId, attempt.completedAt])),
      },
    };
    const nextData = {
      ...dataWithAttempt,
      profiles: dataWithAttempt.profiles.map((entry) =>
        entry.id === profile.id ? updatedProfile : entry,
      ),
    };
    return {
      nextData,
      attempt,
      result: {
        result: round,
        score,
        totalPoints: updatedProfile.totalPoints,
        bestTime: round.success
          ? Math.min(previousBest, round.elapsedSeconds)
          : Number.isFinite(previousBest)
            ? previousBest
            : null,
        personalBest,
        unlockedAchievements: achievementDefs,
        unlockedSkins: newSkinIds
          .map((id) => PIECE_SKINS.find((skin) => skin.id === id))
          .filter((skin): skin is PieceSkin => Boolean(skin)),
        nextLevelUnlocked: firstSolution && round.levelIndex < levels.length - 1,
      },
    };
  }

  function refreshMatchUnlocks(nextData: AppData): AppData {
    const weeklyRanking = buildRanking(nextData.profiles, nextData.attempts, "week");
    return {
      ...nextData,
      profiles: nextData.profiles.map((profile) => {
        const achievements = newlyUnlockedAchievements({
          profile,
          attempts: nextData.attempts,
          matches: nextData.matches,
        });
        const achievementReward = achievements.reduce(
          (sum, achievement) => sum + achievement.rewardPoints,
          0,
        );
        const rewardedProfile = {
          ...profile,
          totalPoints: profile.totalPoints + achievementReward,
          achievementIds: Array.from(
            new Set([
              ...profile.achievementIds,
              ...achievements.map((achievement) => achievement.id),
            ]),
          ),
        };
        const skins = unlockedSkinIds({
          profile: rewardedProfile,
          attempts: nextData.attempts,
          matches: nextData.matches,
          weeklyRank: weeklyRanking.findIndex(
            (entry) => entry.profile.id === profile.id,
          ) + 1,
          fullLevels: fullLevelCount(rewardedProfile),
          hasCustomTexture: rewardedProfile.unlockedSkinIds.includes("custom"),
        });
        const newSkinIds = skins.filter(
          (skinId) => !rewardedProfile.unlockedSkinIds.includes(skinId),
        );
        return {
          ...rewardedProfile,
          experienceLevel: experienceLevel(rewardedProfile.totalPoints),
          unlockedSkinIds: Array.from(
            new Set([...rewardedProfile.unlockedSkinIds, ...skins]),
          ),
          skinUnlockedAt: {
            ...rewardedProfile.skinUnlockedAt,
            ...Object.fromEntries(
              newSkinIds.map((skinId) => [skinId, new Date().toISOString()]),
            ),
          },
        };
      }),
    };
  }

  function finishGame(round: GameRoundResult) {
    const recorded = recordRound(round);
    if (session.mode === "multiplayer") {
      setData(recorded.nextData);
      multiplayer.submitResult({
        success: round.success,
        elapsedSeconds: round.elapsedSeconds,
        remainingSeconds: round.remainingSeconds,
        moves: round.moves,
        resets: round.resets,
      });
      setView("multiplayer");
      return;
    }

    if (session.mode === "solo") {
      setData(recorded.nextData);
      setResultView(recorded.result);
      setView("result");
      return;
    }

    if (!duelState?.playerAResult) {
      setData(recorded.nextData);
      setDuelState((current) =>
        current ? { ...current, playerAResult: recorded.attempt } : current,
      );
      setView("handoff");
      return;
    }

    const firstRound = roundForMatch(duelState.playerAResult);
    const secondRound = roundForMatch(recorded.attempt);
    const winnerProfileId = compareDuelRounds(firstRound, secondRound);
    const match: MatchResult = {
      id: duelState.id,
      playerAId: duelState.setup.playerAId,
      playerBId: duelState.setup.playerBId,
      winnerProfileId,
      leaguePoints: leaguePoints(
        duelState.setup.playerAId,
        duelState.setup.playerBId,
        winnerProfileId,
      ),
      targetKey: round.targetKey,
      grade: round.grade,
      rounds: [firstRound, secondRound],
      completedAt: new Date().toISOString(),
    };
    const nextData = refreshMatchUnlocks({
      ...recorded.nextData,
      matches: [...recorded.nextData.matches, match],
    });
    setData(nextData);
    setLastMatch(match);
    setView("result");
  }

  function startSolo() {
    setSession((current) => ({
      ...current,
      mode: "solo",
      profileId: activeProfile.id,
      duelId: undefined,
      multiplayerRoundId: undefined,
    }));
    setSynchronizedStartAt(undefined);
    setView("game");
  }

  function startDuel() {
    const id = createId("duel");
    setDuelState({ id, setup: duelSetup, playerAResult: null, playerBResult: null });
    setLastMatch(null);
    setSession({
      familyId: duelSetup.familyId,
      levelIndex: duelSetup.levelIndex,
      targetIndex: duelSetup.targetIndex,
      socialGrade: duelSetup.socialGrade,
      mode: "duel",
      profileId: duelSetup.playerAId,
      duelId: id,
      multiplayerRoundId: undefined,
    });
    setView("game");
  }

  function startSecondDuelRound() {
    if (!duelState) {
      return;
    }
    setSession({
      familyId: duelState.setup.familyId,
      levelIndex: duelState.setup.levelIndex,
      targetIndex: duelState.setup.targetIndex,
      socialGrade: duelState.setup.socialGrade,
      mode: "duel",
      profileId: duelState.setup.playerBId,
      duelId: duelState.id,
      multiplayerRoundId: undefined,
    });
    setView("game");
  }

  function nextChallenge() {
    const levels = getTPuzzleLevels(session.familyId);
    const nextTarget = session.targetIndex < 2 ? session.targetIndex + 1 : 0;
    const nextLevel =
      session.targetIndex < 2
        ? session.levelIndex
        : Math.min(levels.length - 1, session.levelIndex + 1);
    setSession((current) => ({
      ...current,
      levelIndex: nextLevel,
      targetIndex: nextTarget,
    }));
    setView("setup");
  }

  async function installApplication() {
    if (!installPrompt) {
      return;
    }
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  function multiplayerParticipant() {
    return {
      id: multiplayerParticipantId.current,
      nickname: activeProfile.nickname,
    };
  }

  function multiplayerInitialSettings(): MultiplayerSettings {
    return {
      familyId: session.familyId,
      levelIndex: session.levelIndex,
      targetIndex: session.targetIndex,
      socialGrade: session.socialGrade,
    };
  }

  function launchMultiplayerGame(
    settings: MultiplayerSettings,
    startAt: number,
    roundId: string,
  ) {
    setLaunchedMultiplayerRoundId(roundId);
    setSynchronizedStartAt(startAt);
    setSession({
      ...settings,
      mode: "multiplayer",
      profileId: activeProfile.id,
      duelId: undefined,
      multiplayerRoundId: roundId,
    });
    setView("game");
  }

  function leaveMultiplayer() {
    multiplayer.leave();
    setLaunchedMultiplayerRoundId(null);
    setSynchronizedStartAt(undefined);
  }

  function exitGame() {
    if (session.mode === "multiplayer") {
      multiplayer.submitResult({
        success: false,
        elapsedSeconds: TIME_LIMITS[session.socialGrade],
        remainingSeconds: 0,
        moves: 0,
        resets: 0,
      });
      setView("multiplayer");
      return;
    }
    setView(session.mode === "duel" ? "duel" : "home");
  }

  if (view === "game") {
    return (
      <LazyScreen>
        <TPuzzleGame
          key={`${session.mode}-${session.duelId ?? session.multiplayerRoundId ?? "solo"}-${session.profileId}-${session.levelIndex}-${session.targetIndex}-${data.attempts.length}`}
          session={session}
          playerName={sessionProfile.nickname}
          skinId={sessionProfile.activeSkinId}
          customTextureUrl={
            sessionProfile.id === activeProfile.id ? customTextureUrl : null
          }
          reducedEffects={
            data.settings.reducedEffects ||
            window.matchMedia("(prefers-reduced-motion: reduce)").matches
          }
          hapticsEnabled={data.settings.soundEnabled}
          synchronizedStartAt={
            session.mode === "multiplayer" ? synchronizedStartAt : undefined
          }
          onFinish={finishGame}
          onExit={exitGame}
        />
      </LazyScreen>
    );
  }

  if (view === "handoff" && duelState) {
    const nextPlayer =
      data.profiles.find((profile) => profile.id === duelState.setup.playerBId) ??
      activeProfile;
    return (
      <LazyScreen>
        <HandoffScreen
          nextPlayer={nextPlayer}
          onReady={startSecondDuelRound}
          onCancel={() => {
            setDuelState(null);
            setView("home");
          }}
        />
      </LazyScreen>
    );
  }

  if (view === "result" && lastMatch) {
    return (
      <LazyScreen>
        <DuelResultScreen
          match={lastMatch}
          profiles={data.profiles}
          onRematch={() => {
            setLastMatch(null);
            startDuel();
          }}
          onMenu={() => {
            setLastMatch(null);
            setDuelState(null);
            setView("home");
          }}
        />
      </LazyScreen>
    );
  }

  if (view === "result" && resultView) {
    return (
      <LazyScreen>
        <ResultScreen
          {...resultView}
          onNext={nextChallenge}
          onRematch={() => setView("game")}
          onMenu={() => setView("home")}
        />
      </LazyScreen>
    );
  }

  if (view === "setup") {
    return (
      <SetupScreen
        profile={activeProfile}
        session={session}
        onChange={setSession}
        onStart={startSolo}
        onBack={() => setView("home")}
      />
    );
  }

  if (view === "profile") {
    return (
      <LazyScreen>
        <ProfileScreen
          profiles={data.profiles}
          activeProfile={activeProfile}
          allowCustomTextures={data.settings.allowCustomTextures}
          onBack={() => setView("home")}
          onSelectProfile={(profileId) => {
            setData((current) => ({ ...current, activeProfileId: profileId }));
            setSession((current) => ({ ...current, profileId }));
          }}
          onCreateProfile={createProfile}
          onUpdateProfile={updateProfile}
          onTextureChanged={setCustomTextureUrl}
        />
      </LazyScreen>
    );
  }

  if (view === "ranking") {
    return (
      <LazyScreen>
        <RankingScreen
          profiles={data.profiles}
          attempts={data.attempts}
          activeProfileId={activeProfile.id}
          onBack={() => setView("home")}
        />
      </LazyScreen>
    );
  }

  if (view === "duel") {
    return (
      <LazyScreen>
        <DuelScreen
          profiles={data.profiles}
          setup={duelSetup}
          onChange={setDuelSetup}
          onStart={startDuel}
          onBack={() => setView("home")}
        />
      </LazyScreen>
    );
  }

  if (view === "multiplayer") {
    const initialSettings = multiplayerInitialSettings();
    return (
      <LazyScreen>
        <MultiplayerScreen
          profile={activeProfile}
          state={multiplayer.state}
          initialSettings={initialSettings}
          launchedRoundId={launchedMultiplayerRoundId}
          startAtLocal={multiplayer.startAtLocal}
          onCreate={(settings) =>
            multiplayer.createRoom(multiplayerParticipant(), settings)
          }
          onJoin={(code) => multiplayer.joinRoom(code, multiplayerParticipant())}
          onReady={multiplayer.setReady}
          onUpdateSettings={multiplayer.updateSettings}
          onStartRound={multiplayer.startRound}
          onResetLobby={() => {
            setLaunchedMultiplayerRoundId(null);
            multiplayer.resetLobby();
          }}
          onLaunchGame={launchMultiplayerGame}
          onLeave={leaveMultiplayer}
          onBack={() => {
            leaveMultiplayer();
            setView("home");
          }}
        />
      </LazyScreen>
    );
  }

  if (view === "teams") {
    return (
      <LazyScreen>
        <TeamsScreen
          teams={data.teams}
          profiles={data.profiles}
          attempts={data.attempts}
          matches={data.matches}
          onBack={() => setView("home")}
        />
      </LazyScreen>
    );
  }

  if (view === "educator") {
    return (
      <LazyScreen>
        <EducatorScreen
          data={data}
          onBack={() => setView("home")}
          onReplaceData={replaceData}
          onUpdateProfile={updateProfile}
          onCreateProfile={createProfile}
          onDeleteProfile={deleteProfile}
          onResetProfile={resetProfile}
          onSaveTeam={saveTeam}
          onDeleteTeam={(teamId) =>
            setData((current) => ({
              ...current,
              teams: current.teams.filter((team) => team.id !== teamId),
            }))
          }
          onFullReset={() => {
            const fresh = defaultAppData();
            setData(fresh);
            setSession((current) => ({
              ...current,
              profileId: fresh.activeProfileId ?? fresh.profiles[0].id,
            }));
            setView("home");
          }}
        />
      </LazyScreen>
    );
  }

  return (
    <HomeScreen
      profile={activeProfile}
      onPlay={() => setView("setup")}
      onDuel={() => setView("duel")}
      onMultiplayer={() => setView("multiplayer")}
      onTeams={() => setView("teams")}
      onRanking={() => setView("ranking")}
      onProfile={() => setView("profile")}
      onEducator={() => setView("educator")}
      onInstall={installPrompt ? () => void installApplication() : undefined}
    />
  );
}
