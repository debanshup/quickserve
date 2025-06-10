import { WebSocketServer } from "ws";

export interface Reloader {
  on: boolean;
  start(port: number): WebSocketServer;
  stop(): void;
}
