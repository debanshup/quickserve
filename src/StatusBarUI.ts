import { StatusBarAlignment, StatusBarItem, window } from "vscode";
import { Config } from "./utils/config";
import { ThemeColor } from "vscode";
const { getShowStatusBar } = Config;
export class StatusbarUI {
   static _statusbar: StatusBarItem;
  // public static isRunning: boolean = false;
  // public static port: number;
  private static get statusBar() {
    if (!StatusbarUI._statusbar) {
      StatusbarUI._statusbar = window.createStatusBarItem(
        StatusBarAlignment.Right,
        100,
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
    StatusbarUI.statusBar.color = undefined;
    StatusbarUI.statusBar.text = `$(play-circle) Start QuickServe`;
    StatusbarUI.statusBar.tooltip = "Launch local development server";
    StatusbarUI.statusBar.command = "quickserve.run";
  }

  /**
   * Sets the status bar to the "Kill" state, displaying the port and updating tooltip and command.
   *
   * @param port - The port number to display in the status bar.
   */
  public static kill(port: number) {
    StatusbarUI.statusBar.text = `$(stop-circle) QuickServe: ${port}`;
    StatusbarUI.statusBar.tooltip = `Stop serving on ${port}`;
    StatusbarUI.statusBar.command = "quickserve.kill";
    StatusbarUI.statusBar.color = new ThemeColor('statusBarItem.warningForeground');
  }

  /**
   * Disposes of the status bar item, freeing associated resources.
   */
  public static dispose() {
    StatusbarUI.statusBar.dispose();
  }
}
