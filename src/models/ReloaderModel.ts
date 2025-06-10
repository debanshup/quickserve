import { WebSocketServer } from "ws";
import { Reloader } from "../types/Reloader";
export class DocReloader implements Reloader {
  private wss?: WebSocketServer;
  on: boolean = false;
  start(port: number): WebSocketServer {
    this.wss = new WebSocketServer({ port });
    this.wss.on("connection", (ws) => {
      ws.send(JSON.stringify({ type: "status", message: "connected" }));
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
