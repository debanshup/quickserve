import vscode from "vscode";
import { WebSocketServer } from "ws";
import { StatusbarUI } from "../StatusBarUI";
import { Config } from "../utils/config";
import { HOST } from "../consatnts/host";

import { ServerObserver } from "../core/models/observer/server_observer/ServerObserverModel";
import { LogObserver } from "../core/models/observer/log_observer/LogObserverModel";

import parse from "node-html-parser";
import { pipeline } from "stream/promises";
import {
  LoggerEvents,
  LogEventTypes,
} from "../core/models/observer/log_observer/logEventEmitter";
import {
  ServerEvents,
  ServerEventTypes,
} from "../core/models/observer/server_observer/serverEventEmitter";
import { FileWatcher } from "../core/models/WatcherModel";
import { Server } from "../core/models/ServerModel";
import {
  getCurrentDir,
  isFolder,
  getCurrentFile,
  getHost,
  getAvailablePort,
  listFilesRecursive,
  getFileBrowserUi,
  getFileExtension,
  processFilesafely,
  supportsScriptInjection,
  getReloadScript,
  getStatusCode,
  getErrorPage,
  getRelativeFilePath,
  getLocalIP,
  getConnectionURI,
} from "../utils/helper";
import path from "path";
import { fileCache } from "../cache/FileCache";
const { getAutoReloadEnabled, isPublicAccessEnabled } = Config;

export class App implements vscode.Disposable {
  public isRunning: boolean = false;
  private server: Server | null = null;
  private watcher: FileWatcher | null = null;
  /**
   * @constructor
   */
  constructor() {
    new ServerObserver();
    new LogObserver();
    StatusbarUI.init();
    this.isRunning = false;
  }
  /**
   * get server instance
   */
  private async getServer(
    hostname: string,
    port: number,
    protocol: "https:" | "http:",
  ) {
    const sslConfig = Config.getSSLConfig()!;
    this.server = await Server.create(hostname, port, protocol, sslConfig);
    return this.server;
  }

  /**
   * get watcher insatnce
   */

  private getWatcher(wss: WebSocketServer) {
    // const wss = this.server?.wsServer;
    this.watcher = new FileWatcher(wss);
    return this.watcher;
  }

  /**
   * clear all properties of a app instance
   */

  private clearApp() {
    this.server = null;
    this.watcher = null;
  }

  public async start() {
    const currentPath = getCurrentDir();
    if (!currentPath) {
      console.log("DEBUG: Early return triggered due to no currentPath");
      ServerEvents.emit(ServerEventTypes.NO_ACTIVE_PATH);
      return;
    }
    let currentFilePath, currentFolderPath;
    if (isFolder(currentPath!)) {
      currentFolderPath = currentPath;
      currentFilePath = getCurrentFile();
    } else {
      currentFilePath = currentPath;
      currentFolderPath = path.dirname(currentPath);
    }
    const hostname = getHost();
    const port = await getAvailablePort();
    const proto = Config.isHttpsEnabled() ? "https:" : "http:";
    const server = await this.getServer(hostname, port, proto);

    // handle reload
    if (getAutoReloadEnabled()) {
      const watcher = this.getWatcher(this.server?.wsServer!);
      watcher.start();
    }

    await server.start(async (req, res) => {
      // emit request event
      LoggerEvents.emit(LogEventTypes.HTTP_REQ, {
        method: req.method,
        url: req.url,
      });

      // emit response event
      res.on("finish", () => {
        LoggerEvents.emit(LogEventTypes.HTTP_RES, {
          code: res.statusCode,
          method: req.method,
          url: req.url,
        });
      });

      try {
        /**
         * @fix for request path
         */
        console.info("REQ URL::", req.url);
        const parsedUrl = new URL(
          req.url!,
          `http://${req.headers.host || "localhost"}`,
        );
        let pathname = decodeURIComponent(parsedUrl.pathname);
        if (pathname.startsWith("/")) {
          pathname = pathname.slice(1);
        }
        
        const fullReqPath = path.join(currentFolderPath, pathname);

        if (!fullReqPath.startsWith(currentFolderPath)) {
          throw new Error("Path is not started with " + currentFolderPath);
        }

        if (isFolder(fullReqPath)) {
          const fileTree = listFilesRecursive(fullReqPath, currentFolderPath!);
          const html = getFileBrowserUi(
            this.server?.port!,
            fullReqPath.replaceAll("\\", "/"),
            fileTree,
          );
          res.writeHead(200, { "Content-Type": "text/html" });
          return res.end(html);
        }
        const ext = getFileExtension(req.url!);

        let result = fileCache.get(fullReqPath);
        if (result) {
          console.info("Serving from ram");
        }
        if (!result) {
          console.info("Serving from disk");
          result = await processFilesafely(fullReqPath);
          fileCache.set(fullReqPath, result);
        }
        if (result.type === "text") {
          let finalData = result.data as string;
          if (supportsScriptInjection(ext)) {
            const reloadScript = getReloadScript();
            finalData += reloadScript;
            console.info("reload script injected with", fullReqPath);
          }
          this.watcher?.add(fullReqPath);
          const bodyBuffer = Buffer.from(finalData, "utf-8");
          res.writeHead(200, {
            "Content-Type": `${result.contentType}; charset=utf-8`,
            "Content-Length": bodyBuffer.length,
          });
          res.end(bodyBuffer);
        } else if (result.type === "binary") {
          res.writeHead(200, {
            "Content-Type": result.contentType || "application/octet-stream",
            "Content-Length": result.size,
          });

          if (typeof (result.data as any).pipe === "function") {
            try {
              await pipeline(result.data as any, res);
            } catch (err) {
              console.error("Pipeline failed", err);
              if (!res.writableEnded) {
                res.destroy();
              }
            }
          } else {
            res.end(result.data);
          }
        }
      } catch (error) {
        const err = error as NodeJS.ErrnoException;
        console.error(err);
        LoggerEvents.emit(LogEventTypes.ERROR, {
          error: error as Error,
        });
        const statusCode = getStatusCode(err.code);
        res.writeHead(statusCode, { "Content-Type": "text/html" });
        const html = getErrorPage(statusCode, err.message!);
        return res.end(html);
      }
    });

    const relativePath = getRelativeFilePath(
      currentFilePath || currentFolderPath,
    );
    console.info(proto);
    if (isPublicAccessEnabled()) {
      // const url = `https://${getLocalIP()}:${this.server?.port!.toString()}/`;
      const url = `${proto}//${getLocalIP()}:${this.server?.port!.toString()}/`;
      LoggerEvents.emit(LogEventTypes.CONN_URI, { uri: url });
    }

    vscode.env.openExternal(
      getConnectionURI(proto, HOST.LOCALHOST, port, relativePath!),
    );
    // revert ui
    this.isRunning = true;
  }
  public async stop() {
    if (!this.isRunning) {
      ServerEvents.emit(ServerEventTypes.NOT_RUNNING);
      return;
    }
    console.time("stop");
    await this.server!.stop();
    await this.watcher?.stop();
    console.timeEnd("stop");
    this.isRunning = false;
    this.clearApp();
  }

  public async dispose() {
    await this.stop(); // stop server while disposing
    this.clearApp();
    StatusbarUI.dispose();
  }
}
