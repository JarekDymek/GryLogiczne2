import type { DataConnection, Peer, PeerOptions } from "peerjs";
import {
  canStartMultiplayer,
  clockOffsetMeasurement,
  generateRoomCode,
  hostTimeToLocal,
  isClientRoomMessage,
  isHostRoomMessage,
  stableClockOffset,
  normalizeRoomCode,
  roomPeerId,
  sanitizeParticipantName,
  type ClientRoomMessage,
  type ClockOffsetMeasurement,
  type HostRoomMessage,
  type MultiplayerParticipant,
  type MultiplayerRoomSnapshot,
  type MultiplayerRoundResult,
  type MultiplayerSettings,
  type PeerRoomState,
} from "./multiplayer";

type StateListener = (state: PeerRoomState) => void;

const INITIAL_STATE: PeerRoomState = {
  role: null,
  status: "idle",
  localParticipantId: null,
  snapshot: null,
  clockOffsetMs: 0,
  error: null,
};

function peerOptions(): PeerOptions {
  const host = import.meta.env.VITE_PEER_SERVER_HOST?.trim();
  if (!host) {
    return { debug: 0 };
  }
  const configuredPort = Number(import.meta.env.VITE_PEER_SERVER_PORT);
  return {
    debug: 0,
    host,
    port: Number.isFinite(configuredPort) && configuredPort > 0 ? configuredPort : 443,
    path: import.meta.env.VITE_PEER_SERVER_PATH?.trim() || "/",
    secure: import.meta.env.VITE_PEER_SERVER_SECURE !== "false",
    key: import.meta.env.VITE_PEER_SERVER_KEY?.trim() || undefined,
  };
}

function messageForPeerError(error: unknown): string {
  const typed = error as Error & { type?: string };
  switch (typed.type) {
    case "unavailable-id":
      return "Ten kod pokoju jest już zajęty. Utwórz nowy pokój.";
    case "peer-unavailable":
      return "Nie znaleziono pokoju. Sprawdź kod i czy host nadal jest online.";
    case "browser-incompatible":
      return "Ta przeglądarka nie obsługuje połączeń WebRTC.";
    case "network":
    case "socket-error":
    case "socket-closed":
      return "Utracono połączenie z usługą pokoi. Sprawdź internet.";
    default:
      return typed.message || "Nie udało się połączyć z pokojem.";
  }
}

function cloneSnapshot(snapshot: MultiplayerRoomSnapshot): MultiplayerRoomSnapshot {
  return {
    ...snapshot,
    settings: { ...snapshot.settings },
    participants: snapshot.participants.map((participant) => ({
      ...participant,
      result: participant.result ? { ...participant.result } : null,
    })),
  };
}

function safeResult(
  value: MultiplayerRoundResult,
  participantId: string,
  finishedAtHost: number,
): MultiplayerRoundResult {
  return {
    participantId,
    success: Boolean(value.success),
    elapsedSeconds: Math.max(0, Math.min(600, Number(value.elapsedSeconds) || 0)),
    remainingSeconds: Math.max(0, Math.min(600, Number(value.remainingSeconds) || 0)),
    moves: Math.max(0, Math.min(10000, Math.round(Number(value.moves) || 0))),
    resets: Math.max(0, Math.min(1000, Math.round(Number(value.resets) || 0))),
    finishedAtHost,
  };
}

export class PeerRoomClient {
  private peer: Peer | null = null;
  private hostConnection: DataConnection | null = null;
  private guestConnections = new Map<string, DataConnection>();
  private participantByPeer = new Map<string, string>();
  private listeners = new Set<StateListener>();
  private state: PeerRoomState = INITIAL_STATE;
  private pingTimer: number | null = null;
  private clockBurstTimers: number[] = [];
  private phaseTimer: number | null = null;
  private clockSamples: ClockOffsetMeasurement[] = [];
  private disposed = false;

