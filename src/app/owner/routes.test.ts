import { describe, expect, it } from "vitest";
import {
  buildOwnerRedirectUrl,
  isOwnerAuthCallback,
  ownerPanelUrlAfterAuth,
  parseOwnerMagicLink,
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

  it("przyjmuje tylko link weryfikacyjny skonfigurowanego projektu Supabase", () => {
    expect(parseOwnerMagicLink(
      "https://project.supabase.co/auth/v1/verify?token=abcdefgh12345678&type=magiclink&redirect_to=https%3A%2F%2Fexample.test",
      "https://project.supabase.co",
    )).toEqual({ tokenHash: "abcdefgh12345678", type: "magiclink" });

    expect(parseOwnerMagicLink(
      "https://project.supabase.co/auth/v1/verify?token_hash=abcdefgh87654321&type=email",
      "https://project.supabase.co/",
    )).toEqual({ tokenHash: "abcdefgh87654321", type: "email" });
  });

  it("odrzuca obce, błędne i niezwiązane linki", () => {
    expect(parseOwnerMagicLink(
      "https://project.supabase.co.evil.test/auth/v1/verify?token=abcdefgh&type=magiclink",
      "https://project.supabase.co",
    )).toBeNull();
    expect(parseOwnerMagicLink(
      "https://project.supabase.co/functions/v1/verify?token=abcdefgh&type=magiclink",
      "https://project.supabase.co",
    )).toBeNull();
    expect(parseOwnerMagicLink("nie jest linkiem", "https://project.supabase.co")).toBeNull();
  });
});
