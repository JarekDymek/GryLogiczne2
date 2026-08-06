import type { AppData } from "./types";

export function csvSafeCell(value: unknown): string {
  const text = String(value ?? "");
  const safe = /^\s*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function attemptsCsv(data: AppData): string {
  const header = ["data", "profil", "figura", "stopien", "zaliczenie", "punkty", "czas", "ruchy", "resety", "podpowiedzi"];
  const rows = data.attempts.map((attempt) => [
    attempt.completedAt,
    data.profiles.find((profile) => profile.id === attempt.profileId)?.nickname ?? attempt.profileId,
    attempt.targetKey,
    attempt.grade,
    attempt.success ? "tak" : "nie",
    attempt.points,
    attempt.elapsedSeconds,
    attempt.moves,
    attempt.resets,
    attempt.hintsUsed ?? 0,
  ]);
  return `\uFEFF${[header, ...rows].map((row) => row.map(csvSafeCell).join(",")).join("\r\n")}`;
}
