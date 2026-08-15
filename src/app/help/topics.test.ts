import { describe, expect, it } from "vitest";
import { getHelpTopics, HELP_TOPICS, normalizeHelpSearch } from "./topics";

describe("pomoc", () => {
  it("ma unikalne identyfikatory i komplet praktycznych tematów", () => {
    expect(HELP_TOPICS.length).toBeGreaterThanOrEqual(16);
    expect(new Set(HELP_TOPICS.map((topic) => topic.id)).size).toBe(HELP_TOPICS.length);
  });

  it("wyszukuje bez rozróżniania wielkości liter i polskich znaków", () => {
    expect(getHelpTopics("home", "ODŁĄCZ")[0]?.id).toBe("detach");
    expect(getHelpTopics("home", "wlasciciel")[0]?.id).toBe("owner");
    expect(normalizeHelpSearch("  ŻÓŁĆ  ")).toBe("zolc");
  });

  it("w trybie odzyskiwania pokazuje najpierw kopię i reinstalację", () => {
    expect(getHelpTopics("recovery").slice(0, 2).map((topic) => topic.id))
      .toEqual(["backup", "reinstall"]);
  });
});
