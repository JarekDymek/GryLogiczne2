import {
  MENTOR_EVENTS,
  MENTOR_MEDIA_TYPES,
  MENTOR_REACTION_CATEGORIES,
  type Mentor,
  type MentorEvent,
  type MentorEventAssignment,
  type MentorPlayerContext,
  type MentorPresentation,
  type MentorReaction,
  type MentorRoundContext,
  type MentorSettings,
  type MentorUnlockRule,
} from "./types";

const BUILT_IN_DATE = "2026-07-21T00:00:00.000Z";

function reaction(
  mentorId: string,
  id: string,
  category: MentorReaction["category"],
  label: string,
  title: string,
  subtitle: string,
  effectId: string,
): MentorReaction {
  return {
    id,
    mentorId,
    label,
    title,
    subtitle,
    category,
    mediaType: "image",
    enabled: true,
    weight: 1,
    effectId,
  };
}

export const DEFAULT_MENTORS: Mentor[] = [
  {
    id: "mentor-fokus",
    name: "fokus",
    displayName: "Kapitan Fokus",
    description: "Spokojny strateg. Zauważa dokładność, cierpliwość i postęp.",
    avatarUrl: "mentors/fokus.svg",
    enabled: true,
    isDefault: true,
    allowedForPlayers: true,
    source: "built-in",
    unlock: { type: "always", value: 0, label: "Dostępny od początku" },
    reactions: [
      reaction("mentor-fokus", "fokus-success", "success", "Pewny gest", "Dobra robota!", "Kształt jest zgodny. Zachowałeś koncentrację.", "mentor-nod"),
      reaction("mentor-fokus", "fokus-record", "record", "Salut", "Nowy rekord", "Precyzja i tempo zadziałały razem.", "mentor-salute"),
      reaction("mentor-fokus", "fokus-level", "level-up", "Wskazanie drogi", "Droga otwarta", "Kolejny poziom jest już dostępny.", "mentor-point"),
      reaction("mentor-fokus", "fokus-failure", "failure", "Spokojny oddech", "Jeszcze jedna próba", "Układ był blisko. Zmień jeden krok i spróbuj ponownie.", "mentor-breathe"),
      reaction("mentor-fokus", "fokus-director", "director", "Honorowy salut", "Poziom Dyrektora", "Piętnaście sekund. To była pełna kontrola.", "mentor-salute"),
    ],
    createdAt: BUILT_IN_DATE,
    updatedAt: BUILT_IN_DATE,
  },
  {
    id: "mentor-iskra",
    name: "iskra",
    displayName: "Trener Iskra",
    description: "Energiczna mentorka, która wzmacnia odwagę i dobre tempo.",
    avatarUrl: "mentors/iskra.svg",
    enabled: true,
    isDefault: false,
    allowedForPlayers: true,
    source: "built-in",
    unlock: { type: "wins", value: 3, label: "Wygraj 3 rundy" },
    reactions: [
      reaction("mentor-iskra", "iskra-success", "success", "Pięść w górę", "Jest moc!", "Cztery klocki, jeden zdecydowany ruch do celu.", "mentor-punch"),
      reaction("mentor-iskra", "iskra-record", "record", "Błysk", "Rekord pobity!", "To tempo zasługuje na powtórkę.", "mentor-flash"),
      reaction("mentor-iskra", "iskra-level", "level-up", "Skok", "Nowe wyzwanie", "Wchodzisz poziom wyżej. Jedziemy dalej.", "mentor-jump"),
      reaction("mentor-iskra", "iskra-failure", "motivation", "Gotowość", "Nie odpuszczaj", "Czas minął, ale pomysł już masz. Następna próba będzie lepsza.", "mentor-ready"),
      reaction("mentor-iskra", "iskra-team", "team-win", "Wspólna piątka", "Drużyna wygrywa", "Dobre decyzje i współpraca dały wynik.", "mentor-high-five"),
    ],
    createdAt: BUILT_IN_DATE,
    updatedAt: BUILT_IN_DATE,
  },
  {
    id: "mentor-strateg",
    name: "strateg",
    displayName: "Strateg MOW",
    description: "Wymagający, rzeczowy mentor dla bardziej zaawansowanych graczy.",
    avatarUrl: "mentors/strateg.svg",
    enabled: true,
    isDefault: false,
    allowedForPlayers: true,
    source: "built-in",
    unlock: { type: "experience-level", value: 3, label: "Osiągnij poziom 3" },
    reactions: [
      reaction("mentor-strateg", "strateg-success", "success", "Potwierdzenie", "Plan wykonany", "Rozwiązanie jest poprawne i uporządkowane.", "mentor-nod"),
      reaction("mentor-strateg", "strateg-record", "power", "Analiza", "Przewaga potwierdzona", "Nowy rekord pokazuje, że metoda działa.", "mentor-scan"),
      reaction("mentor-strateg", "strateg-level", "level-up", "Rozkaz", "Następny etap", "Poziom odblokowany. Czas na trudniejszy układ.", "mentor-point"),
      reaction("mentor-strateg", "strateg-failure", "warning", "Korekta", "Zmień strategię", "Nie przyspieszaj na siłę. Najpierw znajdź krawędzie wspólne.", "mentor-think"),
      reaction("mentor-strateg", "strateg-director", "director", "Uznanie", "Standard Dyrektora", "Najwyższy próg został osiągnięty.", "mentor-salute"),
    ],
    createdAt: BUILT_IN_DATE,
    updatedAt: BUILT_IN_DATE,
  },
];

