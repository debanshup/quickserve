import qrcode from "qrcode-terminal";
import { StartPayload } from "../../Types";
import * as vscode from "vscode";
export const statusOutputChannel =
  vscode.window.createOutputChannel("quickserve:status");

export class QRCodeRenderer {
  static start({
    port,
    isPublicAccessEnabled = false,
    publicUrl = "",
  }: StartPayload) {
    statusOutputChannel.clear();
    statusOutputChannel.appendLine("QuickServe initialized successfully.");
    statusOutputChannel.appendLine(`[Port]   ${port}`);

    if (isPublicAccessEnabled && publicUrl) {
      statusOutputChannel.appendLine(`[Public] ${publicUrl}`);
      statusOutputChannel.appendLine("");

      qrcode.generate(publicUrl, { small: true }, (qr) => {
        statusOutputChannel.appendLine(qr);
      });

      statusOutputChannel.appendLine(
        "Scan the QR code above to access via mobile.",
      );
    } else {
      statusOutputChannel.appendLine("[Public] Access Disabled.");
    }
  }

  static show() {
    statusOutputChannel.show();
  }
  static hide() {
    statusOutputChannel.hide();
  }

  static stop() {
    statusOutputChannel.clear();
    statusOutputChannel.appendLine("Server stopped");
  }
}
