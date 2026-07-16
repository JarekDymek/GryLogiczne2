import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, newlyUnlockedAchievements } from "./achievements";
import { compareDuelRounds, leaguePoints } from "./duels";
import { buildRanking, buildTeamRanking } from "./rankings";
import { BASE_POINTS, calculateScore, experienceLevel } from "./scoring";
import { unlockedSkinIds } from "./skins";
import {
  APP_SCHEMA_VERSION,
  createPlayerProfile,
  exportAppData,
  hashPin,
  importAppData,
  normalizeAppData,
} from "./storage";
import type {
  AppData,
  AttemptResult,
  MatchResult,
  MatchRoundResult,
  PlayerProfile,
  Team,
} from "./types";

function profile(id: string, nickname: string, points = 0): PlayerProfile {
  return {
    ...createPlayerProfile(nickname, "Grupa VI"),
    id,
    totalPoints: points,
    experienceLevel: experienceLevel(points),
  };
}

function attempt(
  id: string,
  profileId: string,
  overrides: Partial<AttemptResult> = {},
): AttemptResult {
  return {
    id,
    profileId,
    targetKey: "gardner:1:1",
    familyId: "gardner",
    levelIndex: 0,
    targetIndex: 0,
    grade: "0",
    success: true,
    elapsedSeconds: 30,
    remainingSeconds: 45,
    moves: 8,
    resets: 0,
    points: 300,
    newVariant: true,
    personalBest: true,
    completedAt: "2026-07-15T12:00:00.000Z",
    ...overrides,
  };
}

