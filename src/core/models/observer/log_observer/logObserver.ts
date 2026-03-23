import { loggerEvents } from "./logEventEmitter";
import { LogLevel, log, logger } from "./logger";

export class LogObserver {
  constructor() {}

  public init() {
    loggerEvents.on("connection_uri", ({ url }) => {
      logger.info(
        `${"Available on local network →"} ${url}\n${"Use this URI in a browser on another device to connect."}`,
      );
    });
    loggerEvents.on("http_request", ({ method, url }) => {
      log(LogLevel.INFO, { method, url });
    });
    loggerEvents.on("http_response", ({ code, method, url }) => {
      log(LogLevel.INFO, { code, method, url });
    });
    loggerEvents.on("info", ({ msg }) => {
      log(LogLevel.INFO, { msg });
    });
    loggerEvents.on("error", ({ error }: { error: Error }) => {
      const errorMsg = error.message;
      log(LogLevel.ERROR, { error: errorMsg! });
    });

    loggerEvents.on("debug", ({ msg }) => {
      logger.debug(msg);
    });
  }

  public dispose() {
    loggerEvents.removeAllListeners();
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
