import * as vscode from "vscode";
export const logger = vscode.window.createOutputChannel("quickserve_log", {
  log: true,
});
// logger.show(true);
export enum LogLevel {
  ERROR = "error",
  WARN = "warn",
  INFO = "info",
  HTTP = "http",
  VERBOSE = "verbose",
  DEBUG = "debug",
  SILLY = "silly",
}
export function log(level: LogLevel, message: any) {
  switch (level) {
    case LogLevel.ERROR:
      logger.error(message);
      break;
    case LogLevel.WARN:
      logger.warn(message);
      break;
    case LogLevel.DEBUG:
    case LogLevel.SILLY:
      logger.debug(message);
      break;
    default:
      logger.info(message);
  }
}