export function defaultMentorSettings(): MentorSettings {
  return { eventAssignments: {} };
}

function stringValue(value: unknown, fallback: string, maxLength = 160): string {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, maxLength)
    : fallback;
}

function positiveWeight(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0.1, Math.min(20, value))
    : 1;
}

function normalizeReaction(value: unknown, mentorId: string, index: number): MentorReaction {
  const source = value && typeof value === "object" ? (value as Partial<MentorReaction>) : {};
  const category = MENTOR_REACTION_CATEGORIES.includes(source.category as MentorReaction["category"])
    ? (source.category as MentorReaction["category"])
    : "neutral";
  const mediaType = MENTOR_MEDIA_TYPES.includes(source.mediaType as MentorReaction["mediaType"])
    ? (source.mediaType as MentorReaction["mediaType"])
    : "image";
  return {
    id: stringValue(source.id, `${mentorId}-reaction-${index + 1}`, 80),
    mentorId,
    label: stringValue(source.label, `Reakcja ${index + 1}`, 60),
    title: stringValue(source.title, "Działaj dalej", 80),
    subtitle: stringValue(source.subtitle, "Każda próba buduje doświadczenie.", 220),
    category,
    mediaType,
    mediaUrl: typeof source.mediaUrl === "string" ? source.mediaUrl.slice(0, 2000) : undefined,
    sprite: source.sprite,
    soundId: typeof source.soundId === "string" ? source.soundId.slice(0, 80) : undefined,
    effectId: typeof source.effectId === "string" ? source.effectId.slice(0, 80) : undefined,
    enabled: source.enabled !== false,
    weight: positiveWeight(source.weight),
  };
}

function normalizeUnlock(value: unknown): MentorUnlockRule {
  const source = value && typeof value === "object" ? (value as Partial<MentorUnlockRule>) : {};
  const type = ["always", "wins", "experience-level"].includes(source.type ?? "")
    ? (source.type as MentorUnlockRule["type"])
    : "always";
  const valueNumber = typeof source.value === "number" && Number.isFinite(source.value)
    ? Math.max(0, Math.trunc(source.value))
    : 0;
  return {
    type,
    value: valueNumber,
    label: stringValue(source.label, type === "always" ? "Dostępny od początku" : "Do odblokowania", 100),
  };
}

