import { describe, expect, it } from "vitest";
import {
  DEFAULT_MENTORS,
  defaultMentorSettings,
  isMentorUnlocked,
  mentorEventForRound,
  normalizeMentors,
  resolveMentorPresentation,
} from "./catalog";

const player = {
  activeMentorId: "mentor-fokus",
  mentorMode: "fixed" as const,
  wins: 8,
  experienceLevel: 4,
};

describe("mentor catalog", () => {
  it("ships valid mentors with unique reactions", () => {
    const mentorIds = new Set(DEFAULT_MENTORS.map((mentor) => mentor.id));
    const reactionIds = DEFAULT_MENTORS.flatMap((mentor) => mentor.reactions.map((entry) => entry.id));

    expect(mentorIds.size).toBe(DEFAULT_MENTORS.length);
    expect(new Set(reactionIds).size).toBe(reactionIds.length);
    expect(DEFAULT_MENTORS.every((mentor) => mentor.reactions.length >= 4)).toBe(true);
    expect(DEFAULT_MENTORS.every((mentor) => mentor.reactions.every((entry) => entry.mentorId === mentor.id))).toBe(true);
  });

  it("uses a stable priority for round events", () => {
    expect(mentorEventForRound({ success: false, personalBest: true, nextLevelUnlocked: true, directorGrade: true })).toBe("round-failure");
    expect(mentorEventForRound({ success: true, personalBest: true, nextLevelUnlocked: true, directorGrade: true })).toBe("director-success");
    expect(mentorEventForRound({ success: true, personalBest: true, nextLevelUnlocked: true, directorGrade: false })).toBe("level-unlocked");
    expect(mentorEventForRound({ success: true, personalBest: true, nextLevelUnlocked: false, directorGrade: false })).toBe("personal-record");
  });

  it("respects unlock requirements", () => {
    const focus = DEFAULT_MENTORS.find((mentor) => mentor.id === "mentor-fokus")!;
    const spark = DEFAULT_MENTORS.find((mentor) => mentor.id === "mentor-iskra")!;
    const strategist = DEFAULT_MENTORS.find((mentor) => mentor.id === "mentor-strateg")!;

    expect(isMentorUnlocked(focus, { wins: 0, experienceLevel: 1 })).toBe(true);
    expect(isMentorUnlocked(spark, { wins: 2, experienceLevel: 5 })).toBe(false);
    expect(isMentorUnlocked(spark, { wins: 3, experienceLevel: 1 })).toBe(true);
    expect(isMentorUnlocked(strategist, { wins: 20, experienceLevel: 2 })).toBe(false);
  });

  it("uses the profile mentor and a matching reaction", () => {
    const presentation = resolveMentorPresentation({
      mentors: DEFAULT_MENTORS,
      settings: defaultMentorSettings(),
      player,
      round: { success: true, personalBest: true, nextLevelUnlocked: false, directorGrade: false },
      random: () => 0,
    });

    expect(presentation?.mentor.id).toBe("mentor-fokus");
    expect(presentation?.reaction.category).toBe("record");
  });

  it("lets an event assignment override profile selection", () => {
    const presentation = resolveMentorPresentation({
      mentors: DEFAULT_MENTORS,
      settings: {
        eventAssignments: {
          "round-failure": { mentorId: "mentor-iskra", reactionId: "iskra-failure" },
        },
      },
      player,
      round: { success: false, personalBest: false, nextLevelUnlocked: false, directorGrade: false },
      random: () => 0,
    });

    expect(presentation?.mentor.id).toBe("mentor-iskra");
    expect(presentation?.reaction.id).toBe("iskra-failure");
  });

  it("excludes disabled and locked mentors from random selection", () => {
    const mentors = DEFAULT_MENTORS.map((mentor) =>
      mentor.id === "mentor-fokus" ? { ...mentor, enabled: false } : mentor,
    );
    const presentation = resolveMentorPresentation({
      mentors,
      settings: defaultMentorSettings(),
      player: { ...player, mentorMode: "random", wins: 0, experienceLevel: 1 },
      round: { success: true, personalBest: false, nextLevelUnlocked: false, directorGrade: false },
      random: () => 0.99,
    });

    expect(presentation).toBeNull();
  });

  it("restores built-ins while preserving a custom mentor", () => {
    const normalized = normalizeMentors([
      {
        id: "custom-one",
        name: "custom",
        displayName: "Własny mentor",
        avatarUrl: "https://example.test/avatar.webp",
        source: "custom",
        reactions: [],
      },
    ]);

    expect(normalized.filter((mentor) => mentor.source === "built-in")).toHaveLength(DEFAULT_MENTORS.length);
    expect(normalized.some((mentor) => mentor.id === "custom-one")).toBe(true);
    expect(normalized.find((mentor) => mentor.id === "custom-one")?.reactions.length).toBeGreaterThan(0);
  });
});
