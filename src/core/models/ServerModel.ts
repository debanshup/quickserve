"use strict";
import { WebSocketServer } from "ws";
import * as http from "http";
import * as https from "https";
import { Socket } from "net";
import {
  ServerEventTypes,
  ServerEvents,
} from "./observer/server_observer/serverEventEmitter";
import {
  LogEventTypes,
  LoggerEvents,
} from "./observer/log_observer/logEventEmitter";

import { ERROR_MESSAGES } from "../../constants/errorMessages";
import { CertManager } from "../certificate-manager/CertManager";
export class Server {
  wsServer: WebSocketServer | undefined;
  on: boolean = false;
  port: number | undefined;
  private server: http.Server | https.Server;
  private hostname: string | undefined;
  private connections = new Set<Socket>();
  private startTime = performance.now();

  static async create(
    hostname: string,
    port: number,
    protocol: "http:" | "https:",
    sslConfig: { certPath: string; keyPath: string },
  ) {
    let server: http.Server | https.Server;

    if (protocol === "https:") {
      const { cert, key } = await CertManager.getCert(sslConfig);
      server = https.createServer({
        cert,
        key,
        keepAlive: true,
      });
    } else {
      server = http.createServer({
        keepAlive: true,
      });
    }
    return new Server(hostname, port, server);
  }

  private constructor(
    hostname: string,
    port: number,
    server: http.Server | https.Server,
  ) {
    this.wsServer = new WebSocketServer({ server });
    this.hostname = hostname;
    this.port = port;
    this.server = server;
  }

  start(
    callback: (req: http.IncomingMessage, res: http.ServerResponse) => void,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        throw Error(ERROR_MESSAGES.NO_SERVER);
      }
      try {
        this.server.on("connection", (socket) => {
          this.connections.add(socket);
          socket.on("close", () => this.connections.delete(socket));
          socket.on("error", () => this.connections.delete(socket));
        });
        this.server.on("request", (req, res) => {
          if (callback) {
            callback(req, res);
          } else {
            res.end("No callback provided");
          }
        });
        this.server.on("upgrade", (req, socket, head) => {
          console.info("upgrade");
          // this.wsServer?.handleUpgrade(req, socket, head, (client, req) => {
          //   this.wsServer?.emit("connection", client, req);
          // });
        });

        this.server.on("error", (e: Error) => {
          reject(e);
        });
        // const httpPort = await getAvailablePort()
        this.server.listen({ port: this.port, host: this.hostname }, () => {
          this.on = true;
          ServerEvents.emit(ServerEventTypes.START, this.port);
          LoggerEvents.emit(LogEventTypes.INFO, {
            msg: "server started" + JSON.stringify(this.server!.address()),
          });
          const end = performance.now();
          console.info("cold start time:", end - this.startTime);
          resolve();
        });

        this.wsServer!.on("connection", (ws, req) => {
          // console.info("req url::", req.url);
          const url = new URL(req.url!, "http://localhost");
          const page = url.searchParams.get("page");
          (ws as any).page = page;
          // console.info("Req url::", (ws as any).page);
          console.info("page::", page);
          ws.send(JSON.stringify({ type: "status", message: "connected" }));
        });

        this.wsServer!.on("error", (e: Error) => {
          this.wsServer?.close();
          reject(e);
        });
      } catch (err) {
        this.stop();
        reject(err);
      }
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.server) {
        resolve();
        return;
      }

      // destroy all active connections
      for (const socket of this.connections) {
        socket.destroy();
      }
      this.connections.clear();

      this.server.close(() => {
        this.on = false;
        this.port = undefined;
        ServerEvents.emit(ServerEventTypes.STOP);
        LoggerEvents.emit(LogEventTypes.INFO, { msg: "Server stopped" });
        resolve();
      });
    });
  }
}
