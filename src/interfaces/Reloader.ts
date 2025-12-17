import { WebSocketServer } from "ws";
import http from "http";

export interface Reloader {
  on: boolean;
  start(server: http.Server): WebSocketServer;
  stop(): void;
}
