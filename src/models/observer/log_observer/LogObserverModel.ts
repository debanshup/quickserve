import * as winston from "winston";
import { logger } from "./logger";
import { LogEventTypes, LoggerEvents } from "./logEventEmitter";
const { CONN_URI, DEBUG, ERROR, HTTP_REQ, HTTP_RES, INFO, WARN } =
  LogEventTypes;
import c from "ansi-colors";
import { LogLevel } from "./logger";
// import { Config } from "../../../config";

export class LogObserver {
  constructor() {
    LoggerEvents.on(CONN_URI, ({ uri }) => {
      logger.info(
        `${c.green("Available on local network →")} ${this.formatConnectionUri(
          uri
        )}\n${c.gray(
          "Use this URI in a browser on another device to connect."
        )}`
      );
    });
    LoggerEvents.on(HTTP_REQ, ({ method, url }) => {
      logger.http(this.formatReq({ method, url }));
    });
    LoggerEvents.on(HTTP_RES, ({ code, method, url }) => {
      logger.http(this.formatRes({ code, method, url }));
    });
    LoggerEvents.on(INFO, ({ msg }) => {
      logger.info(this.formatInfo({ msg }));
    });
    LoggerEvents.on(ERROR, ({ error }: { error: NodeJS.ErrnoException }) => {
      const isDetailed = this.isDetailed(logger);
      const errorMsg = isDetailed
        ? error.stack
        : error.message;
      logger.error(this.formatError({ error: errorMsg! }));
    });

    LoggerEvents.on(DEBUG, ({ msg }) => {
      logger.debug(msg);
    });
  }

  /**
   * Checks if the given logger is configured for detailed logging.
   *
   * @param logger - A Winston logger instance.
   * @returns `true` if the logger has "debug", "verbose", or "silly" level enabled, else `false`.
   *
   * @example
   * if (this.isDetailed(logger)) {
   *   // Enable extra debugging info
   * }
   */

  private isDetailed(logger: winston.Logger): boolean {
    return (
      logger.isLevelEnabled(LogLevel.DEBUG) ||
      logger.isLevelEnabled(LogLevel.VERBOSE) ||
      logger.isLevelEnabled(LogLevel.SILLY)
    );
  }

  // formatter methods
  private formatInfo({ msg }: { msg: string }): string {
    return c.blueBright(msg);
  }
  private formatConnectionUri(uri: string) {
    return c.cyanBright(uri);
  }

  private formatReq({ method, url }: { method: string; url: string }): string {
    const methodColor = c.blue(method);
    const urlColor = c.cyan(url);

    return `${methodColor} ${urlColor}`;
  }

  /**
   * Formats an HTTP response log entry with status code, method, and URL.
   *
   * @param code - The HTTP status code (e.g., 200, 404).
   * @param method - The HTTP method used (e.g., GET, POST).
   * @param url - The requested resource URL.
   * @returns A formatted and colorized response log string.
   */

  private formatRes({
    code,
    method,
    url,
  }: {
    code: number;
    method: string;
    url: string;
  }): string {
    const s_code = code.toString();
    const codeColor =
      code >= 500
        ? c.red(s_code)
        : code >= 400
        ? c.yellow(s_code)
        : c.green(s_code);

    const methodColor =
      code >= 500
        ? c.red(method)
        : code >= 400
        ? c.yellow(method)
        : code >= 300
        ? c.cyan(method)
        : code >= 200
        ? c.green(method)
        : c.gray(method);
    const uriColor = c.gray(url);

    return `${codeColor} ${methodColor} ${uriColor}`;
  }

  private formatError({ error }: { error: string }): string {
    return c.gray(error);
  }
}
