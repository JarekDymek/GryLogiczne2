import type { MatchRoundResult } from "./types";

export function compareDuelRounds(
  first: MatchRoundResult,
  second: MatchRoundResult,
): string | null {
  if (first.success !== second.success) {
    return first.success ? first.profileId : second.profileId;
  }
  if (first.points !== second.points) {
    return first.points > second.points ? first.profileId : second.profileId;
  }
  if (first.elapsedSeconds !== second.elapsedSeconds) {
    return first.elapsedSeconds < second.elapsedSeconds ? first.profileId : second.profileId;
  }
  if (first.moves !== second.moves) {
    return first.moves < second.moves ? first.profileId : second.profileId;
  }
  if (first.resets !== second.resets) {
    return first.resets < second.resets ? first.profileId : second.profileId;
  }
  return null;
}

export function leaguePoints(
  firstProfileId: string,
  secondProfileId: string,
  winnerProfileId: string | null,
): Record<string, number> {
  if (!winnerProfileId) {
    return { [firstProfileId]: 1, [secondProfileId]: 1 };
  }
  return {
    [firstProfileId]: winnerProfileId === firstProfileId ? 3 : 0,
    [secondProfileId]: winnerProfileId === secondProfileId ? 3 : 0,
  };
}
