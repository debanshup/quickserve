import { statusOutput } from "./output";
import qrcode from "qrcode-terminal";
import { StatusEvents, StatusEventTypes } from "./StatusEventEmitter";

export class StatusObserver {
  constructor() {}
  public init() {
    StatusEvents.on(
      StatusEventTypes.START,
      (status: {
        on: boolean;
        port: number;
        isPublicAccessEnabled: boolean;
        publicUrl: string;
      }) => {
        this.onStart(status);
      },
    );

    StatusEvents.on(StatusEventTypes.STOP, () => {
      this.onStop();
    });
    StatusEvents.on(StatusEventTypes.SHOW, () => {
      this.onShow();
    });
    StatusEvents.on(StatusEventTypes.HIDE, () => {
      this.onHide();
    });
  }
  private onShow() {
    statusOutput.show();
  }
  private onHide() {
    statusOutput.hide();
  }

  private onStart({
    on,
    port,
    isPublicAccessEnabled = false,
    publicUrl = "",
  }: {
    on: boolean;
    port: number;
    isPublicAccessEnabled: boolean;
    publicUrl: string;
  }) {
    statusOutput.clear();
    statusOutput.appendLine("QuickServe initialized successfully.");
    statusOutput.appendLine(`[Port]   ${port}`);

    if (isPublicAccessEnabled && publicUrl) {
      statusOutput.appendLine(`[Public] ${publicUrl}`);
      statusOutput.appendLine("");

      qrcode.generate(publicUrl, { small: true }, (qr) => {
        statusOutput.appendLine(qr);
      });

      statusOutput.appendLine("Scan the QR code above to access via mobile.");
    } else {
      statusOutput.appendLine("[Public] Access Disabled.");
    }
  }
  private onStop() {
    statusOutput.clear();
    statusOutput.appendLine("Server stopped");
  }

  public dispose() {
    StatusEvents.removeAllListeners(StatusEventTypes.ERROR);
    StatusEvents.removeAllListeners(StatusEventTypes.HIDE);
    StatusEvents.removeAllListeners(StatusEventTypes.SHOW);
    StatusEvents.removeAllListeners(StatusEventTypes.START);
    StatusEvents.removeAllListeners(StatusEventTypes.STOP);
  }
}
