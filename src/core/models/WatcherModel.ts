import * as chokidar from "chokidar";

import { WebSocketServer } from "ws";
import {
  LogEventTypes,
  LoggerEvents,
} from "./observer/log_observer/logEventEmitter";
import { readFile } from "fs/promises";
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
} from "../../consatnts/supported-extension";

import { DependencyGraph } from "../dependency-manager/DependencyGraph";

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

        console.info(resolvedFilePath);

        const ext = path.extname(filePath).toLowerCase();

        const textData = newContent.data as string;

        let result = { action: "none" } as Partial<any>;

        if (ext === ".html" || ext === ".htm") {
          result = hmrAnalyzer.analyzeHTML(textData);
        } else if (STYLE_EXTENSIONS.includes(ext)) {
          /**
           *@improve :: add HMR
           */
          // console.info("Relative path:", getRelativeFilePath(filePath));
          result = {
            action: "css-update",
            path: "/" + getRelativeFilePath(filePath),
          };
        } else if (SCRIPT_EXTENSIONS.includes(ext)) {
          result = { action: "reload" };
        } else if (ext === ".md") {
          result = { action: "reload" };
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
        // console.info("new watched file", this.watcher!.getWatched());
        // console.info("result::", result);

        if (result && result.action !== "none") {
          this.wsServer?.clients.forEach((ws) => {
            const importer = path.resolve(getCurrentDir()! + (ws as any).page);
            // console.info(graph.getNode(importer)?.imports);
            if (
              resolvedFilePath === importer ||
              DependencyGraph.hasDeepImport(graph, importer, resolvedFilePath)
            ) {
              console.info("sending message");
              ws.send(JSON.stringify(result));
            }
          });
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
