import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_MENTORS,
  createCustomMentor,
  defaultMentorSettings,
  resolveMentorPresentation,
} from "./catalog";
import { mergeMentorCatalog, parseMentorCatalogCache } from "./supabaseCatalog";
import type { Mentor } from "./types";

function remoteMentor(id = "mentor-owner-test", published = true): Mentor {
  const mentor = createCustomMentor(2);
  return {
    ...mentor,
    id,
    name: "owner-test",
    displayName: "Mentor ownera",
    source: "supabase",
    published,
    reactions: mentor.reactions.map((reaction, index) => ({
      ...reaction,
      id: `${id}-reaction-${index + 1}`,
      mentorId: id,
    })),
  };
}

describe("central mentor catalog", () => {
  it("keeps immutable system mentors and merges owner mentors", () => {
    const localDraft = createCustomMentor(1);
    const remote = remoteMentor();
    const merged = mergeMentorCatalog([...DEFAULT_MENTORS, localDraft], [
      remote,
      { ...remote, id: "mentor-fokus", displayName: "Nie zastępuj systemowego" },
    ], true);

    expect(merged.filter((mentor) => mentor.source === "built-in")).toHaveLength(DEFAULT_MENTORS.length);
    expect(merged.find((mentor) => mentor.id === "mentor-fokus")?.displayName).toBe("Kapitan Fokus");
    expect(merged.some((mentor) => mentor.id === localDraft.id)).toBe(true);
    expect(merged.some((mentor) => mentor.id === remote.id && mentor.source === "supabase")).toBe(true);
  });

  it("loads only valid versioned catalog cache entries", () => {
    const remote = remoteMentor();
    expect(parseMentorCatalogCache("nie-json")).toEqual([]);
    expect(parseMentorCatalogCache(JSON.stringify({ version: 2, mentors: [remote] }))).toEqual([]);
    expect(parseMentorCatalogCache(JSON.stringify({ version: 1, mentors: [remote] }))[0]).toMatchObject({
      id: remote.id,
      source: "supabase",
      published: true,
    });
  });

  it("never presents local drafts or unpublished cloud mentors to a player", () => {
    const result = resolveMentorPresentation({
      mentors: [createCustomMentor(1), remoteMentor("mentor-owner-draft", false)],
      settings: defaultMentorSettings(),
      player: {
        activeMentorId: "mentor-owner-draft",
        mentorMode: "fixed",
        wins: 99,
        experienceLevel: 99,
      },
      round: {
        success: true,
        personalBest: false,
        nextLevelUnlocked: false,
        directorGrade: false,
      },
    });
    expect(result).toBeNull();
  });

  it("ships RLS and private Storage policies with the migration", () => {
    const sql = readFileSync(
      new URL("../../../supabase/migrations/202608070001_mentor_catalog.sql", import.meta.url),
      "utf8",
    );
    expect(sql).toContain("alter table public.mentor_catalog enable row level security");
    expect(sql).toContain("alter table public.mentor_reactions enable row level security");
    expect(sql).toContain("public.is_app_owner()");
    expect(sql).toContain("'mentor-media'");
    expect(sql).toMatch(/'mentor-media',[\s\S]*false,/);
    expect(sql).not.toContain("service_role");
  });
});
