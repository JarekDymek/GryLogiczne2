import type { AttemptResult, MatchResult, PlayerProfile } from "./types";

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  rewardPoints: number;
  icon: string;
  isUnlocked: (context: AchievementContext) => boolean;
}

export interface AchievementContext {
  profile: PlayerProfile;
  attempts: AttemptResult[];
  matches: MatchResult[];
}

function successful(context: AchievementContext): AttemptResult[] {
  return context.attempts.filter(
    (attempt) => attempt.profileId === context.profile.id && attempt.success,
  );
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: "first-step",
    name: "Pierwszy krok",
    description: "Rozwiąż pierwszą planszę.",
    rewardPoints: 100,
    icon: "spark",
    isUnlocked: (context) => successful(context).length >= 1,
  },
  {
    id: "perfectionist",
    name: "Perfekcjonista",
    description: "Ukończ trzy warianty jednego poziomu.",
    rewardPoints: 200,
    icon: "target",
    isUnlocked: (context) => {
      const counts = new Map<string, Set<number>>();
      for (const attempt of successful(context)) {
        const key = `${attempt.familyId}:${attempt.levelIndex}`;
        const variants = counts.get(key) ?? new Set<number>();
        variants.add(attempt.targetIndex);
        counts.set(key, variants);
      }
      return Array.from(counts.values()).some((variants) => variants.size >= 3);
    },
  },
  {
    id: "no-panic",
    name: "Bez paniki",
    description: "Zalicz planszę w ostatnich pięciu sekundach.",
    rewardPoints: 150,
    icon: "timer",
    isUnlocked: (context) =>
      successful(context).some((attempt) => attempt.remainingSeconds <= 5),
  },
  {
    id: "no-reset",
    name: "Bez resetu",
    description: "Zalicz pięć prób bez resetowania.",
    rewardPoints: 180,
    icon: "shield",
    isUnlocked: (context) =>
      successful(context).filter((attempt) => attempt.resets === 0).length >= 5,
  },
  {
    id: "quick-mind",
    name: "Szybki umysł",
    description: "Ukończ planszę na stopniu +3.",
    rewardPoints: 250,
    icon: "bolt",
    isUnlocked: (context) => successful(context).some((attempt) => attempt.grade === "+3"),
  },
  {
    id: "director",
    name: "Dyrektor",
    description: "Ukończ planszę w trybie Dyrektor.",
    rewardPoints: 500,
    icon: "crown",
    isUnlocked: (context) =>
      successful(context).some((attempt) => attempt.grade === "Dyrektor"),
  },
  {
    id: "winning-streak",
    name: "Seria zwycięstw",
    description: "Wygraj pięć prób z rzędu.",
    rewardPoints: 250,
    icon: "flame",
    isUnlocked: (context) => context.profile.winStreak >= 5,
  },
  {
    id: "collector",
    name: "Kolekcjoner",
    description: "Odblokuj pięć skórek.",
    rewardPoints: 200,
    icon: "layers",
    isUnlocked: (context) => context.profile.unlockedSkinIds.length >= 5,
  },
  {
    id: "group-master",
    name: "Mistrz grupy",
    description: "Wygraj pięć pojedynków.",
    rewardPoints: 350,
    icon: "trophy",
    isUnlocked: (context) =>
      context.matches.filter((match) => match.winnerProfileId === context.profile.id).length >= 5,
  },
  {
    id: "board-conqueror",
    name: "Pogromca plansz",
    description: "Rozwiąż 25 różnych wariantów.",
    rewardPoints: 400,
    icon: "medal",
    isUnlocked: (context) => context.profile.completedTargets.length >= 25,
  },
];

export function newlyUnlockedAchievements(context: AchievementContext): AchievementDefinition[] {
  const owned = new Set(context.profile.achievementIds);
  return ACHIEVEMENTS.filter(
    (achievement) => !owned.has(achievement.id) && achievement.isUnlocked(context),
  );
}
