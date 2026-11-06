import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../../public/sw.js", import.meta.url), "utf8");

describe("aktualizacja PWA", () => {
  it("usuwa tylko stare cache tej aplikacji", async () => {
    const handlers: Record<string, (event: unknown) => void> = {};
    const deleted: string[] = [];
    let task: Promise<unknown> | undefined;
    runInNewContext(source, {
      URL,
      self: {
        registration: { scope: "https://example.test/GryLogiczne2/" },
        clients: { claim: async () => {} },
        addEventListener: (name: string, handler: (event: unknown) => void) => { handlers[name] = handler; },
      },
      caches: {
        keys: async () => ["gry-logiczne2-old", "gry-logiczne2-dev", "asmow-private-v77", "other-app-v1"],
        delete: async (name: string) => { deleted.push(name); },
      },
    });
    handlers.activate({ waitUntil: (promise: Promise<unknown>) => { task = promise; } });
    await task;
    expect(deleted).toEqual(["gry-logiczne2-old"]);
  });
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
