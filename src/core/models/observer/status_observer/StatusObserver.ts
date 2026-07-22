import { QRCodeRenderer } from "../../../../add-ons/qr-code/QRCodeRenderer";
import { statusEvents } from "./StatusEventEmitter";

export class StatusObserver {
  constructor() {}
  public init() {
    statusEvents.on(
      "start",
      (payload: {
        port: number;
        isPublicAccessEnabled: boolean;
        publicUrl: string;
      }) => {
        QRCodeRenderer.start(payload);
      },
    );

    statusEvents.on("stop", () => {
      QRCodeRenderer.stop();
    });
    statusEvents.on("show", () => {
      QRCodeRenderer.show();
    });
    statusEvents.on("hide", () => {
      QRCodeRenderer.hide();
    });
  }

  public dispose() {
    statusEvents.removeAllListeners();
  }
}
