"use strict";
import { IServer } from "../interfaces/Server";
import { WebSocketServer } from "ws";
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

export class Server {
  httpServer: http.Server;
  wsServer: WebSocketServer;
  on: boolean = false;
  port: number | null;
  private hostname: string | undefined;
  private connections = new Set<Socket>();

  constructor(hostname: string, port: number) {
    this.hostname = hostname;
    this.port = port;
    this.httpServer = http.createServer();
    this.wsServer = new WebSocketServer({ server: this.httpServer });
  }
  start(
    callback: (req: http.IncomingMessage, res: http.ServerResponse) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.httpServer.on("request", (req, res) => {
          if (callback) {
            callback(req, res);
          } else {
            res.end("No callback provided");
          }
        });

        this.httpServer.on("connection", (socket) => {
          this.connections.add(socket);
          socket.on("close", () => this.connections.delete(socket));
        });

        this.httpServer.on("error", (e: Error) => {
          reject(e);
        });

        this.wsServer.on("connection", (ws) => {
          ws.send(JSON.stringify({ type: "status", message: "connected" }));
        });

        this.wsServer.on("error", (e: Error) => {
          this.wsServer?.close();
          reject(e);
        });

        this.httpServer.listen({ port: this.port, host: this.hostname }, () => {
          this.on = true;
          ServerEvents.emit(ServerEventTypes.START, this.port);
          LoggerEvents.emit(LogEventTypes.INFO, {
            msg: "server started" + JSON.stringify(this.httpServer.address()),
          });
          resolve();
        });
      } catch (err) {
        this.stop();
        reject(err);
      }
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.httpServer || !this.on) {
        resolve();
        return;
      }

      // destroy all active connections
      for (const socket of this.connections) {
        socket.destroy();
      }
      this.connections.clear();

      this.httpServer.close(() => {
        this.on = false;
        this.port = null;
        ServerEvents.emit(ServerEventTypes.STOP);
        LoggerEvents.emit(LogEventTypes.INFO, { msg: "Server stopped" });
        resolve();
      });
    });
  }
}
