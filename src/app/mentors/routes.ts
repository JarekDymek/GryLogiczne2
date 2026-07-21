export type MentorRoute =
  | { view: "library" }
  | { view: "settings" }
  | { view: "detail"; mentorId: string };

export function parseMentorRoute(hash: string): MentorRoute | null {
  const normalized = hash.replace(/^#/, "").replace(/^\//, "");
  const parts = normalized.split("/").filter(Boolean);
  if (parts[0] !== "mentors") {
    return null;
  }
  if (parts[1] === "settings") {
    return { view: "settings" };
  }
  if (parts[1] && parts[1] !== "library") {
    return { view: "detail", mentorId: decodeURIComponent(parts[1]) };
  }
  return { view: "library" };
}

export function mentorRouteHash(route: MentorRoute): string {
  if (route.view === "settings") {
    return "#/mentors/settings";
  }
  if (route.view === "detail") {
    return `#/mentors/${encodeURIComponent(route.mentorId)}`;
  }
  return "#/mentors/library";
}
