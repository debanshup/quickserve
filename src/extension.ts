import * as vscode from "vscode";
import { App } from "./app/App";
import { checkVersion } from "./utils/helper";
export async function activate(context: vscode.ExtensionContext) {
  await checkVersion(context);
  const app: App = new App();
  context.subscriptions.push(
    vscode.commands.registerCommand("quickserve.run", async () => {
      await app.start();
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("quickserve.kill", async () => {
      await app.stop();
    })
  );
  context.subscriptions.push(app);
}
export function deactivate() {}
