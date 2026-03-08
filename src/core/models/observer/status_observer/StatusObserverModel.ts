import { statusOutput } from "./output";
import qrcode from "qrcode-terminal";
import { StatusEvents, StatusEventTypes } from "./StatusEventEmitter";

export class StatusObserver {
  constructor() {
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
    statusOutput.appendLine(`Running: ${on}`);
    statusOutput.appendLine(`Port: ${port}`);
    statusOutput.appendLine(`Public access enabled: ${isPublicAccessEnabled}`);
    if (isPublicAccessEnabled) {
      statusOutput.appendLine(`Public URL: ${publicUrl}`);

      qrcode.generate(publicUrl, { small: true }, (qr) => {
        statusOutput.appendLine(qr);
      });

      statusOutput.appendLine("Scan QR to access");
    }
    //  show status output
    // statusOutput.show(true);
  }

  private onStop() {
    statusOutput.clear();
    statusOutput.appendLine("Server stopped");
  }
}
