export const MENTOR_REACTION_CATEGORIES = [
  "success",
  "record",
  "level-up",
  "motivation",
  "warning",
  "failure",
  "neutral",
  "power",
  "director",
  "team-win",
] as const;

export type MentorReactionCategory = (typeof MENTOR_REACTION_CATEGORIES)[number];

export const MENTOR_MEDIA_TYPES = [
  "sprite",
  "image",
  "animated-webp",
  "webm",
  "mp4",
] as const;

export type MentorMediaType = (typeof MENTOR_MEDIA_TYPES)[number];

export const MENTOR_EVENTS = [
  "round-success",
  "personal-record",
  "level-unlocked",
  "round-failure",
  "director-success",
  "team-win",
] as const;

export type MentorEvent = (typeof MENTOR_EVENTS)[number];

export type MentorSelectionMode = "fixed" | "random";

export interface MentorReaction {
  id: string;
  mentorId: string;
  label: string;
  title: string;
  subtitle: string;
  category: MentorReactionCategory;
  mediaType: MentorMediaType;
  mediaUrl?: string;
  sprite?: {
    row: number;
    column: number;
    rows: number;
    columns: number;
  };
  soundId?: string;
  effectId?: string;
  enabled: boolean;
  weight: number;
}

export interface MentorUnlockRule {
  type: "always" | "wins" | "experience-level";
  value: number;
  label: string;
}

export interface Mentor {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  avatarUrl: string;
  spriteSheetUrl?: string;
  spriteColumns?: number;
  spriteRows?: number;
  enabled: boolean;
  isDefault: boolean;
  allowedForPlayers: boolean;
  source: "built-in" | "custom";
  unlock: MentorUnlockRule;
  reactions: MentorReaction[];
  createdAt: string;
  updatedAt: string;
}

export interface MentorEventAssignment {
  mentorId: string;
  reactionId?: string;
}

export interface MentorSettings {
  eventAssignments: Partial<Record<MentorEvent, MentorEventAssignment>>;
}

export interface MentorRoundContext {
  success: boolean;
  personalBest: boolean;
  nextLevelUnlocked: boolean;
  directorGrade: boolean;
  teamWin?: boolean;
}

export interface MentorPlayerContext {
  activeMentorId: string;
  mentorMode: MentorSelectionMode;
  wins: number;
  experienceLevel: number;
}

export interface MentorPresentation {
  event: MentorEvent;
  mentor: Mentor;
  reaction: MentorReaction;
}

export const MENTOR_EVENT_LABELS: Record<MentorEvent, string> = {
  "round-success": "Zaliczenie planszy",
  "personal-record": "Nowy rekord",
  "level-unlocked": "Nowy poziom",
  "round-failure": "Koniec czasu",
  "director-success": "Sukces Dyrektora",
  "team-win": "Wygrana drużyny",
};

export const MENTOR_CATEGORY_LABELS: Record<MentorReactionCategory, string> = {
  success: "Sukces",
  record: "Rekord",
  "level-up": "Awans",
  motivation: "Motywacja",
  warning: "Ostrzeżenie",
  failure: "Niepowodzenie",
  neutral: "Neutralna",
  power: "Moc",
  director: "Dyrektor",
  "team-win": "Drużyna",
};
