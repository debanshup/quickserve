import { WebSocketServer } from "ws";
import http from "http";
import { Reloader } from "../interfaces/Reloader";
export class DocReloader implements Reloader {
  private wss?: WebSocketServer = undefined;
  on: boolean = false;
  start(server: http.Server): WebSocketServer {
    if (!this.wss) {
      this.wss = new WebSocketServer({
        server,
        noServer: false,
        port: undefined,
      });
    }
    this.wss.on("connection", (ws) => {
      ws.send(JSON.stringify({ type: "status", message: "connected" }));
    });
    this.wss.on("error", (e: Error) => {
      this.wss?.close();
      console.error("WS error", e);
    });

    this.on = true;
    return this.wss;
  }
  stop() {
    if (this.wss && this.on) {
      this.wss?.close();
      this.on = false;
      this.wss = undefined;
    }
  }
}
