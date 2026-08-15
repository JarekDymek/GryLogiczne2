import { describe, expect, it } from "vitest";
import { parseFullBackup } from "./backup";

describe("pełna kopia aplikacji", () => {
  it("zachowuje profile, historię i bezpieczne metadane grafik", () => {
    const backup = parseFullBackup(JSON.stringify({
      format: "gry-logiczne2-full-backup",
      version: 1,
      createdAt: "2026-08-15T12:00:00.000Z",
      appData: {
        profiles: [{
          id: "p1",
          nickname: "Atlas",
          totalPoints: 900,
          achievementIds: ["first-win"],
          completedTargets: ["gardner-stage-01:gardner-figure-001"],
        }],
        activeProfileId: "p1",
        attempts: [],
        matches: [],
        teams: [],
      },
      assets: {
        version: 1,
        assets: [{
          store: "mentor-media",
          key: "mentor-1/reaction-1",
          mimeType: "image/webp",
          dataBase64: "AA==",
        }],
      },
    }));

    expect(backup.appData.profiles[0]).toMatchObject({
      id: "p1",
      nickname: "Atlas",
      totalPoints: 900,
      achievementIds: ["first-win"],
    });
    expect(backup.assets.assets).toHaveLength(1);
    expect(backup.progress.completedTargets).toEqual([
      "gardner-stage-01:gardner-figure-001",
    ]);
  });

  it("odrzuca kopię bez prawidłowych profili zamiast tworzyć pusty profil", () => {
    expect(() => parseFullBackup(JSON.stringify({
      format: "gry-logiczne2-full-backup",
      version: 1,
      appData: {},
      assets: { version: 1, assets: [] },
    }))).toThrow("prawidłowych profili");
  });

  it("odrzuca obcy format", () => {
    expect(() => parseFullBackup("{}"))
      .toThrow("To nie jest pełna kopia aplikacji");
  });
});
