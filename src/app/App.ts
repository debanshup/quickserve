import { WebSocketServer } from "ws";
import vscode from "vscode";
import { StatusbarUI } from "../StatusBarUI";
// import { DocReloader } from "./ReloaderModel";
import { Server } from "../models/ServerModel";
import { FileWatcher } from "../models/WatcherModel";
import path from "path";
import fs from "fs";
import { Config } from "../utils/config";
import { HOST } from "../consatnts/host";
import {
  ServerEvents,
  ServerEventTypes,
} from "../models/observer/server_observer/serverEventEmitter";
import { ServerObserver } from "../models/observer/server_observer/ServerObserverModel";
import { LogObserver } from "../models/observer/log_observer/LogObserverModel";
import {
  LogEventTypes,
  LoggerEvents,
} from "../models/observer/log_observer/logEventEmitter";
import {
  getCurrentFile,
  getCurrentDir,
  getRelativeFilePath,
  isFolder,
  listFilesRecursive,
  getFileBrowserUi,
  getFileExtension,
  isSupportedFile,
  getErrorPage,
  isBinary,
  getFileContent,
  supportsScriptInjection,
  getReloadScript,
  getMimeType,
  getStatusCode,
  getAvailablePort,
  getConnectionURI,
  getHost,
  getLocalIP,
} from "../utils/helper";
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
  private getServer(hostname: string, port: number) {
    // this.hostname = getHost();
    // console.log("Hostname", this.hostname);
    this.server = new Server(hostname, port);
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
    const server = this.getServer(hostname, port);

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
        const fullReqPath = path.join(
          currentFolderPath,
          decodeURIComponent(req.url!).split(/[?#]/)[0]
        );

        if (!fullReqPath.startsWith(currentFolderPath)) {
          throw new Error("Path is not started with " + currentFolderPath);
        }

        if (isFolder(fullReqPath)) {
          const fileTree = listFilesRecursive(fullReqPath, currentFolderPath!);
          console.log(fullReqPath);
          
          const html = await getFileBrowserUi(
            this.server?.port!,
            fullReqPath.replaceAll("\\", "/"),
            fileTree
          );
          res.writeHead(200, { "Content-Type": "text/html" });
          return res.end(html);
        }
        const ext = getFileExtension(req.url!);
        const data = fs.readFileSync(fullReqPath);
        let fileContent = await getFileContent(data, ext);
        if (isSupportedFile(ext) && !isBinary(ext)) {
          this.watcher?.add(fullReqPath);
          if (supportsScriptInjection(ext)) {
            const reloadScript = getReloadScript();
            fileContent += reloadScript;
          }
        }
        res.writeHead(200, { "Content-type": getMimeType(ext) });
        return res.end(fileContent);
      } catch (error) {
        const err = error as NodeJS.ErrnoException;
        console.error(err);
        LoggerEvents.emit(LogEventTypes.ERROR, {
          error: error as Error,
        });
        const statusCode = getStatusCode(err.code);
        res.writeHead(statusCode, { "Content-Type": "text/html" });
        const html = await getErrorPage(statusCode, err.message!);
        return res.end(html);
      }
    });

    const relativePath = getRelativeFilePath(
      currentFilePath || currentFolderPath
    );

    if (isPublicAccessEnabled()) {
      const url = `http://${getLocalIP()}:${this.server?.port!.toString()}/`;
      LoggerEvents.emit(LogEventTypes.CONN_URI, { uri: url });
    }

    vscode.env.openExternal(
      getConnectionURI(HOST.LOCALHOST, port, relativePath!)
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
