import { describe, expect, it } from "vitest";
import { completedFullLevelCount, newlyCompletesLevel } from "./profileProgress";

const firstLevel = [
  "gardner-stage-01:gardner-figure-001",
  "gardner-stage-01:gardner-figure-002",
  "gardner-stage-01:gardner-figure-003",
];

describe("podsumowanie postępu bez ładowania katalogu geometrii", () => {
  it("liczy tylko pełne zestawy trzech różnych wariantów", () => {
    expect(completedFullLevelCount([...firstLevel, ...firstLevel])).toBe(1);
    expect(completedFullLevelCount(firstLevel.slice(0, 2))).toBe(0);
  });

  it("rozpoznaje moment ukończenia zestawu", () => {
    expect(newlyCompletesLevel(firstLevel.slice(0, 2), firstLevel, firstLevel[2])).toBe(true);
    expect(newlyCompletesLevel(firstLevel, firstLevel, firstLevel[2])).toBe(false);
    expect(newlyCompletesLevel([], [], "błędny-klucz")).toBe(false);
  });
});
