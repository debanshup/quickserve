import { LogEventTypes, LoggerEvents } from "./logEventEmitter";
const { CONN_URI, DEBUG, ERROR, HTTP_REQ, HTTP_RES, INFO, WARN } =
  LogEventTypes;
import { LogLevel, log, logger } from "./logger";

export class LogObserver {
  constructor() {
    LoggerEvents.on(CONN_URI, ({ uri }) => {
      logger.info(
        `${"Available on local network →"} ${uri}\n${"Use this URI in a browser on another device to connect."}`
      );
    });
    LoggerEvents.on(HTTP_REQ, ({ method, url }) => {
      log(LogLevel.INFO, { method, url });
    });
    LoggerEvents.on(HTTP_RES, ({ code, method, url }) => {
      log(LogLevel.INFO, { code, method, url });
    });
    LoggerEvents.on(INFO, ({ msg }) => {
      log(LogLevel.INFO, { msg });
    });
    LoggerEvents.on(ERROR, ({ error }: { error: Error }) => {
      const errorMsg = error.message;
      log(LogLevel.ERROR, { error: errorMsg! });
    });

    LoggerEvents.on(DEBUG, ({ msg }) => {
      logger.debug(msg);
    });
  }

  /**
   * Checks if the given logger is configured for detailed logging.
   *@param currentLevel : log level set in extension settings
   * @returns `true` if the logger has "debug", "verbose", or "silly" level enabled, else `false`.
   *
   * @example
   * if (this.isDetailed(logger)) {
   *   // Enable extra debugging info
   * }
   */

  // private isDetailed(currentLevel: string): boolean {
  //   return (
  //     currentLevel === LogLevel.DEBUG ||
  //     currentLevel === LogLevel.VERBOSE ||
  //     currentLevel === LogLevel.SILLY
  //   );
  // }
}
