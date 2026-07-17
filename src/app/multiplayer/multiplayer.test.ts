import { describe, expect, it } from "vitest";
import {
  canStartMultiplayer,
  clockOffsetMeasurement,
  clockOffsetSample,
  hostTimeToLocal,
  medianClockOffset,
  normalizeRoomCode,
  rankMultiplayerParticipants,
  roomCodeFromBytes,
  roomPeerId,
  stableClockOffset,
  type MultiplayerParticipant,
  type MultiplayerRoomSnapshot,
} from "./multiplayer";

function participant(
  id: string,
  ready: boolean,
  elapsedSeconds?: number,
): MultiplayerParticipant {
  return {
    id,
    nickname: id,
    ready,
    connected: true,
    result:
      elapsedSeconds === undefined
        ? null
        : {
            participantId: id,
            success: true,
            elapsedSeconds,
            remainingSeconds: 10,
            moves: 5,
            resets: 0,
            finishedAtHost: 1000 + elapsedSeconds,
          },
  };
}

function snapshot(participants: MultiplayerParticipant[]): MultiplayerRoomSnapshot {
  return {
    roomCode: "ABC234",
    hostParticipantId: "host",
    phase: "lobby",
    settings: { familyId: "gardner", levelIndex: 0, targetIndex: 0, socialGrade: "0" },
    participants,
    roundId: null,
    startAtHost: null,
    updatedAt: 100,
  };
}

describe("multiplayer protocol", () => {
  it("normalizes readable six-character room codes", () => {
    expect(normalizeRoomCode(" ab-o1z29 ")).toBe("ABZ29");
    expect(roomPeerId("AB C234")).toBe("mow-tpuzzle2-abc234");
    expect(roomCodeFromBytes([0, 1, 2, 3, 4, 5])).toHaveLength(6);
  });

  it("uses a median NTP-style clock offset and converts host time", () => {
    expect(clockOffsetSample(1000, 1100, 1070)).toBe(20);
    expect(medianClockOffset([21, 300, 19, 20, -200])).toBe(20);
    expect(hostTimeToLocal(5000, 20)).toBe(4980);
    expect(clockOffsetMeasurement(1000, 1100, 1070)).toEqual({
      offsetMs: 20,
      roundTripMs: 100,
    });
    expect(
      stableClockOffset([
        { offsetMs: 20, roundTripMs: 18 },
        { offsetMs: 21, roundTripMs: 20 },
        { offsetMs: 700, roundTripMs: 900 },
      ]),
    ).toBe(21);
  });

  it("requires at least two connected and ready players", () => {
    expect(canStartMultiplayer(snapshot([participant("host", true)]))).toBe(false);
    expect(canStartMultiplayer(snapshot([participant("host", true), participant("guest", false)]))).toBe(false);
    expect(canStartMultiplayer(snapshot([participant("host", true), participant("guest", true)]))).toBe(true);
  });

  it("ranks solved players by time and leaves unfinished players last", () => {
    const ranked = rankMultiplayerParticipants([
      participant("waiting", true),
      participant("slow", true, 24),
      participant("fast", true, 12),
    ]);
    expect(ranked.map((entry) => entry.id)).toEqual(["fast", "slow", "waiting"]);
  });
});
