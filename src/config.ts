import vscode from "vscode";
const config = vscode.workspace.getConfiguration("quickserve");

export class Config {
  /**
   *
   * @returns ws server port
   */
  public static getWSServerPort(): number | undefined {
    return config.get<number>("wsServer.port", 5000);
  }

  /**
   *
   * @returns http server port
   */
  public static getHttpServerPort(): number | undefined {
    return config.get<number>("httpServer.port", 3000);
  }
  /**
   *
   * @returns auto reload enabled
   */
  public static getAutoReload(): boolean {
    return config.get<boolean>("auto-reload", true);
  }

  /**
   *
   * @returns show statusbar enabled
   */
  public static getShowStatusBar(): boolean {
    return config.get<boolean>("show-statusbar")!;
  }

  /**
   * 
   * Retrieves the list of file patterns to ignore for auto-reload.
   *
   * Reads the "ignored-files" setting from the extension configuration.
   * Returns an array of strings representing file extensions or patterns.
   *
   * @returns {string[]} Array of ignored file patterns; empty array if none set.
   */
  public static getIgnoredFileList(): string[] {
    return config.get<string[]>("ignoredFiles") || [];
  }

  /**
   *
   * @returns formatted info message
   */

  public static getShowInfoMessages(): boolean | undefined {
    return config.get<boolean>("showInfoMessages");
  }
/**
 * 
 * @returns public access enabled
 */
  public static isPublicAccessEnabled(): boolean | undefined {
    return config.get<boolean>("publicAccess");
  }

/**
 * 
 * @returns current log level
 */
  public static getCurrentLogLevel(): string|undefined{
    return config.get<string>("logLevel");
  }
}
