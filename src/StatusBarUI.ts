import { StatusBarAlignment, StatusBarItem, window } from "vscode";
import { Config } from "./utils/config";
import { ThemeColor } from "vscode";
const { getShowStatusBar } = Config;
class StatusbarUI {
  private _statusbar: StatusBarItem | undefined;
  private get statusBar() {
    if (!this._statusbar) {
      this._statusbar = window.createStatusBarItem(
        StatusBarAlignment.Right,
        100,
      );

      if (getShowStatusBar()) {
        // console.log("status bar set to show");

        this._statusbar.show();
      }
    }
    return this._statusbar;
  }

  /**
   * Sets the status bar to the "Serve" state, with appropriate tooltip and command.
   */
  public showStart() {
    this.statusBar.color = undefined;
    this.statusBar.text = `$(play-circle) Start QuickServe`;
    this.statusBar.tooltip = "Launch local development server";
    this.statusBar.command = "quickserve.run";
  }

  /**
   * Sets the status bar to the "Kill" state, displaying the port and updating tooltip and command.
   *
   * @param port - The port number to display in the status bar.
   */
  public showStop(port: number) {
    this.statusBar.text = `$(stop-circle) QuickServe: ${port}`;
    this.statusBar.tooltip = `Stop serving on ${port}`;
    this.statusBar.command = "quickserve.kill";
    this.statusBar.color = new ThemeColor("statusBarItem.warningForeground");
  }

  /**
   * Disposes of the status bar item, freeing associated resources.
   */
  public dispose() {
    this.statusBar.dispose();
  }
}

export const statusbarUi = new StatusbarUI();
statusbarUi.showStart();