describe("game systems", () => {
  it("uses the required base points for every social grade", () => {
    expect(BASE_POINTS).toEqual({
      "0": 100,
      "+1": 150,
      "+2": 225,
      "+3": 350,
      Dyrektor: 600,
    });
  });

  it("awards time and move bonuses without producing negative points", () => {
    const strong = calculateScore({
      grade: "+2",
      success: true,
      remainingSeconds: 30,
      moves: 7,
      resets: 0,
      firstSolution: true,
      personalBest: true,
      completedLevel: false,
      currentStreak: 2,
      harderGrade: true,
      duel: false,
    });
    const weak = calculateScore({
      grade: "+2",
      success: true,
      remainingSeconds: -20,
      moves: 999,
      resets: 4,
      firstSolution: false,
      personalBest: false,
      completedLevel: false,
      currentStreak: 0,
      harderGrade: false,
      duel: false,
    });

    expect(strong.timeBonus).toBe(120);
    expect(strong.moveBonus).toBe(89);
    expect(strong.total).toBeGreaterThan(BASE_POINTS["+2"]);
    expect(weak.timeBonus).toBe(0);
    expect(weak.moveBonus).toBe(0);
    expect(weak.total).toBeGreaterThanOrEqual(0);
  });

  it("limits farming repeated easy boards", () => {
    const repeat = calculateScore({
      grade: "0",
      success: true,
      remainingSeconds: 50,
      moves: 5,
      resets: 0,
      firstSolution: false,
      personalBest: false,
      completedLevel: false,
      currentStreak: 1,
      harderGrade: false,
      duel: false,
    });
    const improved = calculateScore({
      grade: "0",
      success: true,
      remainingSeconds: 50,
      moves: 5,
      resets: 0,
      firstSolution: false,
      personalBest: true,
      completedLevel: false,
      currentStreak: 1,
      harderGrade: false,
      duel: false,
    });

    expect(repeat.repeatMultiplier).toBe(0.2);
    expect(improved.repeatMultiplier).toBe(1);
    expect(improved.total).toBeGreaterThan(repeat.total);
  });

  it("unlocks achievements from attempt history", () => {
    const player = {
      ...profile("p1", "Atlas"),
      winStreak: 5,
      unlockedSkinIds: ["classic", "neon", "fire", "ice", "mow"],
    };
    const attempts = [
      attempt("a1", player.id, { remainingSeconds: 4, grade: "+3" }),
      attempt("a2", player.id),
      attempt("a3", player.id),
      attempt("a4", player.id),
      attempt("a5", player.id),
    ];
    const unlocked = newlyUnlockedAchievements({ profile: player, attempts, matches: [] });
    const ids = new Set(unlocked.map((achievement) => achievement.id));

    expect(ACHIEVEMENTS).toHaveLength(10);
    expect(ids).toContain("first-step");
    expect(ids).toContain("no-panic");
    expect(ids).toContain("winning-streak");
    expect(ids).toContain("collector");
  });

  it("unlocks skins centrally and preserves the active choice", () => {
    const player = {
      ...profile("p1", "Atlas", 1800),
      winStreak: 5,
      activeSkinId: "neon",
    };
    const attempts = Array.from({ length: 10 }, (_, index) =>
      attempt(`a${index}`, player.id, {
        grade: index === 0 ? "Dyrektor" : "+3",
        resets: 0,
      }),
    );
    const ids = unlockedSkinIds({
      profile: player,
      attempts,
      matches: [],
      weeklyRank: 1,
      fullLevels: 5,
    });

    expect(ids).toEqual(
      expect.arrayContaining([
        "classic",
        "neon",
        "fire",
        "ice",
        "gold",
        "director",
        "mow",
        "group-master",
        "night",
      ]),
    );
    expect(player.activeSkinId).toBe("neon");
  });

  it("does not award the weekly champion skin for a failed first attempt", () => {
    const player = profile("p1", "Atlas");
    const failedAttempt = attempt("a1", player.id, {
      success: false,
      points: 0,
    });

    const ids = unlockedSkinIds({
      profile: player,
      attempts: [failedAttempt],
      matches: [],
      weeklyRank: 1,
    });

    expect(ids).not.toContain("group-master");
  });

  it("builds dated weekly and monthly rankings with deterministic ties", () => {
    const profiles = [profile("p1", "Atlas"), profile("p2", "Bizon")];
    const attempts = [
      attempt("a1", "p1", { points: 500, completedAt: "2026-07-14T10:00:00.000Z" }),
      attempt("a2", "p2", {
        points: 500,
        elapsedSeconds: 20,
        completedAt: "2026-07-14T11:00:00.000Z",
      }),
      attempt("old", "p2", { points: 9999, completedAt: "2026-06-01T10:00:00.000Z" }),
    ];
    const weekly = buildRanking(profiles, attempts, "week", new Date("2026-07-16T12:00:00.000Z"));
    const monthly = buildRanking(profiles, attempts, "month", new Date("2026-07-16T12:00:00.000Z"));

    expect(weekly[0].profile.id).toBe("p2");
    expect(monthly[0].points).toBe(500);
  });

  it("resolves duels in the required order and assigns league points", () => {
    const first: MatchRoundResult = {
      profileId: "p1",
      success: true,
      points: 500,
      elapsedSeconds: 25,
      moves: 10,
      resets: 0,
    };
    const second = { ...first, profileId: "p2", elapsedSeconds: 28 };
    const winner = compareDuelRounds(first, second);

    expect(winner).toBe("p1");
    expect(leaguePoints("p1", "p2", winner)).toEqual({ p1: 3, p2: 0 });
    expect(leaguePoints("p1", "p2", null)).toEqual({ p1: 1, p2: 1 });
  });

  it("balances team ranking by active-player average", () => {
    const profiles = [profile("p1", "A"), profile("p2", "B"), profile("p3", "C")];
    const teams: Team[] = [
      {
        id: "t1",
        name: "Grupa VI",
        color: "#2563eb",
        memberProfileIds: ["p1", "p2"],
        createdAt: "2026-07-01T00:00:00.000Z",
      },
      {
        id: "t2",
        name: "Grupa VII",
        color: "#16a34a",
        memberProfileIds: ["p3"],
        createdAt: "2026-07-01T00:00:00.000Z",
      },
    ];
    const attempts = [
      attempt("a1", "p1", { points: 300 }),
      attempt("a2", "p2", { points: 300 }),
      attempt("a3", "p3", { points: 500 }),
    ];
    const ranking = buildTeamRanking(
      teams,
      profiles,
      attempts,
      [],
      new Date("2026-07-16T12:00:00.000Z"),
    );

    expect(ranking[0].team.id).toBe("t2");
    expect(ranking.find((entry) => entry.team.id === "t1")?.averagePoints).toBe(300);
  });

  it("migrates malformed storage and round-trips exports", () => {
    const migrated = normalizeAppData({
      schemaVersion: 1,
      profiles: [{ id: "p1", nickname: "Atlas", totalPoints: 900 }],
      activeProfileId: "missing",
      settings: { allowCustomTextures: false },
    });
    const imported = importAppData(exportAppData(migrated));

    expect(migrated.schemaVersion).toBe(APP_SCHEMA_VERSION);
    expect(migrated.activeProfileId).toBe("p1");
    expect(migrated.profiles[0].experienceLevel).toBe(experienceLevel(900));
    expect(imported.settings.allowCustomTextures).toBe(false);
    expect(hashPin("1234")).toBe(hashPin("1234"));
    expect(hashPin("1234")).not.toBe(hashPin("4321"));
  });

  it("keeps match history in exported application data", () => {
    const first = profile("p1", "Atlas");
    const second = profile("p2", "Bizon");
    const match: MatchResult = {
      id: "m1",
      playerAId: first.id,
      playerBId: second.id,
      winnerProfileId: first.id,
      leaguePoints: { p1: 3, p2: 0 },
      targetKey: "gardner:1:1",
      grade: "+1",
      rounds: [
        {
          profileId: first.id,
          success: true,
          points: 500,
          elapsedSeconds: 20,
          moves: 9,
          resets: 0,
        },
        {
          profileId: second.id,
          success: true,
          points: 430,
          elapsedSeconds: 25,
          moves: 10,
          resets: 0,
        },
      ],
      completedAt: "2026-07-15T12:00:00.000Z",
    };
    const data: AppData = {
      ...normalizeAppData({ profiles: [first, second], activeProfileId: first.id }),
      matches: [match],
    };

    expect(importAppData(exportAppData(data)).matches[0].winnerProfileId).toBe(first.id);
  });
});
