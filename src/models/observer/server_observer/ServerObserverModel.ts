import * as vscode from "vscode";
import { ServerEvents, ServerEventTypes } from "./serverEventEmitter";
import { Config } from "../../../config";
import { ERROR_MESSAGES } from "../../../consatnts/errorMessages";
import { POP_UP_MESSAGE } from "../../../consatnts/pop-upMessage";
import { StatusbarUI } from "../../../StatusBarUI";

const { getShowInfoMessages } = Config;
export class ServerObserver {
  constructor() {
    ServerEvents.on(ServerEventTypes.START, (port: number) => {
      this.onStart(port);
    });
    ServerEvents.on(ServerEventTypes.STOP, this.onStop);
    ServerEvents.on(ServerEventTypes.NOT_RUNNING, this.onNotRunning);
    ServerEvents.on(ServerEventTypes.ERROR, this.onError);
    ServerEvents.on(ServerEventTypes.NO_ACTIVE_PATH, () => {
      vscode.window.showErrorMessage(ERROR_MESSAGES.NO_ACTIVE_PATH);
    });
  }

  private onStart(port: number | any) {
    if (getShowInfoMessages()) {
      vscode.window.showInformationMessage(
        POP_UP_MESSAGE.SERVER_STARTED.replace(/__PORT__/g, port)
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
      `${POP_UP_MESSAGE.SERVER_ERROR}: ${error.message}`
    );
    StatusbarUI.run();
  }
}
