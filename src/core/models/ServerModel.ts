"use strict";
import { Performance } from "perf_hooks";
import { WebSocketServer } from "ws";
import * as http from "http";
import * as https from "https";
import { Socket } from "net";
import fs from "fs";
import {
  ServerEventTypes,
  ServerEvents,
} from "./observer/server_observer/serverEventEmitter";
import {
  LogEventTypes,
  LoggerEvents,
} from "./observer/log_observer/logEventEmitter";
import path from "path";
 
import selfsigned from "selfsigned";
import { createPrivateKey, createPublicKey, X509Certificate } from "crypto";
import { ERROR_MESSAGES } from "../../consatnts/errorMessages";
import { PATH } from "../../consatnts/path";
export class Server {
  wsServer: WebSocketServer | undefined;
  on: boolean = false;
  port: number | undefined;
  private server: http.Server | https.Server;
  private hostname: string | undefined;
  private connections = new Set<Socket>();
  private startTime = performance.now();

  private static isCertValid(certPath: string, keyPath: string) {
    try {
      const certPem = fs.readFileSync(certPath);
      const keyPem = fs.readFileSync(keyPath);
      const cert = new X509Certificate(certPem);
      const expiry = new Date(cert.validTo);
      if (expiry <= new Date()) {
        return { status: false, msg: ERROR_MESSAGES.CERT_EXPIRED };
      }

      const certPublicKey = cert.publicKey.export({
        type: "spki",
        format: "pem",
      });
      const privateKey = createPrivateKey(keyPem);
      const derivedPublicKey = createPublicKey(privateKey).export({
        type: "spki",
        format: "pem",
      });

      if (certPublicKey !== derivedPublicKey) {
        return {
          status: false,
          msg: ERROR_MESSAGES.CERT_BINDING_ERROR,
        };
      }

      return { status: true, msg: "Certificate is valid." };
    } catch (error) {
      return { status: false, msg: ERROR_MESSAGES.CERT_FORMAT_ERROR};
    }
  }

  private static async getCert(sslConfig: {
    certPath: string;
    keyPath: string;
  }) {
    const certDir = PATH.CERT_DIR;
    if (!fs.existsSync(certDir)) {
      fs.mkdirSync(certDir);
    }
    let certPath;
    let keyPath;

    const isCustomConfig = sslConfig?.certPath && sslConfig?.keyPath;
    const isPartialConfig =
      (sslConfig?.certPath && !sslConfig?.keyPath) ||
      (!sslConfig?.certPath && sslConfig?.keyPath);
    if (isCustomConfig) {
      certPath = sslConfig.certPath;
      keyPath = sslConfig.keyPath;
      const { status, msg } = Server.isCertValid(certPath, keyPath);
      if (status === false) {
        throw Error(msg);
      }
      return { cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) };
    } else {
      if (isPartialConfig) {
        throw new Error(ERROR_MESSAGES.SSL_CONFIG_ERROR);
      }
      console.info("No custom SSL config provided, using defaults.");
      certPath = path.join(certDir, "cert.pem");
      keyPath = path.join(certDir, "key.pem");
      const { status, msg } = Server.isCertValid(certPath, keyPath);
      console.info(msg);
      if (status === true) {
        return {
          cert: fs.readFileSync(certPath),
          key: fs.readFileSync(keyPath),
        };
      } else {
        const pems = await selfsigned.generate(
          [{ name: "commonName", value: "localhost" }],
          {
            extensions: [
              {
                name: "basicConstraints",
                cA: false,
              },
              // EKU
              {
                name: "extKeyUsage",
                serverAuth: true,
              },
              {
                name: "keyUsage",
                digitalSignature: true,
                keyEncipherment: true,
              },
              {
                name: "subjectAltName",
                altNames: [
                  { type: 2, value: "localhost" }, // DNS
                  { type: 7, ip: "127.0.0.1" }, // IPv4
                  { type: 7, ip: "::1" }, // IPv6
                ],
              },
            ],
          },
        );

        fs.writeFileSync(certPath, pems.cert);
        fs.writeFileSync(keyPath, pems.private);
        return { cert: pems.cert, key: pems.private };
      }
    }
  }

  static async create(
    hostname: string,
    port: number,
    protocol: "http:" | "https:",
    sslConfig: { certPath: string; keyPath: string },
  ) {
    let server: http.Server | https.Server;

    if (protocol === "https:") {
      const { cert, key } = await Server.getCert(sslConfig);
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
    this.wsServer = new WebSocketServer({ noServer: true });
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
          this.wsServer?.handleUpgrade(req, socket, head, (client, req) => {
            this.wsServer?.emit("connection", client, req);
          });
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

        this.wsServer!.on("connection", (ws) => {
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
