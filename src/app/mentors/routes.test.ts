import { describe, expect, it } from "vitest";
import { mentorRouteHash, parseMentorRoute } from "./routes";

describe("mentor routes", () => {
  it("parses library, settings and detail routes", () => {
    expect(parseMentorRoute("#/mentors/library")).toEqual({ view: "library" });
    expect(parseMentorRoute("#/mentors/settings")).toEqual({ view: "settings" });
    expect(parseMentorRoute("#/mentors/mentor-fokus")).toEqual({ view: "detail", mentorId: "mentor-fokus" });
    expect(parseMentorRoute("#owner")).toBeNull();
  });

  it("round-trips a mentor identifier", () => {
    const route = { view: "detail", mentorId: "mentor własny" } as const;
    expect(parseMentorRoute(mentorRouteHash(route))).toEqual(route);
  });
});
