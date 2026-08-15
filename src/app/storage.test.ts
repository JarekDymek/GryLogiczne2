import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  APP_DATA_RECOVERY_KEY,
  APP_DATA_STORAGE_KEY,
  defaultAppData,
  getPendingDataRecovery,
  importAppData,
  LEGACY_APP_DATA_STORAGE_KEYS,
  loadAppData,
  normalizeAppData,
  resolvePendingDataRecovery,
  saveAppData,
} from "./storage";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

let storage: MemoryStorage;

beforeEach(() => {
  storage = new MemoryStorage();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: storage },
  });
});

afterEach(() => {
  storage.clear();
  loadAppData();
  Reflect.deleteProperty(globalThis, "window");
});

describe("bezpieczny zapis danych aplikacji", () => {
  it("kwarantannuje uszkodzony zapis i nie pozwala nadpisać go pustymi danymi", () => {
    const corrupt = '{"profiles":[{"id":"ocalony"}';
    storage.setItem(APP_DATA_STORAGE_KEY, corrupt);

    const loaded = loadAppData();

    expect(loaded.profiles).toHaveLength(1);
    expect(storage.getItem(APP_DATA_STORAGE_KEY)).toBe(corrupt);
    expect(saveAppData(defaultAppData())).toBe(false);
    expect(storage.getItem(APP_DATA_STORAGE_KEY)).toBe(corrupt);
    expect(getPendingDataRecovery()).toMatchObject({
      sourceKey: APP_DATA_STORAGE_KEY,
      rawValue: corrupt,
    });
    expect(storage.getItem(APP_DATA_RECOVERY_KEY)).not.toBeNull();
  });

  it("odczytuje prawidłową wersję starszą, ale zachowuje blokadę uszkodzonej wersji bieżącej", () => {
    const legacy = normalizeAppData({
      schemaVersion: 3,
      profiles: [{ id: "p1", nickname: "Atlas", totalPoints: 720 }],
      activeProfileId: "p1",
    });
    storage.setItem(APP_DATA_STORAGE_KEY, "nie-json");
    storage.setItem(LEGACY_APP_DATA_STORAGE_KEYS[0], JSON.stringify(legacy));

    const loaded = loadAppData();

    expect(loaded.profiles[0]).toMatchObject({ id: "p1", nickname: "Atlas", totalPoints: 720 });
    expect(saveAppData(loaded)).toBe(false);
  });

  it("zapisuje wybrane dane dopiero po jawnym zakończeniu odzyskiwania", () => {
    storage.setItem(APP_DATA_STORAGE_KEY, "{");
    loadAppData();
    const restored = normalizeAppData({
      profiles: [{ id: "restored", nickname: "Odzyskany", totalPoints: 1200 }],
      activeProfileId: "restored",
    });

    resolvePendingDataRecovery(restored);

    expect(getPendingDataRecovery()).toBeNull();
    expect(importAppData(storage.getItem(APP_DATA_STORAGE_KEY) ?? "").profiles[0]).toMatchObject({
      id: "restored",
      nickname: "Odzyskany",
      totalPoints: 1200,
    });
    expect(saveAppData(restored)).toBe(true);
  });

  it("odrzuca pliki, które nie są kopią danych profili", () => {
    expect(() => importAppData("{}"))
      .toThrow("prawidłowych profili");
    expect(() => importAppData("null"))
      .toThrow("obiektu aplikacji");
  });

  it("zachowuje oba profile, gdy starszy zapis zawiera powielone identyfikatory", () => {
    const normalized = normalizeAppData({
      profiles: [
        { id: "p1", nickname: "Pierwszy", totalPoints: 10 },
        { id: "p1", nickname: "Drugi", totalPoints: 20 },
      ],
      activeProfileId: "p1",
    });

    expect(normalized.profiles.map((profile) => profile.id)).toEqual(["p1", "p1-2"]);
    expect(normalized.profiles.map((profile) => profile.nickname)).toEqual(["Pierwszy", "Drugi"]);
  });

  it("migruje realistyczne dane v2 bez utraty punktów i postępu", () => {
    const migrated = importAppData(readFileSync(
      new URL("./fixtures/legacy-app-data-v2.json", import.meta.url),
      "utf8",
    ));

    expect(migrated.profiles[0]).toMatchObject({
      id: "uczen-7",
      nickname: "Bizon",
      totalPoints: 2340,
      completedTargets: [
        "gardner-stage-01:gardner-figure-001",
        "gardner-stage-01:gardner-figure-002",
      ],
      achievementIds: ["first-win"],
      activeSkinId: "neon",
    });
    expect(migrated.settings.allowCustomTextures).toBe(false);
  });

  it("izoluje błędne rekordy prób i normalizuje liczby bez wywracania rankingu", () => {
    const normalized = normalizeAppData({
      profiles: [{ id: "p1", nickname: "Atlas" }],
      activeProfileId: "p1",
      attempts: [
        null,
        { profileId: "brak", points: 100 },
        {
          id: "a1",
          profileId: "p1",
          familyId: "błędna",
          points: "dużo",
          moves: Number.POSITIVE_INFINITY,
          success: true,
        },
      ],
    });

    expect(normalized.attempts).toHaveLength(1);
    expect(normalized.attempts[0]).toMatchObject({
      id: "a1",
      profileId: "p1",
      familyId: "gardner",
      points: 0,
      moves: 0,
      success: true,
    });
  });
});
