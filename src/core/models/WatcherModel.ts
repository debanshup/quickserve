import * as chokidar from "chokidar";
import WebSocket, { WebSocketServer } from "ws";
import {
  LogEventTypes,
  LoggerEvents,
} from "./observer/log_observer/logEventEmitter";
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

export class FileWatcher {
  private watcher?: chokidar.FSWatcher;
  private wsServer?: WebSocketServer;
  private files: string | any;
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
  add(file: string | string[]): void {
    this.watcher?.add(file);
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
  public broadcastToAll(payload: any) {
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

  start(): void {
    this.watcher = chokidar.watch([], {
      ignored: this.ignoredFileList,
      awaitWriteFinish: false,
      persistent: true,
    });

    const hmrAnalyzer = new HmrAnalyzer();
    this.watcher.on("change", async (filePath) => {
      console.info("watched file", this.watcher!.getWatched());
      try {
        const resolvedFilePath = path.resolve(filePath);
        const newContent = await processFilesafely(filePath);
        fileCache.set(filePath, newContent);
        if (!newContent) {
        }
        if (newContent?.type !== "text") {
          // console.log(` AST parse for binary/large file: ${filePath}`);
          return;
        }

        let msg = { action: "none" } as Partial<any>;

        if (Config.getHMREnabled()) {
          const ext = path.extname(filePath).toLowerCase();

          const textData = newContent.data as string;

          if (ext === ".html" || ext === ".htm") {
            msg = hmrAnalyzer.analyzeHTML(textData);
          } else if (STYLE_EXTENSIONS.includes(ext)) {
            /**
             *@improve :: add support for other file extensions
             */

            const rootCSS = DependencyGraph.findRootCss(
              graph,
              resolvedFilePath,
            );
            // console.info("ROOTCSS::", rootCSS);
            msg = {
              action: "css-update",
              path: "/" + getRelativeFilePath(rootCSS ?? filePath),
            };
          } else if (SCRIPT_EXTENSIONS.includes(ext)) {
            msg = { action: "reload" };
          } else if (ext === ".md") {
            msg = { action: "reload" };
          }

          let node = graph.getNode(filePath);
          if (node) {
            console.info("Updating existing node...");
            graph.updateNode(filePath, {
              ...node,
              imports: new Set(graph.extractImports(filePath, textData)),
            });
            // console.info(node);
          } else {
            // fallback
            node = graph.createNode(filePath, textData)!;
          }
          this.watcher?.add([...node.imports]);
          if (msg && msg.action !== "none") {
            this.broadcastToPage(resolvedFilePath, graph, msg);
          }
        } else {
          msg = { action: "reload" };
          this.broadcastToAll(msg);
        }
      } catch (error) {
        console.error(`Watcher Error processing ${filePath}:`, error);
      }
    });
    this.watcher.on("add", (filePath) => {
      LoggerEvents.emit(LogEventTypes.INFO, { msg: `Watching ${filePath}` });
    });
    this.watcher.on("unlink", (filePath) => {
      /**
       * @todo:: test
       */
      const isDeleted = graph.deleteNode(filePath);
      console.info("deleting ", filePath, isDeleted);
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
