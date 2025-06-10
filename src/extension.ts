import * as vscode from "vscode";
import "open";
import { App } from "./models/AppModel";
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  const app: App = new App();
  context.subscriptions.push(
    vscode.commands.registerCommand("quickserve.run", async () => {
      console.log("App started");
      
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
