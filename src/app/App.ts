import vscode from "vscode";
import { WebSocketServer } from "ws";
import { Config } from "../utils/config";
import { HOST } from "../constants/host";
import { pipeline } from "stream/promises";
// -------- observer --------
import { ServerObserver } from "../core/models/observer/server_observer/serverObserver";
import { LogObserver } from "../core/models/observer/log_observer/logObserver";
import { StatusObserver } from "../core/models/observer/status_observer/StatusObserver";
//-------- events ---------
import { loggerEvents } from "../core/models/observer/log_observer/logEventEmitter";
import { serverEvents } from "../core/models/observer/server_observer/serverEventEmitter";
import { statusEvents } from "../core/models/observer/status_observer/StatusEventEmitter";
// ------ watcher -------
import { FileWatcher } from "../core/models/WatcherModel";
// -------- server ---------
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
  getSafeRelativePath,
} from "../utils/helper";
import path from "path";
import { fileCache } from "../cache/FileCache";
import { graph } from "../core/dependency-manager/DependencyGraph";
import { MARKDOWN_EXTENSIONS } from "../constants/supported-extension";
import { DependencyObserver } from "../core/models/observer/dependency_observer/dependencyObserver";
import { dependencyEvents } from "../core/models/observer/dependency_observer/dependencyEventEmitter";
import { ServerContext } from "../store/ServerContext";

export class App implements vscode.Disposable {
  // public isRunning: boolean = false;
  private server: Server | null = null;
  private watcher: FileWatcher | null = null;
  private publicUrl: string = "";
  private serverObserver = new ServerObserver();
  private logObserver = new LogObserver();
  private statusObserver = new StatusObserver();
  private dependencyObserver = new DependencyObserver();
  /**
   * @constructor
   */
  constructor() {
    this.serverObserver.init();
    this.logObserver.init();
    // show status on startup
    if (Config.getshowServerStatusOnStart()) {
      this.statusObserver.init();
    }
    if (Config.getHMREnabled()) {
      this.dependencyObserver.init();
    }
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
    graph.clear();
  }

  public async start() {
    if (ServerContext.isRunning) {
      serverEvents.emit("server:already_running");
    } else {
      const rootPath = getCurrentDir();
      if (!rootPath) {
        // console.log("DEBUG: Early return triggered due to no rootPath");
        serverEvents.emit("server:no_active_path");
        return;
      }
      let currentFilePath, currentFolderPath;
      if (isFolder(rootPath!)) {
        currentFolderPath = rootPath;
        currentFilePath = getCurrentFile();
      } else {
        currentFilePath = rootPath;
        currentFolderPath = path.dirname(rootPath);
      }
      const hostname = getHost();
      const port = await getAvailablePort();
      const proto = Config.isHttpsEnabled() ? "https:" : "http:";
      const server = await this.getServer(hostname, port, proto);

      // handle reload
      if (Config.getWatcherEnabled()) {
        const watcher = this.getWatcher(this.server?.wsServer!);
        watcher.start();
      }

      await server.start(async (req, res) => {
        // emit request event
        loggerEvents.emit("http_request", {
          method: req.method,
          url: req.url,
        });

        // emit response event
        res.on("finish", () => {
          loggerEvents.emit("http_response", {
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
            const fileTree = listFilesRecursive(
              fullReqPath,
              currentFolderPath!,
            );
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
          // if (result) {
          //   console.info("Serving from ram");
          // }

          if (!result) {
            // console.info("Serving from disk");
            const diskData = await processFilesafely(fullReqPath);
            if (!diskData || !diskData.data) {
              // console.warn("null data for::", fullReqPath);
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
            // build for first time
            if ([...MARKDOWN_EXTENSIONS, ".html", ".htm"].includes(ext)) {
              if (
                !graph.hasNode(fullReqPath) ||
                req.headers["cache-control"] === "no-cache"
              ) {
                // console.info("fresh graph building for:", fullReqPath);
                graph.clear();
                dependencyEvents.emit("graph:build", fullReqPath);
                this.watcher?.add(graph.getAllNodes());
              }
            }

            // add to watcher
            if (supportsScriptInjection(ext)) {
              const reloadScript = getReloadScript();
              finalData += reloadScript;
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
                // console.error("Pipeline failed", err);
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
          loggerEvents.emit("error", {
            error: error as Error,
          });
          const statusCode = getStatusCode(err.code);
          res.writeHead(statusCode, { "Content-Type": "text/html" });
          const html = getErrorPage(statusCode, err.message!);
          return res.end(html);
        }
      });

      const isPublicAccessEnabled = Config.getPublicAccessEnabled();

      if (isPublicAccessEnabled) {
        this.publicUrl = `${proto}//${getLocalIP()}:${this.server?.port!.toString()}/`;
        loggerEvents.emit("connection_uri", { url: this.publicUrl });
      }

      statusEvents.emit("start", {
        on: server.on,
        port: this.server!.port,
        isPublicAccessEnabled,
        publicUrl: this.publicUrl,
      });
      // open with a browser if enabled
      if (Config.getOpenBrowserEnabled()) {
        const safePath = getSafeRelativePath(currentFolderPath);
        vscode.env.openExternal(
          getConnectionURI(proto, HOST.LOCALHOST, port, safePath!),
        );
      }
      // this.isRunning = true;
      // save startup context
      ServerContext.isRunning = true;
      ServerContext.port = port;
      ServerContext.proto = proto;
      ServerContext.host = HOST.LOCALHOST;
      ServerContext.rootPath = rootPath;
      await vscode.commands.executeCommand(
        "setContext",
        "quickserve.isRunning",
        true,
      );
      statusEvents.emit("show");
    }
  }
  public async stop() {
    if (!ServerContext.isRunning) {
      serverEvents.emit("server:not_running");
      return;
    }
    // console.time("stop");
    await Promise.all([this.server!.stop(), this.watcher?.stop()]);
    this.disposeAllObserver();
    ServerContext.isRunning = false;
    await vscode.commands.executeCommand(
      "setContext",
      "quickserve.isRunning",
      false,
    );
    this.clearApp();
    statusEvents.emit("stop");
  }

  private async disposeAllObserver() {
    this.statusObserver.dispose();
    this.serverObserver.dispose();
    this.logObserver.dispose();
    this.dependencyObserver.dispose();
  }

  public async dispose() {
    await this.stop(); // stop server while disposing
    this.disposeAllObserver();
    // StatusbarUI.dispose();
  }
}