function normalizeMentor(value: unknown, fallback: Mentor): Mentor {
  const source = value && typeof value === "object" ? (value as Partial<Mentor>) : {};
  const id = stringValue(source.id, fallback.id, 80);
  const rawReactions = Array.isArray(source.reactions) ? source.reactions : fallback.reactions;
  const reactions = rawReactions.map((entry, index) => normalizeReaction(entry, id, index));
  return {
    ...fallback,
    id,
    name: stringValue(source.name, fallback.name, 60),
    displayName: stringValue(source.displayName, fallback.displayName, 80),
    description: typeof source.description === "string" ? source.description.trim().slice(0, 240) : fallback.description,
    avatarUrl: stringValue(source.avatarUrl, fallback.avatarUrl, 2000),
    spriteSheetUrl: typeof source.spriteSheetUrl === "string" ? source.spriteSheetUrl.slice(0, 2000) : undefined,
    spriteColumns: typeof source.spriteColumns === "number" ? Math.max(1, Math.trunc(source.spriteColumns)) : undefined,
    spriteRows: typeof source.spriteRows === "number" ? Math.max(1, Math.trunc(source.spriteRows)) : undefined,
    enabled: source.enabled !== false,
    isDefault: source.isDefault === true,
    allowedForPlayers: source.allowedForPlayers !== false,
    source: source.source === "custom" ? "custom" : fallback.source,
    unlock: normalizeUnlock(source.unlock ?? fallback.unlock),
    reactions: reactions.length > 0 ? reactions : fallback.reactions,
    createdAt: stringValue(source.createdAt, fallback.createdAt, 60),
    updatedAt: stringValue(source.updatedAt, fallback.updatedAt, 60),
  };
}

