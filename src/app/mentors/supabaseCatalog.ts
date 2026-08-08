import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_MENTORS, normalizeMentors } from "./catalog";
import {
  cacheRemoteMentorBlob,
  cachedRemoteMentorUrl,
  readMentorBlob,
} from "./mentorMedia";
import type { Mentor, MentorReaction } from "./types";
import { getOwnerAuthClient } from "../owner/supabaseOwnerAuth";

const CACHE_KEY = "gry-logiczne2:mentor-catalog-cache:v1";
const STORAGE_BUCKET = "mentor-media";
const SIGNED_URL_TTL_SECONDS = 60 * 60;

export interface MentorCatalogLoadResult {
  mentors: Mentor[];
  source: "remote" | "cache" | "unconfigured";
  message?: string;
}

interface ReactionRow {
  id: string;
  mentor_id: string;
  position: number;
  label: string;
  title: string;
  subtitle: string;
  category: MentorReaction["category"];
  media_type: MentorReaction["mediaType"];
  media_path: string | null;
  sound_id: string | null;
  effect_id: string | null;
  enabled: boolean;
  weight: number | string;
}

interface MentorRow {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  avatar_path: string | null;
  enabled: boolean;
  allowed_for_players: boolean;
  published: boolean;
  unlock_type: Mentor["unlock"]["type"];
  unlock_value: number;
  unlock_label: string;
  created_at: string;
  updated_at: string;
  mentor_reactions: ReactionRow[] | null;
}

function storagePaths(rows: MentorRow[]): string[] {
  return [...new Set(rows.flatMap((row) => [
    row.avatar_path,
    ...(row.mentor_reactions ?? []).map((reaction) => reaction.media_path),
  ]).filter((path): path is string => Boolean(path)))];
}

async function resolveStorageMedia(
  client: SupabaseClient,
  rows: MentorRow[],
): Promise<Map<string, string>> {
  const paths = storagePaths(rows);
  const resolved = new Map(paths.map((path) => [path, cachedRemoteMentorUrl(path)]));
  if (paths.length === 0) return resolved;

  const { data, error } = await client.storage
    .from(STORAGE_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
  if (error || !data) return resolved;

  await Promise.all(data.map(async (entry) => {
    if (!entry.path || !entry.signedUrl || entry.error) return;
    try {
      const response = await fetch(entry.signedUrl, { cache: "no-store" });
      if (!response.ok) return;
      resolved.set(entry.path, await cacheRemoteMentorBlob(entry.path, await response.blob()));
    } catch {
      resolved.set(entry.path, entry.signedUrl);
    }
  }));
  return resolved;
}

export function mapMentorRows(
  rows: MentorRow[],
  mediaUrls = new Map<string, string>(),
): Mentor[] {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    displayName: row.display_name,
    description: row.description ?? undefined,
    avatarUrl: row.avatar_path
      ? mediaUrls.get(row.avatar_path) ?? cachedRemoteMentorUrl(row.avatar_path)
      : "mentors/fokus.svg",
    avatarStoragePath: row.avatar_path ?? undefined,
    enabled: row.enabled,
    isDefault: false,
    allowedForPlayers: row.allowed_for_players,
    source: "supabase",
    published: row.published,
    unlock: {
      type: row.unlock_type,
      value: row.unlock_value,
      label: row.unlock_label,
    },
    reactions: [...(row.mentor_reactions ?? [])]
      .sort((left, right) => left.position - right.position)
      .map((reaction) => ({
        id: reaction.id,
        mentorId: row.id,
        label: reaction.label,
        title: reaction.title,
        subtitle: reaction.subtitle,
        category: reaction.category,
        mediaType: reaction.media_type,
        mediaUrl: reaction.media_path
          ? mediaUrls.get(reaction.media_path) ?? cachedRemoteMentorUrl(reaction.media_path)
          : undefined,
        storagePath: reaction.media_path ?? undefined,
        soundId: reaction.sound_id ?? undefined,
        effectId: reaction.effect_id ?? undefined,
        enabled: reaction.enabled,
        weight: Number(reaction.weight) || 1,
      })),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export function parseMentorCatalogCache(value: string | null): Mentor[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as { version?: unknown; mentors?: unknown };
    if (parsed.version !== 1 || !Array.isArray(parsed.mentors)) return [];
    return normalizeMentors(parsed.mentors).filter((mentor) => mentor.source === "supabase");
  } catch {
    return [];
  }
}

function readCache(): Mentor[] {
  try {
    return parseMentorCatalogCache(localStorage.getItem(CACHE_KEY));
  } catch {
    return [];
  }
}

function writeCache(mentors: Mentor[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      version: 1,
      savedAt: new Date().toISOString(),
      mentors: mentors.filter((mentor) => mentor.published === true && mentor.enabled),
    }));
  } catch {
    // Brak miejsca w localStorage nie blokuje katalogu działającego online.
  }
}

