import * as chokidar from "chokidar";
import WebSocket, { WebSocketServer } from "ws";
// import { loggerEvents } from "./observer/log_observer/logEventEmitter";
import { HmrAnalyzer } from "../HMR/HmrAnalyzer";
import {
  getCurrentDir,
  getRelativeFilePath,
  processFilesafely,
} from "../../utils/helper";
import { fileCache } from "../../cache/FileCache";
import { graph } from "../dependency-manager/DependencyGraph";
import path from "path";
import {
  SCRIPT_EXTENSIONS,
  STYLE_EXTENSIONS,
} from "../../constants/supported-extension";

import { DependencyGraph } from "../dependency-manager/DependencyGraph";
import { Config } from "../../utils/config";
import { clientRegistry } from "../../store/ClientRegistry";
import { WSMessage } from "../../Types";
import { dependencyEvents } from "./observer/dependency_observer/dependencyEventEmitter";

export class FileWatcher {
  private watcher?: chokidar.FSWatcher;
  private wsServer?: WebSocketServer;
  // private files: string | any;
  private ignoredFileList: chokidar.Matcher = [] as unknown as chokidar.Matcher;

  /**
   * Initializes the FileWatcher with a WebSocket server
   *
   * @param wss - The WebSocketServer instance used to broadcast file change events.
   */
  constructor(wss: WebSocketServer) {
    this.wsServer = wss;
  }

  on: boolean = false;
  /**
   * should be called after start()
   * @param file
   * add a file in watcher
   * @returns void
   */
  add(fileOrFiles: string | string[]): void {
    const files = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];

    for (const file of files) {
      const resolvedPath = path.resolve(file);
      if (!this.watcher?._watched.has(resolvedPath)) {
        this.watcher?.add(resolvedPath);
      }
    }
  }

  // remove filepath from watcher
  remove(file: string | string[]) {
    this.watcher?.unwatch(file);
  }

  private setIgnoredFiles(ignoredPattern: chokidar.Matcher) {
    this.ignoredFileList = ignoredPattern;
  }

  /**
   *
   *broadcast payload to a specific client
   */

  public broadcastToPage(
    resolvedFilePath: string,
    graph: DependencyGraph,
    payload: any,
  ) {
    if (!this.wsServer) {
      return;
    }

    const message = JSON.stringify(payload);

    this.wsServer.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        const state = clientRegistry.get(client);
        // console.info("state:", state);
        if (!state || !state.page) {
          return;
        }

        const importer = path.resolve(getCurrentDir()! + state.page); // CRITICAL: use str concatenation before resolve

        const isDirectMatch =
          path.normalize(resolvedFilePath) === path.normalize(importer);

        const isDeepDependency = DependencyGraph.hasDeepImport(
          graph,
          importer,
          resolvedFilePath,
        );

        // console.info("is deep:", isDeepDependency);
        // console.info("message:", message);
        if (isDirectMatch || isDeepDependency) {
          console.info(`[HMR] Sending update to client viewing: ${state.page}`);
          client.send(message);
        }
      }
    });
  }

  /**
   * broadcasts payload to every connected client
   */
  public broadcastToAll(payload: { action?: string }) {
    if (!this.wsServer) {
      return;
    }

    const message = JSON.stringify(payload);

    this.wsServer.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // trigger full reload (for file deletion)

  public triggerFullReload() {
    this.wsServer?.clients.forEach((client) => {
      const msg = { action: "reload" };
      client.send(JSON.stringify(msg));
    });
  }

  start(): void {
    this.watcher = chokidar.watch([], {
      ignored: this.ignoredFileList,
      awaitWriteFinish: false,
      persistent: true,
    });

    const hmrAnalyzer = new HmrAnalyzer();
    this.watcher.on("change", async (filePath) => {
      // console.info("watched file", this.watcher!.getWatched());
      try {
        const resolvedFilePath = path.resolve(filePath);
        /**
         * @critical
         */
        const newContent = await processFilesafely(filePath);
        fileCache.set(filePath, newContent);
        if (!newContent) {
        }
        if (newContent?.type !== "text") {
          // console.log(` AST parse for binary/large file: ${filePath}`);
          return;
        }

        let msg: WSMessage = { action: "none" };
        if (Config.getHMREnabled()) {
          const ext = path.extname(filePath).toLowerCase();

          const textData = newContent.data as string;

          if (
            ext === ".html" ||
            ext === ".htm" ||
            ext === ".md" ||
            ext === "markdown"
          ) {
            msg = hmrAnalyzer.analyzeHTML(textData);
          } else if (STYLE_EXTENSIONS.includes(ext)) {
            /**
             *@improve :: add support for other file extensions
             */

            const rootCSS = DependencyGraph.findRootCss(
              graph,
              resolvedFilePath,
            );
            console.info("ROOTCSS::", rootCSS);
            msg = {
              action: "css-update",
              path: "/" + getRelativeFilePath(rootCSS ?? filePath),
            };
          } else if (SCRIPT_EXTENSIONS.includes(ext)) {
            msg = { action: "reload" };
          }
          //   else if (ext === ".md") {
          //   msg = { action: "reload" };
          // }
          // modify imports if applicable
          if (graph.hasNode(resolvedFilePath)) {
            //  emit Dependency event
            dependencyEvents.emit(
              "graph:update_node_imports",
              resolvedFilePath,
              textData,
            );
            const node = graph.getNode(resolvedFilePath);
            if (node?.imports) {
              this.add(Array.from(node.imports));
            }
          } else {
            // node not available
            this?.add(filePath);
          }
          if (msg && msg.action !== "none") {
            this.broadcastToPage(resolvedFilePath, graph, msg);
          }
        } else {
          this?.add(filePath);
          msg = { action: "reload" };
          this.broadcastToAll(msg);
        }
      } catch (error) {
        console.error(`Watcher Error processing ${filePath}:`, error);
      }
    });

    // handle deletion of a file
    this.watcher.on("unlink", (filePath) => {
      //  hard cleanup for deleted node
      dependencyEvents.emit(
        "graph:cleanup",
        graph,
        path.resolve(filePath),
        true,
      );
      // delete cache
      fileCache.delete(filePath);
      // unwatch file
      this.remove(filePath);
      // trigger full reload
      this.triggerFullReload();
    });

    this.watcher.on("error", (err) => {
      console.info(err);
    });
    this.on = true;
  }

  async stop(): Promise<void> {
    if (this.watcher && this.on) {
      await this.watcher?.close();
      this.on = false;
    }
  }
}
