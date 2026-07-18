export const APP_ROLES = ["player", "educator", "admin", "owner"] as const;

export type AppRole = (typeof APP_ROLES)[number];

export interface OwnerIdentity {
  id: string;
  email: string | null;
}

export type OwnerAccessState =
  | { status: "unconfigured" }
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "forbidden"; identity: OwnerIdentity; role: AppRole }
  | { status: "authorized"; identity: OwnerIdentity; role: "owner" }
  | { status: "error"; message: string };

export function parseAppRole(value: unknown): AppRole {
  return APP_ROLES.includes(value as AppRole) ? (value as AppRole) : "player";
}

export function resolveOwnerAccess(
  identity: OwnerIdentity,
  roleValue: unknown,
): OwnerAccessState {
  const role = parseAppRole(roleValue);
  return role === "owner"
    ? { status: "authorized", identity, role }
    : { status: "forbidden", identity, role };
}