  getState(): PeerRoomState {
    return this.state;
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private patchState(patch: Partial<PeerRoomState>) {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  private setSnapshot(snapshot: MultiplayerRoomSnapshot) {
    this.patchState({ snapshot: cloneSnapshot(snapshot), error: null });
  }

  private handlePeerError(error: unknown) {
    if (!this.disposed) {
      this.patchState({ status: "error", error: messageForPeerError(error) });
    }
  }

  async createRoom(
    participant: Pick<MultiplayerParticipant, "id" | "nickname">,
    settings: MultiplayerSettings,
  ): Promise<string> {
    this.leave();
    this.disposed = false;
    const roomCode = generateRoomCode();
    this.patchState({
      ...INITIAL_STATE,
      role: "host",
      status: "connecting",
      localParticipantId: participant.id,
    });
    const { Peer: PeerConstructor } = await import("peerjs");
    if (this.disposed) {
      throw new Error("Tworzenie pokoju zostało przerwane.");
    }
    const peer = new PeerConstructor(roomPeerId(roomCode), peerOptions());
    this.peer = peer;
    return new Promise((resolve, reject) => {
      let opened = false;
      peer.on("open", () => {
        opened = true;
        const snapshot: MultiplayerRoomSnapshot = {
          roomCode,
          hostParticipantId: participant.id,
          phase: "lobby",
          settings: { ...settings },
          participants: [
            {
              id: participant.id,
              nickname: sanitizeParticipantName(participant.nickname),
              ready: false,
              connected: true,
              result: null,
            },
          ],
          roundId: null,
          startAtHost: null,
          updatedAt: Date.now(),
        };
        this.setSnapshot(snapshot);
        this.patchState({ status: "connected" });
        resolve(roomCode);
      });
      peer.on("connection", (connection) => this.acceptGuest(connection));
      peer.on("disconnected", () => {
        if (!peer.destroyed) {
          this.patchState({ error: "Chwilowo utracono serwer pokoi. Aktywne połączenia pozostają w grze." });
          window.setTimeout(() => {
            if (!peer.destroyed && peer.disconnected) {
              try {
                peer.reconnect();
              } catch {
                // The next peer error provides a useful message.
              }
            }
          }, 1200);
        }
      });
      peer.on("error", (error) => {
        this.handlePeerError(error);
        if (!opened) {
          reject(new Error(messageForPeerError(error)));
        }
      });
    });
  }

  async joinRoom(
    roomCodeValue: string,
    participant: Pick<MultiplayerParticipant, "id" | "nickname">,
  ): Promise<void> {
    this.leave();
    this.disposed = false;
    const roomCode = normalizeRoomCode(roomCodeValue);
    if (roomCode.length !== 6) {
      throw new Error("Kod pokoju musi mieć 6 znaków.");
    }
    this.patchState({
      ...INITIAL_STATE,
      role: "guest",
      status: "connecting",
      localParticipantId: participant.id,
    });
    const { Peer: PeerConstructor } = await import("peerjs");
    if (this.disposed) {
      throw new Error("Dołączanie do pokoju zostało przerwane.");
    }
    const peer = new PeerConstructor(peerOptions());
    this.peer = peer;
    return new Promise((resolve, reject) => {
      let connected = false;
      peer.on("open", () => {
        const connection = peer.connect(roomPeerId(roomCode), {
          label: "mow-tpuzzle-room",
          reliable: true,
          serialization: "json",
          metadata: { participantId: participant.id },
        });
        this.hostConnection = connection;
        connection.on("open", () => {
          connected = true;
          this.patchState({ status: "connected" });
          connection.send({
            type: "join",
            participant: {
              id: participant.id,
              nickname: sanitizeParticipantName(participant.nickname),
            },
          } satisfies ClientRoomMessage);
          this.startClockSync();
          resolve();
        });
        connection.on("data", (message) => this.handleHostMessage(message));
        connection.on("close", () => {
          if (!this.disposed) {
            this.patchState({ status: "error", error: "Połączenie z hostem zostało zamknięte." });
          }
        });
        connection.on("error", (error) => {
          this.handlePeerError(error);
          if (!connected) {
            reject(new Error(messageForPeerError(error)));
          }
        });
      });
      peer.on("error", (error) => {
        this.handlePeerError(error);
        if (!connected) {
          reject(new Error(messageForPeerError(error)));
        }
      });
    });
  }

  private acceptGuest(connection: DataConnection) {
    connection.on("data", (message) => this.handleClientMessage(connection, message));
    connection.on("close", () => this.disconnectGuest(connection.peer));
    connection.on("error", () => this.disconnectGuest(connection.peer));
  }

  private handleClientMessage(connection: DataConnection, value: unknown) {
    if (this.state.role !== "host" || !isClientRoomMessage(value)) {
      return;
    }
    const message = value as ClientRoomMessage;
    if (message.type === "join") {
      if (
        !message.participant ||
        typeof message.participant.id !== "string" ||
        typeof message.participant.nickname !== "string"
      ) {
        return;
      }
      const snapshot = this.state.snapshot;
      if (!snapshot || (snapshot.phase !== "lobby" && !snapshot.participants.some((entry) => entry.id === message.participant.id))) {
        connection.send({ type: "room-closed", reason: "Runda już trwa." } satisfies HostRoomMessage);
        connection.close();
        return;
      }
      const existingConnected = snapshot.participants.filter((entry) => entry.connected);
      if (existingConnected.length >= 8 && !snapshot.participants.some((entry) => entry.id === message.participant.id)) {
        connection.send({ type: "room-closed", reason: "Pokój jest pełny." } satisfies HostRoomMessage);
        connection.close();
        return;
      }
      const participantId = message.participant.id.slice(0, 80);
      const existingParticipant = snapshot.participants.find(
        (entry) => entry.id === participantId,
      );
      if (
        participantId === snapshot.hostParticipantId ||
        existingParticipant?.connected
      ) {
        connection.send({
          type: "room-closed",
          reason: "Ten uczestnik jest już połączony z pokojem.",
        } satisfies HostRoomMessage);
        connection.close();
        return;
      }
      this.participantByPeer.set(connection.peer, participantId);
      this.guestConnections.set(participantId, connection);
      this.updateHostSnapshot((current) => {
        const existing = current.participants.find((entry) => entry.id === participantId);
        const participant: MultiplayerParticipant = {
          id: participantId,
          nickname: sanitizeParticipantName(message.participant.nickname),
          ready: existing?.ready ?? false,
          connected: true,
          result: existing?.result ?? null,
        };
        return {
          ...current,
          participants: existing
            ? current.participants.map((entry) => (entry.id === participantId ? participant : entry))
            : [...current.participants, participant],
        };
      });
      return;
    }

    const participantId = this.participantByPeer.get(connection.peer);
    if (!participantId) {
      return;
    }
    if (message.type === "ping" && Number.isFinite(message.clientSentAt)) {
      connection.send({
        type: "pong",
        clientSentAt: message.clientSentAt,
        hostNow: Date.now(),
      } satisfies HostRoomMessage);
      return;
    }
    if (message.type === "ready" && message.participantId === participantId) {
      this.setParticipantReady(participantId, Boolean(message.ready));
      return;
    }
    if (message.type === "result" && message.result?.participantId === participantId) {
      this.storeResult(safeResult(message.result, participantId, Date.now()));
    }
  }

  private handleHostMessage(value: unknown) {
    if (this.state.role !== "guest" || !isHostRoomMessage(value)) {
      return;
    }
    const message = value as HostRoomMessage;
    if (message.type === "snapshot" && message.snapshot?.roomCode) {
      this.setSnapshot(message.snapshot);
      return;
    }
    if (message.type === "pong") {
      const sample = clockOffsetMeasurement(message.clientSentAt, Date.now(), message.hostNow);
      this.clockSamples = [...this.clockSamples.slice(-6), sample];
      this.patchState({ clockOffsetMs: stableClockOffset(this.clockSamples) });
      return;
    }
    if (message.type === "room-closed") {
      this.patchState({ status: "error", error: message.reason || "Host zamknął pokój." });
      this.hostConnection?.close();
    }
  }

  private updateHostSnapshot(
    updater: (snapshot: MultiplayerRoomSnapshot) => MultiplayerRoomSnapshot,
  ) {
    const current = this.state.snapshot;
    if (this.state.role !== "host" || !current) {
      return;
    }
    const next = { ...updater(cloneSnapshot(current)), updatedAt: Date.now() };
    this.setSnapshot(next);
    this.broadcast({ type: "snapshot", snapshot: next });
  }

  private broadcast(message: HostRoomMessage) {
    for (const connection of this.guestConnections.values()) {
      if (connection.open) {
        connection.send(message);
      }
    }
  }

  private disconnectGuest(peerId: string) {
    const participantId = this.participantByPeer.get(peerId);
    this.participantByPeer.delete(peerId);
    if (!participantId) {
      return;
    }
    this.guestConnections.delete(participantId);
    this.updateHostSnapshot((snapshot) => ({
      ...snapshot,
      participants:
        snapshot.phase === "lobby"
          ? snapshot.participants.filter((participant) => participant.id !== participantId)
          : snapshot.participants.map((participant) =>
              participant.id === participantId
                ? { ...participant, connected: false, ready: false }
                : participant,
            ),
    }));
    this.finishRoundIfComplete();
  }

  private startClockSync() {
    this.stopClockSync();
    const sendPing = () => {
      if (this.hostConnection?.open && this.state.localParticipantId) {
        this.hostConnection.send({
          type: "ping",
          participantId: this.state.localParticipantId,
          clientSentAt: Date.now(),
        } satisfies ClientRoomMessage);
      }
    };
    sendPing();
    this.clockBurstTimers = [120, 320, 700, 1200].map((delay) =>
      window.setTimeout(sendPing, delay),
    );
    this.pingTimer = window.setInterval(sendPing, 2000);
  }

  private stopClockSync() {
    for (const timer of this.clockBurstTimers) {
      window.clearTimeout(timer);
    }
    this.clockBurstTimers = [];
    if (this.pingTimer !== null) {
      window.clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  setReady(ready: boolean) {
    const participantId = this.state.localParticipantId;
    if (!participantId || this.state.snapshot?.phase !== "lobby") {
      return;
    }
    if (this.state.role === "host") {
      this.setParticipantReady(participantId, ready);
    } else if (this.hostConnection?.open) {
      this.hostConnection.send({ type: "ready", participantId, ready } satisfies ClientRoomMessage);
    }
  }

  private setParticipantReady(participantId: string, ready: boolean) {
    this.updateHostSnapshot((snapshot) => ({
      ...snapshot,
      participants: snapshot.participants.map((participant) =>
        participant.id === participantId ? { ...participant, ready } : participant,
      ),
    }));
  }

  updateSettings(settings: MultiplayerSettings) {
    this.updateHostSnapshot((snapshot) =>
      snapshot.phase === "lobby"
        ? {
            ...snapshot,
            settings: { ...settings },
            participants: snapshot.participants.map((participant) => ({
              ...participant,
              ready: false,
            })),
          }
        : snapshot,
    );
  }

  startRound(): boolean {
    const snapshot = this.state.snapshot;
    if (this.state.role !== "host" || !snapshot || !canStartMultiplayer(snapshot)) {
      return false;
    }
    const startAtHost = Date.now() + 3200;
    const roundId = `round-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.updateHostSnapshot((current) => ({
      ...current,
      phase: "countdown",
      startAtHost,
      roundId,
      participants: current.participants.map((participant) => ({ ...participant, result: null })),
    }));
    if (this.phaseTimer !== null) {
      window.clearTimeout(this.phaseTimer);
    }
    this.phaseTimer = window.setTimeout(() => {
      this.updateHostSnapshot((current) =>
        current.roundId === roundId ? { ...current, phase: "playing" } : current,
      );
    }, Math.max(0, startAtHost - Date.now()));
    return true;
  }

  submitResult(result: Omit<MultiplayerRoundResult, "participantId" | "finishedAtHost">) {
    const participantId = this.state.localParticipantId;
    const snapshot = this.state.snapshot;
    if (!participantId || !snapshot?.roundId || snapshot.phase === "lobby") {
      return;
    }
    const finishedAtHost = Date.now() + this.state.clockOffsetMs;
    const completeResult = safeResult(
      { ...result, participantId, finishedAtHost },
      participantId,
      finishedAtHost,
    );
    if (this.state.role === "host") {
      this.storeResult(completeResult);
    } else if (this.hostConnection?.open) {
      this.hostConnection.send({ type: "result", result: completeResult } satisfies ClientRoomMessage);
    }
  }

  private storeResult(result: MultiplayerRoundResult) {
    this.updateHostSnapshot((snapshot) => ({
      ...snapshot,
      participants: snapshot.participants.map((participant) =>
        participant.id === result.participantId && !participant.result
          ? { ...participant, result }
          : participant,
      ),
    }));
    this.finishRoundIfComplete();
  }

  private finishRoundIfComplete() {
    const snapshot = this.state.snapshot;
    if (
      this.state.role === "host" &&
      snapshot &&
      (snapshot.phase === "countdown" || snapshot.phase === "playing") &&
      snapshot.participants.filter((entry) => entry.connected).every((entry) => entry.result)
    ) {
      this.updateHostSnapshot((current) => ({ ...current, phase: "finished" }));
    }
  }

  resetLobby() {
    if (this.phaseTimer !== null) {
      window.clearTimeout(this.phaseTimer);
      this.phaseTimer = null;
    }
    this.updateHostSnapshot((snapshot) => ({
      ...snapshot,
      phase: "lobby",
      roundId: null,
      startAtHost: null,
      participants: snapshot.participants.map((participant) => ({
        ...participant,
        ready: false,
        result: null,
      })),
    }));
  }

  startAtLocal(): number | null {
    const startAtHost = this.state.snapshot?.startAtHost;
    return startAtHost === null || startAtHost === undefined
      ? null
      : hostTimeToLocal(startAtHost, this.state.clockOffsetMs);
  }

  leave() {
    this.disposed = true;
    if (this.state.role === "host" && this.state.status === "connected") {
      this.broadcast({ type: "room-closed", reason: "Host zamknął pokój." });
    }
    this.stopClockSync();
    if (this.phaseTimer !== null) {
      window.clearTimeout(this.phaseTimer);
      this.phaseTimer = null;
    }
    this.hostConnection?.close();
    for (const connection of this.guestConnections.values()) {
      connection.close();
    }
    this.peer?.destroy();
    this.peer = null;
    this.hostConnection = null;
    this.guestConnections.clear();
    this.participantByPeer.clear();
    this.clockSamples = [];
    this.state = INITIAL_STATE;
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}
