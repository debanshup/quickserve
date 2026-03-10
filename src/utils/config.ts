import vscode from "vscode";
const config = vscode.workspace.getConfiguration("quickserve");

export class Config {
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
  public static getAutoReloadEnabled(): boolean {
    return config.get<boolean>("auto-reload", true);
  }

  public static getHMREnabled(){
    return config.get<boolean>("enableHMR");
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
   * @returns formatted info message
   */

  public static getShowInfoMessages(): boolean | undefined {
    return config.get<boolean>("showInfoMessages");
  }

  /**
   *
   * @returns showServerStatusOnStart
   */

  public static getshowServerStatusOnStart() {
    return config.get<boolean>("showServerStatusOnStart");
  }
  /**
   *
   * @returns public access enabled
   */
  public static getPublicAccessEnabled(): boolean | undefined {
    return config.get<boolean>("publicAccess");
  }

  public static isHttpsEnabled() {
    return config.get<boolean>("https");
  }

  public static getSSLConfig() {
    return config.get<{ certPath: string; keyPath: string }>("sslConfig");
  }

  // /**
  //  *
  //  * @returns current log level
  //  */
  //   public static getCurrentLogLevel(): string|undefined{
  //     return config.get<string>("logLevel");
  //   }
}