export function normalizeMentors(value: unknown): Mentor[] {
  const stored = Array.isArray(value) ? value : [];
  const storedById = new Map(
    stored
      .filter((entry): entry is Partial<Mentor> => Boolean(entry && typeof entry === "object"))
      .map((entry) => [entry.id, entry]),
  );
  const builtIns = DEFAULT_MENTORS.map((mentor) => normalizeMentor(storedById.get(mentor.id), mentor));
  const custom = stored
    .filter((entry) => {
      const id = entry && typeof entry === "object" ? (entry as Partial<Mentor>).id : undefined;
      return typeof id === "string" && !DEFAULT_MENTORS.some((mentor) => mentor.id === id);
    })
    .map((entry, index) => {
      const timestamp = new Date().toISOString();
      const fallback: Mentor = {
        id: `mentor-custom-${index + 1}`,
        name: `mentor-${index + 1}`,
        displayName: `Mentor ${index + 1}`,
        avatarUrl: "mentors/fokus.svg",
        enabled: true,
        isDefault: false,
        allowedForPlayers: true,
        source: "custom",
        unlock: { type: "always", value: 0, label: "Dostępny od początku" },
        reactions: [reaction(`mentor-custom-${index + 1}`, `custom-${index + 1}-neutral`, "neutral", "Powitanie", "Działaj dalej", "Każda próba buduje doświadczenie.", "mentor-nod")],
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      return normalizeMentor(entry, fallback);
    });
  return [...builtIns, ...custom];
}

export function normalizeMentorSettings(value: unknown, mentors: Mentor[]): MentorSettings {
  const source = value && typeof value === "object" ? (value as Partial<MentorSettings>) : {};
  const rawAssignments = source.eventAssignments && typeof source.eventAssignments === "object"
    ? source.eventAssignments
    : {};
  const mentorIds = new Set(mentors.map((mentor) => mentor.id));
  const eventAssignments: MentorSettings["eventAssignments"] = {};
  for (const event of MENTOR_EVENTS) {
    const assignment = rawAssignments[event] as MentorEventAssignment | undefined;
    if (!assignment || !mentorIds.has(assignment.mentorId)) {
      continue;
    }
    const mentor = mentors.find((entry) => entry.id === assignment.mentorId);
    eventAssignments[event] = {
      mentorId: assignment.mentorId,
      reactionId: mentor?.reactions.some((entry) => entry.id === assignment.reactionId)
        ? assignment.reactionId
        : undefined,
    };
  }
  return { eventAssignments };
}

export function isMentorUnlocked(mentor: Mentor, player: Pick<MentorPlayerContext, "wins" | "experienceLevel">): boolean {
  if (mentor.unlock.type === "wins") {
    return player.wins >= mentor.unlock.value;
  }
  if (mentor.unlock.type === "experience-level") {
    return player.experienceLevel >= mentor.unlock.value;
  }
  return true;
}

export function mentorEventForRound(context: MentorRoundContext): MentorEvent {
  if (!context.success) {
    return "round-failure";
  }
  if (context.teamWin) {
    return "team-win";
  }
  if (context.directorGrade) {
    return "director-success";
  }
  if (context.nextLevelUnlocked) {
    return "level-unlocked";
  }
  if (context.personalBest) {
    return "personal-record";
  }
  return "round-success";
}

const EVENT_CATEGORIES: Record<MentorEvent, MentorReaction["category"][]> = {
  "round-success": ["success", "power", "neutral"],
  "personal-record": ["record", "power", "success"],
  "level-unlocked": ["level-up", "success", "power"],
  "round-failure": ["motivation", "failure", "warning", "neutral"],
  "director-success": ["director", "power", "record", "success"],
  "team-win": ["team-win", "success", "power"],
};

function weightedChoice<T extends { weight: number }>(entries: T[], random: () => number): T | undefined {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  if (total <= 0) {
    return entries[0];
  }
  let cursor = Math.min(0.999999, Math.max(0, random())) * total;
  for (const entry of entries) {
    cursor -= entry.weight;
    if (cursor <= 0) {
      return entry;
    }
  }
  return entries.at(-1);
}

function matchingReactions(mentor: Mentor, event: MentorEvent): MentorReaction[] {
  const categories = EVENT_CATEGORIES[event];
  const enabled = mentor.reactions.filter((entry) => entry.enabled);
  for (const category of categories) {
    const matches = enabled.filter((entry) => entry.category === category);
    if (matches.length > 0) {
      return matches;
    }
  }
  return enabled;
}

export function resolveMentorPresentation({
  mentors,
  settings,
  player,
  round,
  random = Math.random,
}: {
  mentors: Mentor[];
  settings: MentorSettings;
  player: MentorPlayerContext;
  round: MentorRoundContext;
  random?: () => number;
}): MentorPresentation | null {
  const event = mentorEventForRound(round);
  const eligible = mentors.filter(
    (mentor) => mentor.enabled && mentor.allowedForPlayers && isMentorUnlocked(mentor, player),
  );
  if (eligible.length === 0) {
    return null;
  }
  const assignment = settings.eventAssignments[event];
  const assignedMentor = assignment
    ? eligible.find((mentor) => mentor.id === assignment.mentorId)
    : undefined;
  const selectedMentor = eligible.find((mentor) => mentor.id === player.activeMentorId);
  const mentor = assignedMentor ?? (
    player.mentorMode === "random"
      ? eligible[Math.min(eligible.length - 1, Math.floor(Math.max(0, random()) * eligible.length))]
      : selectedMentor ?? eligible.find((entry) => entry.isDefault) ?? eligible[0]
  );
  const forcedReaction = assignment?.reactionId
    ? mentor.reactions.find((entry) => entry.id === assignment.reactionId && entry.enabled)
    : undefined;
  const reaction = forcedReaction ?? weightedChoice(matchingReactions(mentor, event), random);
  return reaction ? { event, mentor, reaction } : null;
}

export function createCustomMentor(index: number): Mentor {
  const timestamp = new Date().toISOString();
  const id = `mentor-custom-${Date.now()}-${index}`;
  return {
    id,
    name: `mentor-${index}`,
    displayName: `Nowy mentor ${index}`,
    description: "Własna postać wspierająca graczy po zakończeniu rundy.",
    avatarUrl: "mentors/fokus.svg",
    enabled: true,
    isDefault: false,
    allowedForPlayers: true,
    source: "custom",
    unlock: { type: "always", value: 0, label: "Dostępny od początku" },
    reactions: [
      reaction(id, `${id}-success`, "success", "Gratulacje", "Dobra robota!", "Plansza została ukończona.", "mentor-nod"),
      reaction(id, `${id}-motivation`, "motivation", "Wsparcie", "Spróbuj ponownie", "Masz już część rozwiązania. Działaj dalej.", "mentor-ready"),
    ],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
