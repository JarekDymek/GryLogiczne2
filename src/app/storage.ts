import {
  loadStoredProgress,
  SOCIAL_GRADES,
  type SocialGrade,
} from "../games/t-puzzle/progress";
import type {
  AppData,
  AppSettings,
  AvatarId,
  PlayerProfile,
  Team,
} from "./types";
import { experienceLevel } from "./scoring";
import {
  DEFAULT_MENTORS,
  defaultMentorSettings,
  normalizeMentors,
  normalizeMentorSettings,
} from "./mentors/catalog";

export const APP_SCHEMA_VERSION = 4;
export const APP_DATA_STORAGE_KEY = "gry-logiczne2:app-data:v4";
const LEGACY_APP_DATA_STORAGE_KEYS = [
  "gry-logiczne2:app-data:v3",
  "gry-logiczne2:app-data:v2",
];

const AVATARS: AvatarId[] = ["bolt", "target", "brain", "shield", "flame", "crown"];

function nowIso(): string {
  return new Date().toISOString();
}

export function createId(prefix: string): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${random}`;
}

export function createPlayerProfile(
  nickname = "Zawodnik 1",
  groupName = "Grupa VI",
): PlayerProfile {
  const timestamp = nowIso();
  return {
    id: createId("player"),
    nickname,
    groupName,
    avatarId: "bolt",
    totalPoints: 0,
    experienceLevel: 1,
    winStreak: 0,
    wins: 0,
    completedAttempts: 0,
    completedTargets: [],
    bestGrade: "0",
    achievementIds: [],
    unlockedSkinIds: ["classic"],
    skinUnlockedAt: { classic: timestamp },
    activeSkinId: "classic",
    featuredAchievementIds: [],
    activeMentorId: DEFAULT_MENTORS.find((mentor) => mentor.isDefault)?.id ?? DEFAULT_MENTORS[0].id,
    mentorMode: "fixed",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function defaultSettings(): AppSettings {
  return {
    educatorPinHash: null,
    allowCustomTextures: true,
    reducedEffects: false,
    soundEnabled: false,
  };
}

export function defaultAppData(): AppData {
  const profile = createPlayerProfile();
  return {
    schemaVersion: APP_SCHEMA_VERSION,
    profiles: [profile],
    activeProfileId: profile.id,
    teams: [],
    matches: [],
    attempts: [],
    mentors: normalizeMentors(undefined),
    mentorSettings: defaultMentorSettings(),
    settings: defaultSettings(),
  };
}

function validGrade(value: unknown): SocialGrade {
  return SOCIAL_GRADES.includes(value as SocialGrade) ? (value as SocialGrade) : "0";
}

function normalizeStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? Array.from(new Set(value.filter((entry): entry is string => typeof entry === "string")))
    : [];
}

function normalizeProfile(value: unknown, fallbackIndex: number): PlayerProfile {
  const fallback = createPlayerProfile(`Zawodnik ${fallbackIndex + 1}`);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }
  const profile = value as Partial<PlayerProfile>;
  const totalPoints =
    typeof profile.totalPoints === "number" && Number.isFinite(profile.totalPoints)
      ? Math.max(0, Math.trunc(profile.totalPoints))
      : 0;
  const skinIds = normalizeStringList(profile.unlockedSkinIds);
  if (!skinIds.includes("classic")) {
    skinIds.unshift("classic");
  }
  const activeSkinId =
    typeof profile.activeSkinId === "string" && skinIds.includes(profile.activeSkinId)
      ? profile.activeSkinId
      : "classic";
  const createdAt =
    typeof profile.createdAt === "string" ? profile.createdAt : fallback.createdAt;
  const skinDates =
    profile.skinUnlockedAt &&
    typeof profile.skinUnlockedAt === "object" &&
    !Array.isArray(profile.skinUnlockedAt)
      ? profile.skinUnlockedAt
      : {};
  return {
    ...fallback,
    id: typeof profile.id === "string" && profile.id ? profile.id : fallback.id,
    nickname:
      typeof profile.nickname === "string" && profile.nickname.trim()
        ? profile.nickname.trim().slice(0, 24)
        : fallback.nickname,
    playerNumber:
      typeof profile.playerNumber === "string" ? profile.playerNumber.slice(0, 12) : undefined,
    groupName:
      typeof profile.groupName === "string" && profile.groupName.trim()
        ? profile.groupName.trim().slice(0, 28)
        : fallback.groupName,
    avatarId: AVATARS.includes(profile.avatarId as AvatarId)
      ? (profile.avatarId as AvatarId)
      : "bolt",
    totalPoints,
    experienceLevel: experienceLevel(totalPoints),
    winStreak:
      typeof profile.winStreak === "number" ? Math.max(0, Math.trunc(profile.winStreak)) : 0,
    wins: typeof profile.wins === "number" ? Math.max(0, Math.trunc(profile.wins)) : 0,
    completedAttempts:
      typeof profile.completedAttempts === "number"
        ? Math.max(0, Math.trunc(profile.completedAttempts))
        : 0,
    completedTargets: normalizeStringList(profile.completedTargets),
    bestGrade: validGrade(profile.bestGrade),
    achievementIds: normalizeStringList(profile.achievementIds),
    unlockedSkinIds: skinIds,
    skinUnlockedAt: Object.fromEntries(
      skinIds.map((skinId) => [
        skinId,
        typeof skinDates[skinId] === "string" ? skinDates[skinId] : createdAt,
      ]),
    ),
    activeSkinId,
    featuredAchievementIds: normalizeStringList(profile.featuredAchievementIds).slice(0, 3),
    activeMentorId:
      typeof profile.activeMentorId === "string" && profile.activeMentorId
        ? profile.activeMentorId
        : fallback.activeMentorId,
    mentorMode: profile.mentorMode === "random" ? "random" : "fixed",
    createdAt,
    updatedAt: typeof profile.updatedAt === "string" ? profile.updatedAt : fallback.updatedAt,
  };
}

function normalizeTeams(value: unknown, profileIds: Set<string>): Team[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((entry): entry is Team => Boolean(entry && typeof entry === "object"))
    .map((team, index) => ({
      id: typeof team.id === "string" ? team.id : `team-${index + 1}`,
      name: typeof team.name === "string" ? team.name.slice(0, 32) : `Drużyna ${index + 1}`,
      color: typeof team.color === "string" ? team.color : "#2563eb",
      memberProfileIds: normalizeStringList(team.memberProfileIds).filter((id) =>
        profileIds.has(id),
      ),
      createdAt: typeof team.createdAt === "string" ? team.createdAt : nowIso(),
    }));
}

export function normalizeAppData(value: unknown): AppData {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return defaultAppData();
  }
  const source = value as Partial<AppData>;
  const profiles = Array.isArray(source.profiles)
    ? source.profiles.map(normalizeProfile)
    : [];
  const safeProfiles = profiles.length > 0 ? profiles : [createPlayerProfile()];
  const profileIds = new Set(safeProfiles.map((profile) => profile.id));
  const activeProfileId =
    typeof source.activeProfileId === "string" && profileIds.has(source.activeProfileId)
      ? source.activeProfileId
      : safeProfiles[0].id;
  const settingsSource: Partial<AppSettings> =
    source.settings && typeof source.settings === "object" ? source.settings : {};
  const mentors = normalizeMentors(source.mentors);
  const mentorIds = new Set(mentors.map((mentor) => mentor.id));
  const normalizedProfiles = safeProfiles.map((profile) => ({
    ...profile,
    activeMentorId: mentorIds.has(profile.activeMentorId)
      ? profile.activeMentorId
      : DEFAULT_MENTORS[0].id,
  }));

  return {
    schemaVersion: APP_SCHEMA_VERSION,
    profiles: normalizedProfiles,
    activeProfileId,
    teams: normalizeTeams(source.teams, profileIds),
    attempts: Array.isArray(source.attempts)
      ? source.attempts.filter(
          (attempt) =>
            attempt &&
            typeof attempt === "object" &&
            profileIds.has((attempt as { profileId?: string }).profileId ?? ""),
        )
      : [],
    matches: Array.isArray(source.matches)
      ? source.matches.filter((match) => match && typeof match === "object")
      : [],
    mentors,
    mentorSettings: normalizeMentorSettings(source.mentorSettings, mentors),
    settings: {
      educatorPinHash:
        typeof settingsSource.educatorPinHash === "string"
          ? settingsSource.educatorPinHash
          : null,
      allowCustomTextures: settingsSource.allowCustomTextures !== false,
      reducedEffects: settingsSource.reducedEffects === true,
      soundEnabled: settingsSource.soundEnabled === true,
    },
  };
}

export function parseAppData(rawValue: string | null): AppData {
  if (!rawValue) {
    return defaultAppData();
  }
  try {
    return normalizeAppData(JSON.parse(rawValue));
  } catch {
    return defaultAppData();
  }
}

export function loadAppData(): AppData {
  if (typeof window === "undefined") {
    return defaultAppData();
  }
  const current =
    window.localStorage.getItem(APP_DATA_STORAGE_KEY) ??
    LEGACY_APP_DATA_STORAGE_KEYS.map((key) => window.localStorage.getItem(key)).find(Boolean);
  if (current) {
    return parseAppData(current);
  }

  const migrated = defaultAppData();
  const legacyProgress = loadStoredProgress();
  migrated.profiles[0] = {
    ...migrated.profiles[0],
    completedTargets: legacyProgress.completedTargets,
    completedAttempts: legacyProgress.completedTargets.length,
    wins: legacyProgress.completedTargets.length,
  };
  return migrated;
}

export function saveAppData(data: AppData): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(APP_DATA_STORAGE_KEY, JSON.stringify(normalizeAppData(data)));
}

export function exportAppData(data: AppData): string {
  return JSON.stringify(normalizeAppData(data), null, 2);
}

export function importAppData(rawValue: string): AppData {
  return normalizeAppData(JSON.parse(rawValue));
}

export function hashPin(pin: string): string {
  let hash = 2166136261;
  for (const character of `mow-malbork:${pin}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function updateProfile(
  data: AppData,
  profileId: string,
  updater: (profile: PlayerProfile) => PlayerProfile,
): AppData {
  return {
    ...data,
    profiles: data.profiles.map((profile) =>
      profile.id === profileId
        ? normalizeProfile({ ...updater(profile), updatedAt: nowIso() }, 0)
        : profile,
    ),
  };
}
