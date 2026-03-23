import * as vscode from "vscode";
import { App } from "./app/App";
import { handleVersionUpdate, openWithQuickServe } from "./utils/helper";
import { ServerContext } from "./store/ServerContext";
// Make sure to import your App and checkVersion properly

export async function activate(context: vscode.ExtensionContext) {
  // console.info("activating...");
  try {
    await handleVersionUpdate(context);
    const app: App = new App();

    context.subscriptions.push(
      vscode.commands.registerCommand("quickserve.run", async () => {
        await app.start();
      }),
    );

    context.subscriptions.push(
      vscode.commands.registerCommand("quickserve.kill", async () => {
        await app.stop();
      }),
    );

    // flag to prevent notification spam
    let notificationPending = false;

    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((event) => {
        // check if it affects a QuickServe config AND the server is running
        if (
          event.affectsConfiguration("quickserve") &&
          ServerContext.isRunning
        ) {
          // show only 1 prompt
          if (!notificationPending) {
            notificationPending = true;

            vscode.window
              .showInformationMessage(
                "QuickServe configuration changed. Restart the server to apply the new settings.",
                "Restart QuickServe",
              )
              .then(async (selection) => {
                // reset the flag
                notificationPending = false;

                // reboot
                if (selection === "Restart QuickServe") {
                  await app.stop();
                  await app.start();
                }
              });
          }
        }
      }),
    );

    context.subscriptions.push(
      vscode.commands.registerCommand(
        "quickserve.openFile",
        async (clickedUri?: vscode.Uri) => {
          openWithQuickServe(clickedUri);
        },
      ),
    );
    context.subscriptions.push(app);
  } catch (error) {
    console.error("Activation error:", error);
    throw error;
  }
}

export function deactivate() {}
