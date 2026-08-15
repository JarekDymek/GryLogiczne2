import {
  loadStoredProgress,
  SOCIAL_GRADES,
  type SocialGrade,
} from "../games/t-puzzle/progress";
import type {
  AppData,
  AppSettings,
  AttemptResult,
  AvatarId,
  MatchResult,
  MatchRoundResult,
  PlayerProfile,
  Team,
} from "./types";
import { legacyHashPin } from "./pinSecurity";
import { experienceLevel } from "./scoring";
import {
  DEFAULT_MENTORS,
  defaultMentorSettings,
  normalizeMentors,
  normalizeMentorSettings,
} from "./mentors/catalog";

export const APP_SCHEMA_VERSION = 4;
export const APP_DATA_STORAGE_KEY = "gry-logiczne2:app-data:v4";
export const LEGACY_APP_DATA_STORAGE_KEYS = [
  "gry-logiczne2:app-data:v3",
  "gry-logiczne2:app-data:v2",
];
export const APP_DATA_RECOVERY_KEY = "gry-logiczne2:app-data:recovery:v1";
const APP_DATA_RECOVERY_ARCHIVE_KEY = "gry-logiczne2:app-data:recovery-archive:v1";

export interface AppDataRecoveryRecord {
  version: 1;
  sourceKey: string;
  rawValue: string;
  detectedAt: string;
  reason: string;
}

let persistenceBlocked = false;

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

function uniqueProfiles(profiles: PlayerProfile[]): PlayerProfile[] {
  const usedIds = new Set<string>();
  return profiles.map((profile) => {
    if (!usedIds.has(profile.id)) {
      usedIds.add(profile.id);
      return profile;
    }

    let suffix = 2;
    let uniqueId = `${profile.id}-${suffix}`;
    while (usedIds.has(uniqueId)) {
      suffix += 1;
      uniqueId = `${profile.id}-${suffix}`;
    }
    usedIds.add(uniqueId);
    return { ...profile, id: uniqueId };
  });
}

function safeNumber(value: unknown, maximum = Number.MAX_SAFE_INTEGER): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(maximum, Math.max(0, value))
    : 0;
}

function normalizeAttempts(value: unknown, profileIds: Set<string>): AttemptResult[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const source = entry as Partial<AttemptResult>;
    if (typeof source.profileId !== "string" || !profileIds.has(source.profileId)) return [];
    const familyId = ["gardner", "nob", "asymmetric"].includes(source.familyId ?? "")
      ? source.familyId as AttemptResult["familyId"]
      : "gardner";
    return [{
      id: typeof source.id === "string" && source.id ? source.id : `attempt-${index + 1}`,
      profileId: source.profileId,
      targetKey: typeof source.targetKey === "string" ? source.targetKey.slice(0, 180) : "",
      familyId,
      levelIndex: Math.trunc(safeNumber(source.levelIndex, 33)),
      targetIndex: Math.trunc(safeNumber(source.targetIndex, 2)),
      grade: validGrade(source.grade),
      success: source.success === true,
      elapsedSeconds: safeNumber(source.elapsedSeconds, 600),
      remainingSeconds: safeNumber(source.remainingSeconds, 600),
      moves: Math.trunc(safeNumber(source.moves, 10_000)),
      resets: Math.trunc(safeNumber(source.resets, 1_000)),
      hintsUsed: source.hintsUsed === undefined
        ? undefined
        : Math.trunc(safeNumber(source.hintsUsed, 3)),
      points: Math.trunc(safeNumber(source.points, 10_000_000)),
      newVariant: source.newVariant === true,
      personalBest: source.personalBest === true,
      duelId: typeof source.duelId === "string" ? source.duelId.slice(0, 180) : undefined,
      completedAt: typeof source.completedAt === "string" ? source.completedAt : nowIso(),
    }];
  });
}

function normalizeMatchRound(value: unknown, profileId: string): MatchRoundResult {
  const source = value && typeof value === "object" && !Array.isArray(value)
    ? value as Partial<MatchRoundResult>
    : {};
  return {
    profileId: typeof source.profileId === "string" ? source.profileId : profileId,
    success: source.success === true,
    points: Math.trunc(safeNumber(source.points, 10_000_000)),
    elapsedSeconds: safeNumber(source.elapsedSeconds, 600),
    moves: Math.trunc(safeNumber(source.moves, 10_000)),
    resets: Math.trunc(safeNumber(source.resets, 1_000)),
  };
}

