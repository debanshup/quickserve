import * as vscode from "vscode";
import { App } from "./app/App";
import { checkVersion } from "./utils/helper";
export async function activate(context: vscode.ExtensionContext) {
  console.info("activating...");
  try {
    await checkVersion(context);
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
    context.subscriptions.push(app);
  } catch (error) {
    console.error("Activation error:", error);
    throw error;
  }
}
export function deactivate() {}
