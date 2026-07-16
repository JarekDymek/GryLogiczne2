import { TIME_LIMITS, type SocialGrade } from "../games/t-puzzle/progress";
import type { ScoreBreakdown } from "./types";

export const BASE_POINTS: Record<SocialGrade, number> = {
  "0": 100,
  "+1": 150,
  "+2": 225,
  "+3": 350,
  Dyrektor: 600,
};

export interface ScoreInput {
  grade: SocialGrade;
  success: boolean;
  remainingSeconds: number;
  moves: number;
  resets: number;
  firstSolution: boolean;
  personalBest: boolean;
  completedLevel: boolean;
  currentStreak: number;
  harderGrade: boolean;
  duel: boolean;
  dailyChallenge?: boolean;
}

export function experienceLevel(totalPoints: number): number {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(0, totalPoints) / 450)) + 1);
}

export function calculateScore(input: ScoreInput): ScoreBreakdown {
  if (!input.success) {
    return {
      base: 0,
      timeBonus: 0,
      moveBonus: 0,
      noResetBonus: 0,
      firstSolutionBonus: 0,
      personalBestBonus: 0,
      levelCompleteBonus: 0,
      streakBonus: 0,
      repeatMultiplier: 0,
      total: 0,
    };
  }

  const limit = TIME_LIMITS[input.grade];
  const base = BASE_POINTS[input.grade];
  const timeBonus = Math.min(limit, Math.max(0, input.remainingSeconds)) * 4;
  const moveBonus = Math.max(0, 110 - Math.max(0, input.moves) * 3);
  const noResetBonus = input.resets === 0 ? 75 : 0;
  const firstSolutionBonus = input.firstSolution ? 125 : 0;
  const personalBestBonus = input.personalBest ? 90 : 0;
  const levelCompleteBonus = input.completedLevel ? 175 : 0;
  const streakBonus = Math.min(250, Math.max(0, input.currentStreak) * 25);
  const fullReward =
    input.firstSolution ||
    input.personalBest ||
    input.harderGrade ||
    input.duel ||
    input.dailyChallenge === true;
  const repeatMultiplier = fullReward ? 1 : 0.2;
  const total = Math.max(
    0,
    Math.round(
      (base +
        timeBonus +
        moveBonus +
        noResetBonus +
        firstSolutionBonus +
        personalBestBonus +
        levelCompleteBonus +
        streakBonus) *
        repeatMultiplier,
    ),
  );

  return {
    base,
    timeBonus,
    moveBonus,
    noResetBonus,
    firstSolutionBonus,
    personalBestBonus,
    levelCompleteBonus,
    streakBonus,
    repeatMultiplier,
    total,
  };
}
