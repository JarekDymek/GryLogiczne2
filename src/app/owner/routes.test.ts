import { describe, expect, it } from "vitest";
import {
  buildOwnerRedirectUrl,
  isOwnerAuthCallback,
  ownerPanelUrlAfterAuth,
} from "./routes";

describe("trasa logowania właściciela", () => {
  it("buduje callback w katalogu GitHub Pages", () => {
    expect(buildOwnerRedirectUrl("/GryLogiczne2/", "https://jarek.example"))
      .toBe("https://jarek.example/GryLogiczne2/?owner=1");
  });

  it("rozpoznaje tylko jawny callback właściciela", () => {
    expect(isOwnerAuthCallback("?owner=1&code=abc")).toBe(true);
    expect(isOwnerAuthCallback("?owner=0")).toBe(false);
    expect(isOwnerAuthCallback("?room=abc")).toBe(false);
  });

  it("usuwa parametry logowania i prowadzi do panelu", () => {
    expect(ownerPanelUrlAfterAuth(
      "https://jarek.example/GryLogiczne2/?owner=1&code=secret&lang=pl",
    )).toBe("/GryLogiczne2/?lang=pl#owner");
  });
});
