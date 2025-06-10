"use strict";
import { Server } from "../types/Server";
import * as http from "http";
import { Socket } from "net";
import {
  ServerEventTypes,
  ServerEvents,
} from "./observer/server_observer/serverEventEmitter";
import {
  LogEventTypes,
  LoggerEvents,
} from "./observer/log_observer/logEventEmitter";

export class HTTPServer implements Server {
  server?: http.Server;
  on: boolean = false;
  port: number | null;
  private hostname: string | undefined;
  private connections = new Set<Socket>();

  constructor(port: number, hostname: string) {
    this.port = port;
    this.hostname = hostname;
  }
  start(
    callback?: (req: http.IncomingMessage, res: http.ServerResponse) => void
  ): void {
    try {
      this.server = http.createServer((req, res) => {
        // callback function...
        if (callback) {
          callback(req, res);
        } else {
          res.end("No callback provided");
        }
      });

      // tracking app connection
      this.server.on("connection", (socket) => {
        this.connections.add(socket);
        socket.on("close", () => this.connections.delete(socket));
      });

      this.server.listen(this.port!, this.hostname, () => {
        this.on = true;
        ServerEvents.emit(ServerEventTypes.START, this.port);
        // console.log(`server started at port: ${this.port}, hostname: ${this.hostname}`);
      });
    } catch (error) {
      ServerEvents.emit(ServerEventTypes.ERROR);
      throw error;
    }
  }
  stop() {
    if (this.server && this.on) {
      // destroying all connection
      for (const socket of this.connections) {
        socket.destroy();
      }
      this.server?.close(() => {
        this.on = false;
        this.port = null;
        ServerEvents.emit(ServerEventTypes.STOP);
        LoggerEvents.emit(LogEventTypes.INFO, { msg: "Server stopped" });
      });
      LoggerEvents.emit(LogEventTypes.DEBUG, {
        msg: `${this.connections.size} active connection(s)`,
      });
    }
  }
}
