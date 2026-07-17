import { useCallback, useEffect, useRef, useState } from "react";
import type { MultiplayerParticipant, MultiplayerRoundResult, MultiplayerSettings } from "./multiplayer";
import { PeerRoomClient } from "./peerRoom";

export function usePeerRoom() {
  const clientRef = useRef<PeerRoomClient | null>(null);
  if (!clientRef.current) {
    clientRef.current = new PeerRoomClient();
  }
  const client = clientRef.current;
  const [state, setState] = useState(client.getState());

  useEffect(() => {
    const unsubscribe = client.subscribe(setState);
    return () => {
      unsubscribe();
      client.leave();
    };
  }, [client]);

  return {
    state,
    createRoom: useCallback(
      (participant: Pick<MultiplayerParticipant, "id" | "nickname">, settings: MultiplayerSettings) =>
        client.createRoom(participant, settings),
      [client],
    ),
    joinRoom: useCallback(
      (code: string, participant: Pick<MultiplayerParticipant, "id" | "nickname">) =>
        client.joinRoom(code, participant),
      [client],
    ),
    setReady: useCallback((ready: boolean) => client.setReady(ready), [client]),
    updateSettings: useCallback((settings: MultiplayerSettings) => client.updateSettings(settings), [client]),
    startRound: useCallback(() => client.startRound(), [client]),
    submitResult: useCallback(
      (result: Omit<MultiplayerRoundResult, "participantId" | "finishedAtHost">) =>
        client.submitResult(result),
      [client],
    ),
    resetLobby: useCallback(() => client.resetLobby(), [client]),
    startAtLocal: useCallback(() => client.startAtLocal(), [client]),
    leave: useCallback(() => client.leave(), [client]),
  };
}
