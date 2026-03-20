import { statusOutput } from "./output";
import qrcode from "qrcode-terminal";
import { statusEvents } from "./StatusEventEmitter";
import { StartPayload } from "../../../../Types";

export class StatusObserver {
  constructor() {}
  public init() {
    statusEvents.on(
      "start",
      (status: {
        on: boolean;
        port: number;
        isPublicAccessEnabled: boolean;
        publicUrl: string;
      }) => {
        this.onStart(status);
      },
    );

    statusEvents.on("stop", () => {
      this.onStop();
    });
    statusEvents.on("show", () => {
      this.onShow();
    });
    statusEvents.on("hide", () => {
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
  }: StartPayload) {
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
    statusEvents.removeAllListeners();
  }
}
