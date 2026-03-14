import WebSocket from "ws";

export interface ClientState {
  page: string | null;
}

export const clientRegistry = new WeakMap<WebSocket, ClientState>();
