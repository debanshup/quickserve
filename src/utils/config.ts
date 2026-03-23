import vscode from "vscode";
import { SSLConfig } from "../Types";

export class Config {
  private static getConfig() {
    return vscode.workspace.getConfiguration("quickserve");
  }

  /**
   *
   * @returns http server port
   */
  public static getHttpServerPort(): number | undefined {
    return Config.getConfig().get<number>("port", 3000);
  }
  /**
   *
   * @returns auto reload enabled
   */
  public static getWatcherEnabled(): boolean {
    return Config.getConfig().get<boolean>("enableWatcher", true);
  }

  public static getHMREnabled() {
    return Config.getConfig().get<boolean>("enableHMR");
  }

  /**
   *
   * @returns show statusbar enabled
   */
  public static getShowStatusBar(): boolean {
    return Config.getConfig().get<boolean>("showStatusbar")!;
  }

  /**
   *
   * @returns formatted info message
   */

  public static getShowInfoMessages(): boolean | undefined {
    return Config.getConfig().get<boolean>("showInfoMessages");
  }

  /**
   *
   * @returns showServerStatusOnStart
   */

  public static getshowServerStatusOnStart() {
    return Config.getConfig().get<boolean>("showServerStatusOnStart");
  }
  /**
   *
   * @returns public access enabled
   */
  public static getPublicAccessEnabled(): boolean {
    return Config.getConfig().get<boolean>("publicAccess")!;
  }

  public static isHttpsEnabled() {
    return Config.getConfig().get<boolean>("https.enable")!;
  }

  public static getSSLConfig() {
    return Config.getConfig().get<SSLConfig>("https");
  }

  public static getOpenBrowserEnabled() {
    return Config.getConfig().get<boolean>("openBrowser");
  }
}
