import type { AttemptResult, MatchResult, PlayerProfile } from "./types";

export type SkinRarity = "common" | "rare" | "epic" | "legendary";

export interface PieceSkin {
  id: string;
  name: string;
  description: string;
  rarity: SkinRarity;
  unlockLabel: string;
  palette: string[];
  gradient?: string;
  border: string;
  shadow: string;
}

export interface SkinUnlockContext {
  profile: PlayerProfile;
  attempts: AttemptResult[];
  matches: MatchResult[];
  weeklyRank?: number;
  fullLevels?: number;
  hasCustomTexture?: boolean;
}

export const PIECE_SKINS: PieceSkin[] = [
  {
    id: "classic",
    name: "Klasyczna",
    description: "Wyraźne kolory podstawowego zestawu.",
    rarity: "common",
    unlockLabel: "Dostępna od początku",
    palette: ["#2f80ed", "#22c55e", "#ec4899", "#facc15"],
    border: "#172033",
    shadow: "rgba(15, 23, 42, 0.24)",
  },
  {
    id: "neon",
    name: "Neon",
    description: "Jaskrawe barwy i elektryczna poświata.",
    rarity: "rare",
    unlockLabel: "Zdobądź 1000 punktów",
    palette: ["#00e5ff", "#39ff88", "#ff3cac", "#f5ff3b"],
    gradient: "linear-gradient(135deg, #00e5ff, #7c3aed)",
    border: "#dffcff",
    shadow: "rgba(0, 229, 255, 0.55)",
  },
  {
    id: "fire",
    name: "Ogień",
    description: "Gorący zestaw za mocną serię.",
    rarity: "epic",
    unlockLabel: "Seria 5 zwycięstw",
    palette: ["#ff5a1f", "#ff8a00", "#ef233c", "#ffd166"],
    border: "#4a1300",
    shadow: "rgba(255, 90, 31, 0.5)",
  },
  {
    id: "ice",
    name: "Lód",
    description: "Chłodna precyzja bez pomyłek.",
    rarity: "rare",
    unlockLabel: "10 plansz bez resetu",
    palette: ["#75d8ff", "#b5f5ec", "#90a7ff", "#e0fbfc"],
    border: "#164e63",
    shadow: "rgba(117, 216, 255, 0.45)",
  },
  {
    id: "gold",
    name: "Złota",
    description: "Nagroda za kompletowanie całych poziomów.",
    rarity: "legendary",
    unlockLabel: "Ukończ w całości 5 poziomów",
    palette: ["#f6c453", "#d89b1d", "#ffe08a", "#b7791f"],
    border: "#4d3500",
    shadow: "rgba(246, 196, 83, 0.55)",
  },
  {
    id: "director",
    name: "Dyrektor",
    description: "Czerń, złoto i najwyższy poziom presji.",
    rarity: "legendary",
    unlockLabel: "Pierwsze zaliczenie w trybie Dyrektor",
    palette: ["#101827", "#27364d", "#d4af37", "#f4d35e"],
    border: "#f4d35e",
    shadow: "rgba(212, 175, 55, 0.55)",
  },
  {
    id: "mow",
    name: "MOW",
    description: "Barwy oficjalnego znaku MOW w Malborku.",
    rarity: "epic",
    unlockLabel: "Zdobądź 1500 punktów",
    palette: ["#152233", "#f1cc09", "#22344a", "#ffd928"],
    border: "#f1cc09",
    shadow: "rgba(241, 204, 9, 0.42)",
  },
  {
    id: "group-master",
    name: "Mistrz grupy",
    description: "Zestaw lidera lokalnej rywalizacji.",
    rarity: "legendary",
    unlockLabel: "Zajmij 1. miejsce w rankingu tygodnia",
    palette: ["#6d28d9", "#0ea5e9", "#f59e0b", "#f8fafc"],
    border: "#ffffff",
    shadow: "rgba(109, 40, 217, 0.52)",
  },
  {
    id: "night",
    name: "Nocna",
    description: "Matowe kolory trudnych rozgrywek.",
    rarity: "epic",
    unlockLabel: "Zalicz 8 prób na +3 lub Dyrektor",
    palette: ["#334155", "#155e75", "#7e22ce", "#ca8a04"],
    border: "#94a3b8",
    shadow: "rgba(15, 23, 42, 0.65)",
  },
  {
    id: "tournament",
    name: "Turniejowa",
    description: "Sportowa paleta dla zwycięzców pojedynków.",
    rarity: "epic",
    unlockLabel: "Wygraj 5 pojedynków",
    palette: ["#2563eb", "#16a34a", "#dc2626", "#fbbf24"],
    border: "#f8fafc",
    shadow: "rgba(37, 99, 235, 0.5)",
  },
  {
    id: "custom",
    name: "Własna",
    description: "Lokalna grafika przycięta do kształtu klocków.",
    rarity: "rare",
    unlockLabel: "Dodaj własną bezpieczną teksturę",
    palette: ["#64748b", "#64748b", "#64748b", "#64748b"],
    border: "#f8fafc",
    shadow: "rgba(15, 23, 42, 0.4)",
  },
];

export const SKINS_BY_ID = Object.fromEntries(PIECE_SKINS.map((skin) => [skin.id, skin]));

export function unlockedSkinIds(context: SkinUnlockContext): string[] {
  const successful = context.attempts.filter(
    (attempt) => attempt.profileId === context.profile.id && attempt.success,
  );
  const duelWins = context.matches.filter(
    (match) => match.winnerProfileId === context.profile.id,
  ).length;
  const hardWins = successful.filter(
    (attempt) => attempt.grade === "+3" || attempt.grade === "Dyrektor",
  ).length;
  const noResetWins = successful.filter((attempt) => attempt.resets === 0).length;

  return PIECE_SKINS.filter((skin) => {
    switch (skin.id) {
      case "classic":
        return true;
      case "neon":
        return context.profile.totalPoints >= 1000;
      case "fire":
        return context.profile.winStreak >= 5;
      case "ice":
        return noResetWins >= 10;
      case "gold":
        return (context.fullLevels ?? 0) >= 5;
      case "director":
        return successful.some((attempt) => attempt.grade === "Dyrektor");
      case "mow":
        return context.profile.totalPoints >= 1500;
      case "group-master":
        return context.weeklyRank === 1 && successful.length > 0;
      case "night":
        return hardWins >= 8;
      case "tournament":
        return duelWins >= 5;
      case "custom":
        return context.hasCustomTexture === true;
      default:
        return false;
    }
  }).map((skin) => skin.id);
}
