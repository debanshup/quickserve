import * as chokidar from "chokidar";

import { WebSocketServer } from "ws";
import {
  LogEventTypes,
  LoggerEvents,
} from "./observer/log_observer/logEventEmitter";
import { readFile } from "fs/promises";
import { HmrAnalyzer } from "../HMR/HmrAnalyzer";
import { processFilesafely } from "../../utils/helper";
import { fileCache } from "../../cache/FileCache";
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
  add(file: string): void {
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
    this.watcher.on("change", async (path) => {
      let result;
      const newContent = await processFilesafely(path);
      fileCache.set(path, newContent);
      if (
        path.toLowerCase().endsWith(".html") ||
        path.toLowerCase().endsWith(".htm")
      ) {
        result = hmrAnalyzer.analyze(newContent.data as string);
      }
      // console.info("RESULT::",result);
      if (result.action !== "none") {
        this.wsServer?.clients.forEach((ws) => {
          ws.send(JSON.stringify(result!));
        });
      }

      // const end = performance.now();`
      // console.log("Reload trigger time:", end - start, "ms");
    });
    this.watcher.on("add", (path) => {
      LoggerEvents.emit(LogEventTypes.INFO, { msg: `Watching ${path}` });
    });
    this.on = true;
  }
  async stop(): Promise<void> {
    if (this.watcher && this.on) {
      await this.watcher?.close();
      this.on = false;
    }
  }

  /**
   * Performs surgical cleanup on the Dependency Graph (experimental)
   */
  private handleIncrementalUpdate(changedFile: string) {
    // 1. Delete from your in-memory file cache (so the next HTTP request reads fresh from disk)
    // myCache.delete(changedFile);
    // 2. Get the node from your Dependency Graph
    // const node = this.graph.getNode(changedFile);
    // if (node) {
    // 3. Sever FORWARD ties (What this file imports)
    // Why? Because the developer might have deleted an `import "style.css"` line.
    // We clear them now. They will be rebuilt automatically when the browser
    // requests this file again and triggers your HTTP middleware parser.
    // Example logic:
    // node.imports.forEach(importedFile => {
    //    const importedNode = this.graph.getNode(importedFile);
    //    if (importedNode) {
    //       importedNode.importedBy.delete(changedFile); // Remove reverse tie from the child
    //    }
    // });
    // node.imports.clear();
    // }
  }
}
