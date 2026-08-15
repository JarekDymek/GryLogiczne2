export const OWNER_ROUTE_HASH = "#owner";

export type OwnerMagicLinkType = "email" | "magiclink";

export interface OwnerMagicLinkToken {
  tokenHash: string;
  type: OwnerMagicLinkType;
}

export function buildOwnerRedirectUrl(baseUrl: string, origin: string): string {
  const redirectUrl = new URL(baseUrl, origin);
  redirectUrl.searchParams.set("owner", "1");
  redirectUrl.hash = "";
  return redirectUrl.toString();
}

export function isOwnerAuthCallback(search: string): boolean {
  return new URLSearchParams(search).get("owner") === "1";
}

export function ownerPanelUrlAfterAuth(currentUrl: string): string {
  const url = new URL(currentUrl);
  url.searchParams.delete("owner");
  url.searchParams.delete("code");
  url.searchParams.delete("token_hash");
  url.searchParams.delete("type");
  url.hash = OWNER_ROUTE_HASH;
  return `${url.pathname}${url.search}${url.hash}`;
}

export function parseOwnerMagicLink(
  pastedValue: string,
  configuredSupabaseUrl: string,
): OwnerMagicLinkToken | null {
  try {
    const link = new URL(pastedValue.trim());
    const backend = new URL(configuredSupabaseUrl);
    const expectedPath = `${backend.pathname.replace(/\/$/, "")}/auth/v1/verify`;
    const type = link.searchParams.get("type");
    const tokenHash = link.searchParams.get("token_hash") ?? link.searchParams.get("token") ?? "";

    if (
      link.origin !== backend.origin ||
      link.pathname !== expectedPath ||
      (type !== "email" && type !== "magiclink") ||
      tokenHash.length < 8 ||
      tokenHash.length > 2048
    ) {
      return null;
    }

    return { tokenHash, type };
  } catch {
    return null;
  }
}
