import { StatusBarAlignment, StatusBarItem, window } from "vscode";
import { Config } from "./config";
const { getShowStatusBar } = Config;
export class StatusbarUI {
  private static _statusbar: StatusBarItem;
  // public static isRunning: boolean = false;
  // public static port: number;
  private static get statusBar() {
    if (!StatusbarUI._statusbar) {
      StatusbarUI._statusbar = window.createStatusBarItem(
        StatusBarAlignment.Right,
        100
      );

      if (getShowStatusBar()) {
        // console.log("status bar set to show");

        StatusbarUI._statusbar.show();
      }
    }
    return StatusbarUI._statusbar;
  }

  /**
   * Initializes the status bar UI by setting its default state.
   */
  static init() {
    StatusbarUI.run();
  }

  // /**
  //  * Updates the status bar to indicate a working state with an optional message.
  //  *
  //  * @param msg - The message to display (default: "Working...").
  //  */

  // static showStatusText(msg: string = "Working...") {
  //   StatusbarUI.statusBar.text = `$(pulse) ${msg}`;
  // }

  /**
   * Sets the status bar to the "Serve" state, with appropriate tooltip and command.
   */
  public static run() {
    StatusbarUI.statusBar.text = `$(server) Serve`;
    StatusbarUI.statusBar.tooltip = "start server";
    StatusbarUI.statusBar.command = "quickserve.run";
  }

  /**
   * Sets the status bar to the "Kill" state, displaying the port and updating tooltip and command.
   *
   * @param port - The port number to display in the status bar.
   */
  public static kill(port: number) {
    StatusbarUI.statusBar.text = `$(circle-slash) PORT: ${port}`;
    StatusbarUI.statusBar.tooltip = "Stop server";
    StatusbarUI.statusBar.command = "quickserve.kill";
  }

  /**
   * Disposes of the status bar item, freeing associated resources.
   */
  public static dispose() {
    StatusbarUI.statusBar.dispose();
  }
}
