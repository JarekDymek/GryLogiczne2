import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../../public/sw.js", import.meta.url), "utf8");

describe("aktualizacja PWA", () => {
  it("nie aktywuje nowego cache w środku działającej rundy", () => {
    const installHandler = source.slice(
      source.indexOf('addEventListener("install"'),
      source.indexOf('addEventListener("message"'),
    );
    expect(installHandler).not.toContain("skipWaiting");
    expect(source).toContain('event.data?.type === "SKIP_WAITING"');
  });

  it("nie zapisuje błędnej odpowiedzi HTML w cache powłoki", () => {
    expect(source).toContain("if (response.ok)");
  });
});
