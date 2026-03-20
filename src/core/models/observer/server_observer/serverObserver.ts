import * as vscode from "vscode";
import { serverEvents } from "./serverEventEmitter";
import { ERROR_MESSAGES } from "../../../../constants/errorMessages";
import { POP_UP_MESSAGE } from "../../../../constants/pop-upMessage";
import { StatusbarUI } from "../../../../StatusBarUI";
import { Config } from "../../../../utils/config";

const { getShowInfoMessages } = Config;
export class ServerObserver {
  public init() {
    serverEvents.on("server:start", (port: number) => {
      this.onStart(port);
    });
    serverEvents.on("server:stop", this.onStop);
    serverEvents.on("server:not_running", this.onNotRunning);
    serverEvents.on("server:error", this.onError);
    serverEvents.on("server:no_active_path", () => {
      vscode.window.showErrorMessage(ERROR_MESSAGES.NO_ACTIVE_PATH);
    });
  }

  private onStart(port: number | any) {
    if (getShowInfoMessages()) {
      vscode.window.showInformationMessage(
        POP_UP_MESSAGE.SERVER_STARTED.replace(/__PORT__/g, port),
      );
    }
    StatusbarUI.kill(port);
  }
  private onStop() {
    if (getShowInfoMessages()) {
      vscode.window.showInformationMessage(POP_UP_MESSAGE.SERVER_CLOSED);
    }
    StatusbarUI.run();
  }
  private onNotRunning() {
    vscode.window.showErrorMessage(ERROR_MESSAGES.SERVER_NOT_STARTED);
  }
  private onError(error: Error) {
    vscode.window.showErrorMessage(
      `${POP_UP_MESSAGE.SERVER_ERROR}: ${error.message}`,
    );
    StatusbarUI.run();
  }

  public dispose() {
    serverEvents.removeAllListeners();
  }
}
