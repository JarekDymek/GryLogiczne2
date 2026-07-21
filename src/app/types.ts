import type { SocialGrade } from "../games/t-puzzle/progress";
import type { PuzzleFamilyId } from "../games/t-puzzle/types";
import type { Mentor, MentorSelectionMode, MentorSettings } from "./mentors/types";

export type AppView =
  | "home"
  | "setup"
  | "game"
  | "result"
  | "profile"
  | "ranking"
  | "duel"
  | "multiplayer"
  | "handoff"
  | "teams"
  | "educator"
  | "mentors";

export type AvatarId = "bolt" | "target" | "brain" | "shield" | "flame" | "crown";

export interface PlayerProfile {
  id: string;
  nickname: string;
  playerNumber?: string;
  groupName: string;
  avatarId: AvatarId;
  totalPoints: number;
  experienceLevel: number;
  winStreak: number;
  wins: number;
  completedAttempts: number;
  completedTargets: string[];
  bestGrade: SocialGrade;
  achievementIds: string[];
  unlockedSkinIds: string[];
  skinUnlockedAt: Record<string, string>;
  activeSkinId: string;
  featuredAchievementIds: string[];
  activeMentorId: string;
  mentorMode: MentorSelectionMode;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  memberProfileIds: string[];
  createdAt: string;
}

export interface AttemptResult {
  id: string;
  profileId: string;
  targetKey: string;
  familyId: PuzzleFamilyId;
  levelIndex: number;
  targetIndex: number;
  grade: SocialGrade;
  success: boolean;
  elapsedSeconds: number;
  remainingSeconds: number;
  moves: number;
  resets: number;
  points: number;
  newVariant: boolean;
  personalBest: boolean;
  duelId?: string;
  completedAt: string;
}

export interface MatchRoundResult {
  profileId: string;
  success: boolean;
  points: number;
  elapsedSeconds: number;
  moves: number;
  resets: number;
}

export interface MatchResult {
  id: string;
  playerAId: string;
  playerBId: string;
  winnerProfileId: string | null;
  leaguePoints: Record<string, number>;
  targetKey: string;
  grade: SocialGrade;
  rounds: [MatchRoundResult, MatchRoundResult];
  completedAt: string;
}

export interface AppSettings {
  educatorPinHash: string | null;
  allowCustomTextures: boolean;
  reducedEffects: boolean;
  soundEnabled: boolean;
}

export interface AppData {
  schemaVersion: number;
  profiles: PlayerProfile[];
  activeProfileId: string | null;
  teams: Team[];
  matches: MatchResult[];
  attempts: AttemptResult[];
  mentors: Mentor[];
  mentorSettings: MentorSettings;
  settings: AppSettings;
}

export interface GameSession {
  familyId: PuzzleFamilyId;
  levelIndex: number;
  targetIndex: number;
  socialGrade: SocialGrade;
  mode: "solo" | "duel" | "multiplayer";
  profileId: string;
  duelId?: string;
  multiplayerRoundId?: string;
}

export interface GameRoundResult {
  success: boolean;
  targetKey: string;
  familyId: PuzzleFamilyId;
  levelIndex: number;
  targetIndex: number;
  grade: SocialGrade;
  elapsedSeconds: number;
  remainingSeconds: number;
  moves: number;
  resets: number;
}

export interface ScoreBreakdown {
  base: number;
  timeBonus: number;
  moveBonus: number;
  noResetBonus: number;
  firstSolutionBonus: number;
  personalBestBonus: number;
  levelCompleteBonus: number;
  streakBonus: number;
  repeatMultiplier: number;
  total: number;
}

export interface DuelSetup {
  playerAId: string;
  playerBId: string;
  familyId: PuzzleFamilyId;
  levelIndex: number;
  targetIndex: number;
  socialGrade: SocialGrade;
}

export interface DuelState {
  id: string;
  setup: DuelSetup;
  playerAResult: AttemptResult | null;
  playerBResult: AttemptResult | null;
}