export function mergeMentorCatalog(
  localMentors: Mentor[],
  remoteMentors: Mentor[],
  includeLocalDrafts = false,
): Mentor[] {
  const builtInIds = new Set(DEFAULT_MENTORS.map((mentor) => mentor.id));
  const builtIns = normalizeMentors(localMentors).filter((mentor) => mentor.source === "built-in");
  const drafts = includeLocalDrafts
    ? localMentors.filter((mentor) => mentor.source === "custom" && !builtInIds.has(mentor.id))
    : [];
  const remote = remoteMentors.filter((mentor) => !builtInIds.has(mentor.id));
  const byId = new Map<string, Mentor>();
  for (const mentor of [...builtIns, ...drafts, ...remote]) byId.set(mentor.id, mentor);
  return normalizeMentors([...byId.values()]);
}

export async function loadMentorCatalog(): Promise<MentorCatalogLoadResult> {
  const client = getOwnerAuthClient();
  const cached = readCache();
  if (!client) return { mentors: cached, source: cached.length ? "cache" : "unconfigured" };

  const { data, error } = await client
    .from("mentor_catalog")
    .select("id,name,display_name,description,avatar_path,enabled,allowed_for_players,published,unlock_type,unlock_value,unlock_label,created_at,updated_at,mentor_reactions(id,mentor_id,position,label,title,subtitle,category,media_type,media_path,sound_id,effect_id,enabled,weight)")
    .order("display_name");
  if (error || !data) {
    return {
      mentors: cached,
      source: "cache",
      message: cached.length
        ? "Brak połączenia z katalogiem — użyto lokalnego cache’u."
        : "Nie udało się pobrać centralnego katalogu mentorów.",
    };
  }

  const rows = data as unknown as MentorRow[];
  const mentors = mapMentorRows(rows, await resolveStorageMedia(client, rows));
  writeCache(mentors);
  return { mentors, source: "remote" };
}

async function requireOwner(client: SupabaseClient) {
  const { data: sessionData } = await client.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) throw new Error("Zaloguj się jako właściciel, aby zapisać katalog.");
  const { data: role, error } = await client.rpc("current_app_role");
  if (error || role !== "owner") throw new Error("Backend nie potwierdził roli owner.");
  return user;
}

async function uploadLocalMedia(
  client: SupabaseClient,
  mediaUrl: string | undefined,
  path: string,
): Promise<string | undefined> {
  if (!mediaUrl?.startsWith("mentor-asset:")) return undefined;
  const blob = await readMentorBlob(mediaUrl);
  if (!blob && mediaUrl.startsWith("mentor-asset:supabase/")) return undefined;
  if (!blob) throw new Error("Nie znaleziono lokalnej grafiki do publikacji.");
  const { error } = await client.storage.from(STORAGE_BUCKET).upload(path, blob, {
    upsert: true,
    cacheControl: "31536000",
    contentType: blob.type || "image/webp",
  });
  if (error) throw new Error(`Nie udało się wysłać grafiki: ${error.message}`);
  return path;
}

