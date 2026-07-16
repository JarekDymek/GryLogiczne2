import type { AttemptResult, MatchResult, PlayerProfile, Team } from "./types";

export type RankingPeriod = "week" | "month" | "all";

export interface RankingEntry {
  profile: PlayerProfile;
  points: number;
  wins: number;
  newVariants: number;
  bestTime: number;
  reachedAt: string;
}

export interface TeamRankingEntry {
  team: Team;
  totalPoints: number;
  activePlayers: number;
  averagePoints: number;
  newVariants: number;
  duelWins: number;
  score: number;
}

function periodStart(period: RankingPeriod, now: Date): number {
  if (period === "all") {
    return Number.NEGATIVE_INFINITY;
  }
  const start = new Date(now);
  if (period === "week") {
    const day = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - day);
  } else {
    start.setDate(1);
  }
  start.setHours(0, 0, 0, 0);
  return start.getTime();
}

export function attemptsForPeriod(
  attempts: AttemptResult[],
  period: RankingPeriod,
  now = new Date(),
): AttemptResult[] {
  const start = periodStart(period, now);
  return attempts.filter((attempt) => new Date(attempt.completedAt).getTime() >= start);
}

export function buildRanking(
  profiles: PlayerProfile[],
  attempts: AttemptResult[],
  period: RankingPeriod,
  now = new Date(),
): RankingEntry[] {
  const periodAttempts = attemptsForPeriod(attempts, period, now);
  return profiles
    .map((profile) => {
      const playerAttempts = periodAttempts.filter(
        (attempt) => attempt.profileId === profile.id,
      );
      const successful = playerAttempts.filter((attempt) => attempt.success);
      const firstTimestamp = playerAttempts
        .map((attempt) => attempt.completedAt)
        .sort()[0] ?? profile.createdAt;
      return {
        profile,
        points: playerAttempts.reduce((sum, attempt) => sum + attempt.points, 0),
        wins: successful.length,
        newVariants: successful.filter((attempt) => attempt.newVariant).length,
        bestTime: successful.length
          ? Math.min(...successful.map((attempt) => attempt.elapsedSeconds))
          : Number.POSITIVE_INFINITY,
        reachedAt: firstTimestamp,
      };
    })
    .sort(
      (first, second) =>
        second.points - first.points ||
        second.wins - first.wins ||
        second.newVariants - first.newVariants ||
        first.bestTime - second.bestTime ||
        first.reachedAt.localeCompare(second.reachedAt) ||
        first.profile.nickname.localeCompare(second.profile.nickname, "pl"),
    );
}

export function buildTeamRanking(
  teams: Team[],
  profiles: PlayerProfile[],
  attempts: AttemptResult[],
  matches: MatchResult[],
  now = new Date(),
): TeamRankingEntry[] {
  const weeklyAttempts = attemptsForPeriod(attempts, "week", now);
  return teams
    .map((team) => {
      const members = new Set(team.memberProfileIds);
      const teamAttempts = weeklyAttempts.filter((attempt) => members.has(attempt.profileId));
      const activePlayers = new Set(teamAttempts.map((attempt) => attempt.profileId)).size;
      const totalPoints = teamAttempts.reduce((sum, attempt) => sum + attempt.points, 0);
      const averagePoints = activePlayers > 0 ? totalPoints / activePlayers : 0;
      const newVariants = teamAttempts.filter(
        (attempt) => attempt.success && attempt.newVariant,
      ).length;
      const duelWins = matches.filter(
        (match) =>
          match.winnerProfileId !== null &&
          members.has(match.winnerProfileId) &&
          new Date(match.completedAt).getTime() >= periodStart("week", now),
      ).length;
      const score = Math.round(averagePoints + newVariants * 75 + duelWins * 120);
      return {
        team,
        totalPoints,
        activePlayers,
        averagePoints: Math.round(averagePoints),
        newVariants,
        duelWins,
        score,
      };
    })
    .sort(
      (first, second) =>
        second.score - first.score ||
        second.averagePoints - first.averagePoints ||
        second.totalPoints - first.totalPoints ||
        first.team.name.localeCompare(second.team.name, "pl"),
    );
}

export function profileTeam(profileId: string, teams: Team[]): Team | undefined {
  return teams.find((team) => team.memberProfileIds.includes(profileId));
}

export function visibleProfiles(profiles: PlayerProfile[]): PlayerProfile[] {
  return profiles.filter((profile) => profile.nickname.trim().length > 0);
}
