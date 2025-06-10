import { WebSocketServer } from "ws";
import vscode from "vscode";
import { Helper } from "../helper";
import { StatusbarUI } from "../StatusBarUI";
import { DocReloader } from "./ReloaderModel";
import { HTTPServer } from "./ServerModel";
import { FileWatcher } from "./WatcherModel";
import path from "path";
import fs from "fs";
import { Config } from "../config";
import { HOST } from "../consatnts/host";
import {
  ServerEvents,
  ServerEventTypes,
} from "./observer/server_observer/serverEventEmitter";
import { ServerObserver } from "./observer/server_observer/ServerObserverModel";
import { LogObserver } from "./observer/log_observer/LogObserverModel";
import {
  LogEventTypes,
  LoggerEvents,
} from "./observer/log_observer/logEventEmitter";
const {
  getCurrentFile,
  getCurrentDir,
  getRelativeFilePath,
  isDirectory,
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
  getAvailablePorts,
  getConnectionURI,
  isIgnored,
  getHost,
  getLocalIP,
  getCurrentWorkpace,
  pathExists,
} = Helper;
const { getAutoReload, isPublicAccessEnabled } = Config;
export class App implements vscode.Disposable {
  // observer
  private _serverObserver = new ServerObserver();
  private _logObserver = new LogObserver();

  private server: HTTPServer | null = null;
  private watcher: FileWatcher | null = null;
  private reloader: DocReloader | null = null;
  private httpPort: number | null = null;
  private wsPort: number | null = null;
  private isServerBusy: boolean | undefined;
  private hostname: string | undefined;

  /**
   * @constructor
   */
  constructor() {
    StatusbarUI.init();
    this.isServerBusy = false;
  }
  /**
   * get server instance
   */
  private getServer(port: number) {
    this.hostname = getHost();
    // console.log("Hostname", this.hostname);
    this.server = new HTTPServer(port, this.hostname);
    return this.server;
  }

  /**
   * get reloader
   */
  private getReloader() {
    this.reloader = new DocReloader();
    return this.reloader;
  }

  /**
   * get watcher insatnce
   */

  private getWatcher(port: number) {
    const wss: WebSocketServer = this.getReloader().start(port);
    this.watcher = new FileWatcher(wss);
    return this.watcher;
  }

  /**
   * clear all properties of a server
   */

  private clearApp() {
    this.server = null;
    this.watcher = null;
    this.reloader = null;
    this.httpPort = null;
    this.wsPort = null;
    this.hostname = undefined;
  }

  /**
   *
   *
   * starts app
   */
  public async start() {
    const currentWorkspaces = getCurrentWorkpace();

    if (!currentWorkspaces || currentWorkspaces.length === 0) {
      ServerEvents.emit(ServerEventTypes.NO_ACTIVE_PATH);
      return;
    }

    const currentPath = getCurrentFile() || getCurrentDir();
    if (!currentPath) {
      return;
    }

    const port = await getAvailablePorts();
    if (!this.httpPort) {
      this.httpPort = port.httpServerPort;
    }

    if (!this.wsPort) {
      this.wsPort = port.wssPort;
    }

    // console.log(JSON.stringify(port));

    if (getAutoReload()) {
      this.getWatcher(this.wsPort)?.start();
    }
    const baseDir = isDirectory(currentPath) ? currentPath : getCurrentDir();

    const relativePath = getRelativeFilePath(currentPath); // get relative path
    const localIP: string = getLocalIP();
    if (!localIP) {
      //  show error message
      return;
    }
    this.getServer(this.httpPort!)?.start(async (req, res) => {
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
        // full sanitized path of requested file or folder
        const fullPath = path.join(
          baseDir!,
          decodeURIComponent(req.url!).split(/[?#]/)[0]
        );

        if (!fullPath.startsWith(baseDir!)) {
          throw new Error();
        }

        if (isDirectory(fullPath)) {
          // if path is a directory, show filebrowser ui
          const fileTree = listFilesRecursive(fullPath, baseDir!);
          const html = await getFileBrowserUi(
            this.server?.port!,
            fullPath,
            fileTree
          );
          res.writeHead(200, { "Content-Type": "text/html" });
          return res.end(html);
        }

        // path is a file
        const ext = getFileExtension(req.url!); // get file extension

        if (isSupportedFile(ext) && !isBinary(ext) && !isIgnored(ext)) {
          this.watcher?.add(fullPath);
        }

        const data = await fs.promises.readFile(fullPath);
        let content = await getFileContent(data, ext);
        if (supportsScriptInjection(ext)) {
          // check if the file supports script injection
          content += getReloadScript(localIP, this.wsPort!);
        }
        res.writeHead(200, { "Content-type": getMimeType(ext) });
        return res.end(content);
      } catch (error) {
        const err = error as NodeJS.ErrnoException;
        LoggerEvents.emit(LogEventTypes.ERROR, {
          error: err as Error,
        });
        const statusCode = getStatusCode(err.code);
        res.writeHead(statusCode, { "Content-Type": "text/html" });
        const html = await getErrorPage(statusCode, err.stack!);
        return res.end(html);
      }
    });

    /**
     * log public access url
     */

    if (isPublicAccessEnabled()) {
      const url = `http://${localIP}:${this.server?.port!.toString()}/`;
      LoggerEvents.emit(LogEventTypes.CONN_URI, { uri: url });
    }
    /**
     * open link in browser
     */
    vscode.env.openExternal(
      getConnectionURI(HOST.LOCALHOST, this.httpPort, relativePath!)
    );
    // revert ui
    this.isServerBusy = true;
  }

  /**
   * stop server
   */
  public async stop() {
    if (!this.isServerBusy) {
      ServerEvents.emit(ServerEventTypes.NOT_RUNNING);
      return;
    }
    console.time("stop");
    this.server!.stop();
    await this.watcher?.stop();
    this.reloader?.stop();
    console.timeEnd("stop");
    this.isServerBusy = false;
    this.clearApp();
  }

  /**
   * @dispose app
   */
  public async dispose() {
    await this.stop(); // stop server while disposing
    this.clearApp();
    StatusbarUI.dispose();
  }
}
