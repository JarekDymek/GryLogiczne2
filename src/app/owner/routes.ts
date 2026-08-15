export const OWNER_ROUTE_HASH = "#owner";

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
