import vscode from "vscode";
import { WebSocketServer } from "ws";
import { StatusbarUI } from "../StatusBarUI";
import { Config } from "../utils/config";
import { HOST } from "../consatnts/host";

import { ServerObserver } from "../core/models/observer/server_observer/ServerObserverModel";
import { LogObserver } from "../core/models/observer/log_observer/LogObserverModel";

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
import { graph } from "../core/dependency-manager/DependencyGraph";
import { StatusObserver } from "../core/models/observer/status_observer/StatusObserverModel";
import {
  StatusEvents,
  StatusEventTypes,
} from "../core/models/observer/status_observer/StatusEventEmitter";
const { getWatcherEnabled, getPublicAccessEnabled } = Config;

export class App implements vscode.Disposable {
  public isRunning: boolean = false;
  private server: Server | null = null;
  private watcher: FileWatcher | null = null;
  private publicUrl: string = "";
  private serverObserver = new ServerObserver();
  private logObserver = new LogObserver();
  private statusObserver = new StatusObserver();
  /**
   * @constructor
   */
  constructor() {
    this.serverObserver.init();
    this.logObserver.init();
    this.statusObserver.init();
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
    graph.clearGraph();
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
    if (getWatcherEnabled()) {
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
        // console.info("REQ URL::", req.url);
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
          const diskData = await processFilesafely(fullReqPath);
          if (!diskData || !diskData.data) {
            console.warn("null data for::", fullReqPath);
            res.writeHead(404, {
              // Fake 'Success' to keep the browser quiet
              "Content-Type": "text/plain",
              "X-QuickServe-Error-Code": "FILE_NOT_FOUND",
              "X-QuickServe-Internal-Msg": encodeURIComponent(
                "Could not resolve dependency graph",
              ),
              "Cache-Control": "no-store", // Ensure the browser doesn't cache this "fake" success
            });
            return res.end("");
          }
          result = diskData;
          fileCache.set(fullReqPath, result);
        }

        if (result?.type === "text") {
          let finalData = result.data as string;
          if (!graph.isNodeAvailable(fullReqPath)) {
            console.info("Node not available, creating node");
            graph.build(fullReqPath);

            // const maps
            console.info("Files::", graph.getAllNodes());
            this.watcher?.add(graph.getAllNodes());
            // this.watcher?.add(fullReqPath);
          }
          if (supportsScriptInjection(ext)) {
            const reloadScript = getReloadScript();
            finalData += reloadScript;
            console.info("reload script injected with", fullReqPath);
          }
          const bodyBuffer = Buffer.from(finalData, "utf-8");
          res.writeHead(200, {
            "Content-Type": `${result.contentType}; charset=utf-8`,
            "Content-Length": bodyBuffer.length,
          });
          res.end(bodyBuffer);
        } else if (result?.type === "binary") {
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
        console.error(error);
        const err = error as NodeJS.ErrnoException;
        // console.error("ERROR STACK::", err.stack);
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
    const isPublicAccessEnabled = getPublicAccessEnabled();
    if (isPublicAccessEnabled) {
      this.publicUrl = `${proto}//${getLocalIP()}:${this.server?.port!.toString()}/`;
      LoggerEvents.emit(LogEventTypes.CONN_URI, { url: this.publicUrl });
    }

    StatusEvents.emit(StatusEventTypes.START, {
      on: server.on,
      port: this.server?.port,
      isPublicAccessEnabled,
      publicUrl: this.publicUrl,
    });

    // vscode.env.openExternal(
    //   getConnectionURI(proto, "localhost:", port, relativePath!),
    // );`
    vscode.env.openExternal(
      getConnectionURI(proto, HOST.LOCALHOST, port, relativePath!),
    );
    // show status if applicable
    if (Config.getshowServerStatusOnStart()) {
      StatusEvents.emit(StatusEventTypes.SHOW);
    }

    // revert ui
    this.isRunning = true;
  }
  public async stop() {
    if (!this.isRunning) {
      ServerEvents.emit(ServerEventTypes.NOT_RUNNING);
      return;
    }
    // console.time("stop");
    await Promise.all([this.server!.stop(), this.watcher?.stop()]);
    this.disposeAllObserver();
    this.isRunning = true;
    this.clearApp();
    StatusEvents.emit(StatusEventTypes.STOP);
  }

  private async disposeAllObserver() {
    this.statusObserver.dispose();
    this.serverObserver.dispose();
    this.logObserver.dispose();
  }

  public async dispose() {
    await this.stop(); // stop server while disposing
    this.disposeAllObserver();
    StatusbarUI.dispose();
  }
}
