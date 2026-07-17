import type { SocialGrade } from "../../games/t-puzzle/progress";
import type { PuzzleFamilyId } from "../../games/t-puzzle/types";

export type MultiplayerRole = "host" | "guest";
export type MultiplayerConnectionStatus = "idle" | "connecting" | "connected" | "error";
export type MultiplayerPhase = "lobby" | "countdown" | "playing" | "finished";

export interface MultiplayerSettings {
  familyId: PuzzleFamilyId;
  levelIndex: number;
  targetIndex: number;
  socialGrade: SocialGrade;
}

export interface MultiplayerRoundResult {
  participantId: string;
  success: boolean;
  elapsedSeconds: number;
  remainingSeconds: number;
  moves: number;
  resets: number;
  finishedAtHost: number;
}

export interface MultiplayerParticipant {
  id: string;
  nickname: string;
  ready: boolean;
  connected: boolean;
  result: MultiplayerRoundResult | null;
}

export interface MultiplayerRoomSnapshot {
  roomCode: string;
  hostParticipantId: string;
  phase: MultiplayerPhase;
  settings: MultiplayerSettings;
  participants: MultiplayerParticipant[];
  roundId: string | null;
  startAtHost: number | null;
  updatedAt: number;
}

export interface PeerRoomState {
  role: MultiplayerRole | null;
  status: MultiplayerConnectionStatus;
  localParticipantId: string | null;
  snapshot: MultiplayerRoomSnapshot | null;
  clockOffsetMs: number;
  error: string | null;
}

export interface ClockOffsetMeasurement {
  offsetMs: number;
  roundTripMs: number;
}

export type ClientRoomMessage =
  | { type: "join"; participant: Pick<MultiplayerParticipant, "id" | "nickname"> }
  | { type: "ready"; participantId: string; ready: boolean }
  | { type: "result"; result: MultiplayerRoundResult }
  | { type: "ping"; participantId: string; clientSentAt: number };

export type HostRoomMessage =
  | { type: "snapshot"; snapshot: MultiplayerRoomSnapshot }
  | { type: "pong"; clientSentAt: number; hostNow: number }
  | { type: "room-closed"; reason: string };

const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizeRoomCode(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-HJ-NP-Z2-9]/g, "")
    .slice(0, 6);
}

export function roomPeerId(roomCode: string): string {
  return `mow-tpuzzle2-${normalizeRoomCode(roomCode).toLowerCase()}`;
}

export function roomCodeFromBytes(bytes: ArrayLike<number>): string {
  return Array.from({ length: 6 }, (_, index) => {
    const value = bytes[index % bytes.length] ?? index;
    return ROOM_ALPHABET[value % ROOM_ALPHABET.length];
  }).join("");
}

export function generateRoomCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return roomCodeFromBytes(bytes);
}

export function createRuntimeParticipantId(): string {
  return crypto.randomUUID?.() ?? `participant-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function sanitizeParticipantName(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, 24) || "Zawodnik";
}

export function clockOffsetSample(
  clientSentAt: number,
  clientReceivedAt: number,
  hostNow: number,
): number {
  return hostNow - (clientSentAt + (clientReceivedAt - clientSentAt) / 2);
}

export function clockOffsetMeasurement(
  clientSentAt: number,
  clientReceivedAt: number,
  hostNow: number,
): ClockOffsetMeasurement {
  return {
    offsetMs: clockOffsetSample(clientSentAt, clientReceivedAt, hostNow),
    roundTripMs: Math.max(0, clientReceivedAt - clientSentAt),
  };
}

export function medianClockOffset(samples: number[]): number {
  if (samples.length === 0) {
    return 0;
  }
  const sorted = [...samples].sort((first, second) => first - second);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

export function stableClockOffset(samples: ClockOffsetMeasurement[]): number {
  if (samples.length === 0) {
    return 0;
  }
  const lowLatencySamples = [...samples]
    .sort((first, second) => first.roundTripMs - second.roundTripMs)
    .slice(0, Math.min(5, samples.length));
  return medianClockOffset(lowLatencySamples.map((sample) => sample.offsetMs));
}

export function hostTimeToLocal(hostTimestamp: number, clockOffsetMs: number): number {
  return hostTimestamp - clockOffsetMs;
}

export function canStartMultiplayer(snapshot: MultiplayerRoomSnapshot): boolean {
  const connected = snapshot.participants.filter((participant) => participant.connected);
  return (
    snapshot.phase === "lobby" &&
    connected.length >= 2 &&
    connected.every((participant) => participant.ready)
  );
}

export function rankMultiplayerParticipants(
  participants: MultiplayerParticipant[],
): MultiplayerParticipant[] {
  return [...participants].sort((first, second) => {
    if (!first.result && !second.result) {
      return first.nickname.localeCompare(second.nickname, "pl");
    }
    if (!first.result) {
      return 1;
    }
    if (!second.result) {
      return -1;
    }
    if (first.result.success !== second.result.success) {
      return first.result.success ? -1 : 1;
    }
    return (
      first.result.elapsedSeconds - second.result.elapsedSeconds ||
      first.result.moves - second.result.moves ||
      first.result.resets - second.result.resets ||
      first.result.finishedAtHost - second.result.finishedAtHost
    );
  });
}

export function isClientRoomMessage(value: unknown): value is ClientRoomMessage {
  if (!value || typeof value !== "object" || !("type" in value)) {
    return false;
  }
  return ["join", "ready", "result", "ping"].includes(String(value.type));
}

export function isHostRoomMessage(value: unknown): value is HostRoomMessage {
  if (!value || typeof value !== "object" || !("type" in value)) {
    return false;
  }
  return ["snapshot", "pong", "room-closed"].includes(String(value.type));
}
