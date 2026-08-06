import { describe, expect, it } from "vitest";
import { csvSafeCell } from "./csv";
import { createPinHash, isLegacyPinHash, legacyHashPin, verifyPin } from "./pinSecurity";

describe("local security helpers", () => {
  it("stores a PIN with a random, slow hash", async () => {
    const first = await createPinHash("1234");
    const second = await createPinHash("1234");
    expect(first).not.toBe(second);
    expect(await verifyPin("1234", first)).toBe(true);
    expect(await verifyPin("4321", first)).toBe(false);
  });

  it("accepts the legacy PIN during migration", async () => {
    const legacy = legacyHashPin("2580");
    expect(isLegacyPinHash(legacy)).toBe(true);
    expect(await verifyPin("2580", legacy)).toBe(true);
  });

  it("neutralizes spreadsheet formulas in CSV", () => {
    expect(csvSafeCell("=HYPERLINK(\"bad\")")).toBe('"\'=HYPERLINK(""bad"")"');
    expect(csvSafeCell("Uczeń")).toBe('"Uczeń"');
  });
});
