import * as chokidar from "chokidar";
import { Watcher } from "../types/Watcher";
import { WebSocketServer } from "ws";
import fs from "fs";
import { resolve } from "path";
import {
  LogEventTypes,
  LoggerEvents,
} from "./observer/log_observer/logEventEmitter";
export class FileWatcher implements Watcher {
  private watcher?: chokidar.FSWatcher;
  private wss?: WebSocketServer;
  private files: string | any;
  private ignoredFileList: chokidar.Matcher = [] as unknown as chokidar.Matcher;

  /**
   * Initializes the FileWatcher with a WebSocket server
   *
   * @param wss - The WebSocketServer instance used to broadcast file change events.
   */
  constructor(
    wss: WebSocketServer,
  ) {
    this.wss = wss;
  }

  on: boolean = false;
  /**
   * should be called after start()
   * @param file
   * add a file in watcher
   * @returns void
   */
  add(file: string): void {
    // this.files.add(file);
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
    this.watcher.on("change", (path) => {
      this.wss?.clients.forEach((ws) => {
        ws.send(JSON.stringify({ action: "reload" }));
      });
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
}