function normalizeMatches(value: unknown): MatchResult[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const source = entry as Partial<MatchResult>;
    if (typeof source.playerAId !== "string" || typeof source.playerBId !== "string") return [];
    const rounds = Array.isArray(source.rounds) ? source.rounds : [];
    const rawLeaguePoints = source.leaguePoints && typeof source.leaguePoints === "object"
      ? source.leaguePoints
      : {};
    const leaguePoints = Object.fromEntries(
      Object.entries(rawLeaguePoints).flatMap(([profileId, points]) =>
        typeof points === "number" && Number.isFinite(points)
          ? [[profileId, Math.trunc(safeNumber(points, 3))]]
          : [],
      ),
    );
    return [{
      id: typeof source.id === "string" && source.id ? source.id : `match-${index + 1}`,
      playerAId: source.playerAId,
      playerBId: source.playerBId,
      winnerProfileId: typeof source.winnerProfileId === "string" ? source.winnerProfileId : null,
      leaguePoints,
      targetKey: typeof source.targetKey === "string" ? source.targetKey.slice(0, 180) : "",
      grade: validGrade(source.grade),
      rounds: [
        normalizeMatchRound(rounds[0], source.playerAId),
        normalizeMatchRound(rounds[1], source.playerBId),
      ],
      completedAt: typeof source.completedAt === "string" ? source.completedAt : nowIso(),
    }];
  });
}

export function normalizeAppData(value: unknown): AppData {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return defaultAppData();
  }
  const source = value as Partial<AppData>;
  const profiles = Array.isArray(source.profiles)
    ? source.profiles.map(normalizeProfile)
    : [];
  const safeProfiles = uniqueProfiles(
    profiles.length > 0 ? profiles : [createPlayerProfile()],
  );
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
    attempts: normalizeAttempts(source.attempts, profileIds),
    matches: normalizeMatches(source.matches),
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
  const parsed: unknown = JSON.parse(rawValue);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Plik danych nie zawiera obiektu aplikacji.");
  }
  const profiles = (parsed as { profiles?: unknown }).profiles;
  if (
    !Array.isArray(profiles) ||
    profiles.length === 0 ||
    profiles.some((profile) => !profile || typeof profile !== "object" || Array.isArray(profile))
  ) {
    throw new Error("Plik danych nie zawiera prawidłowych profili.");
  }
  return normalizeAppData(parsed);
}

function readRecoveryRecord(): AppDataRecoveryRecord | null {
  if (typeof window === "undefined") {
    return null;
  }
  const rawValue = window.localStorage.getItem(APP_DATA_RECOVERY_KEY);
  if (!rawValue) {
    return null;
  }
  try {
    const parsed = JSON.parse(rawValue) as Partial<AppDataRecoveryRecord>;
    return parsed.version === 1 &&
      typeof parsed.sourceKey === "string" &&
      typeof parsed.rawValue === "string" &&
      typeof parsed.detectedAt === "string" &&
      typeof parsed.reason === "string"
      ? (parsed as AppDataRecoveryRecord)
      : null;
  } catch {
    return null;
  }
}

function quarantineStoredData(sourceKey: string, rawValue: string, error: unknown): void {
  persistenceBlocked = true;
  if (readRecoveryRecord()) {
    return;
  }
  const record: AppDataRecoveryRecord = {
    version: 1,
    sourceKey,
    rawValue,
    detectedAt: nowIso(),
    reason: error instanceof Error ? error.message : "Nie udało się odczytać danych.",
  };
  try {
    window.localStorage.setItem(APP_DATA_RECOVERY_KEY, JSON.stringify(record));
  } catch {
    // Oryginalny klucz pozostaje nietknięty, a blokada działa do końca sesji.
  }
}

export function getPendingDataRecovery(): AppDataRecoveryRecord | null {
  const record = readRecoveryRecord();
  persistenceBlocked = Boolean(record) || persistenceBlocked;
  return record;
}

export function loadAppData(): AppData {
  if (typeof window === "undefined") {
    return defaultAppData();
  }
  persistenceBlocked = Boolean(readRecoveryRecord());
  const storageKeys = [APP_DATA_STORAGE_KEY, ...LEGACY_APP_DATA_STORAGE_KEYS];
  for (const storageKey of storageKeys) {
    const rawValue = window.localStorage.getItem(storageKey);
    if (!rawValue) {
      continue;
    }
    try {
      return parseAppData(rawValue);
    } catch (error) {
      quarantineStoredData(storageKey, rawValue, error);
    }
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

export function saveAppData(data: AppData): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  if (persistenceBlocked || readRecoveryRecord()) {
    persistenceBlocked = true;
    return false;
  }
  try {
    window.localStorage.setItem(APP_DATA_STORAGE_KEY, JSON.stringify(normalizeAppData(data)));
    return true;
  } catch {
    return false;
  }
}

export function resolvePendingDataRecovery(data: AppData): void {
  if (typeof window === "undefined") {
    return;
  }
  const recovery = readRecoveryRecord();
  if (recovery) {
    window.localStorage.setItem(APP_DATA_RECOVERY_ARCHIVE_KEY, JSON.stringify(recovery));
    window.localStorage.removeItem(APP_DATA_RECOVERY_KEY);
  }
  persistenceBlocked = false;
  window.localStorage.setItem(APP_DATA_STORAGE_KEY, JSON.stringify(normalizeAppData(data)));
}

export function exportAppData(data: AppData): string {
  return JSON.stringify(normalizeAppData(data), null, 2);
}

export function importAppData(rawValue: string): AppData {
  return parseAppData(rawValue);
}

export function hashPin(pin: string): string {
  return legacyHashPin(pin);
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