export async function saveMentorToSupabase(
  mentor: Mentor,
  publish: boolean,
): Promise<Mentor> {
  if (mentor.source === "built-in") throw new Error("Mentorzy systemowi pozostają niezmienni.");
  const client = getOwnerAuthClient();
  if (!client) throw new Error("Supabase nie jest skonfigurowany.");
  const user = await requireOwner(client);

  const uploadedAvatarPath = await uploadLocalMedia(client, mentor.avatarUrl, `${mentor.id}/avatar.webp`);
  const avatarPath = uploadedAvatarPath ?? mentor.avatarStoragePath;
  if (publish && !avatarPath) throw new Error("Przed publikacją dodaj portret mentora z urządzenia.");

  const reactions = await Promise.all(mentor.reactions.map(async (reaction, position) => {
    const uploadedPath = await uploadLocalMedia(
      client,
      reaction.mediaUrl,
      `${mentor.id}/reactions/${String(position + 1).padStart(2, "0")}.webp`,
    );
    return {
      ...reaction,
      storagePath: uploadedPath ?? reaction.storagePath,
      position,
    };
  }));

  const { error: mentorError } = await client.from("mentor_catalog").upsert({
    id: mentor.id,
    name: mentor.name,
    display_name: mentor.displayName,
    description: mentor.description ?? null,
    avatar_path: avatarPath ?? null,
    enabled: mentor.enabled,
    allowed_for_players: mentor.allowedForPlayers,
    published: false,
    unlock_type: mentor.unlock.type,
    unlock_value: mentor.unlock.value,
    unlock_label: mentor.unlock.label,
    created_by: user.id,
  }, { onConflict: "id" });
  if (mentorError) throw new Error(`Nie udało się zapisać mentora: ${mentorError.message}`);

  if (reactions.length > 0) {
    const { error: reactionError } = await client.from("mentor_reactions").upsert(
      reactions.map((reaction) => ({
        id: reaction.id,
        mentor_id: mentor.id,
        position: reaction.position,
        label: reaction.label,
        title: reaction.title,
        subtitle: reaction.subtitle,
        category: reaction.category,
        media_type: reaction.mediaType,
        media_path: reaction.storagePath ?? null,
        sound_id: reaction.soundId ?? null,
        effect_id: reaction.effectId ?? null,
        enabled: reaction.enabled,
        weight: reaction.weight,
      })),
      { onConflict: "id" },
    );
    if (reactionError) throw new Error(`Nie udało się zapisać reakcji: ${reactionError.message}`);
  }

  const { data: existing } = await client
    .from("mentor_reactions")
    .select("id")
    .eq("mentor_id", mentor.id);
  const currentIds = new Set(reactions.map((reaction) => reaction.id));
  const staleIds = (existing ?? [])
    .map((entry) => String(entry.id))
    .filter((id) => !currentIds.has(id));
  if (staleIds.length > 0) {
    const { error } = await client.from("mentor_reactions").delete().in("id", staleIds);
    if (error) throw new Error(`Nie udało się usunąć starych reakcji: ${error.message}`);
  }

  if (publish) {
    const { error } = await client
      .from("mentor_catalog")
      .update({ published: true })
      .eq("id", mentor.id);
    if (error) throw new Error(`Nie udało się opublikować mentora: ${error.message}`);
  }

  const saved: Mentor = {
    ...mentor,
    avatarStoragePath: avatarPath,
    source: "supabase",
    published: publish,
    reactions: reactions.map(({ position: _position, ...reaction }) => reaction),
    updatedAt: new Date().toISOString(),
  };
  const cached = readCache().filter((entry) => entry.id !== saved.id);
  writeCache([...cached, saved]);
  return saved;
}

export async function unpublishMentor(mentor: Mentor): Promise<Mentor> {
  if (mentor.source !== "supabase") return mentor;
  const client = getOwnerAuthClient();
  if (!client) throw new Error("Supabase nie jest skonfigurowany.");
  await requireOwner(client);
  const { error } = await client
    .from("mentor_catalog")
    .update({ published: false })
    .eq("id", mentor.id);
  if (error) throw new Error(`Nie udało się wycofać publikacji: ${error.message}`);
  const saved = { ...mentor, published: false, updatedAt: new Date().toISOString() };
  const cached = readCache().filter((entry) => entry.id !== saved.id);
  writeCache([...cached, saved]);
  return saved;
}
