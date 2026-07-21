import { describe, expect, it } from "vitest";
import { parseAppRole, resolveOwnerAccess } from "./ownerAccess";

const identity = { id: "5b3aac60-5907-4af5-bb0f-2c58a6f5de12", email: "owner@example.test" };

describe("owner authorization", () => {
  it.each(["player", "educator", "admin"] as const)(
    "denies the %s role",
    (role) => {
      expect(resolveOwnerAccess(identity, role)).toMatchObject({ status: "forbidden", role });
    },
  );

  it("allows only a backend-confirmed owner role", () => {
    expect(resolveOwnerAccess(identity, "owner")).toEqual({
      status: "authorized",
      identity,
      role: "owner",
    });
  });

  it("treats missing or forged role values as player", () => {
    expect(parseAppRole(undefined)).toBe("player");
    expect(parseAppRole("OWNER")).toBe("player");
    expect(parseAppRole("superadmin")).toBe("player");
  });
});

