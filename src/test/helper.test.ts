import * as assert from "assert";
import * as vscode from "vscode";
import * as Helper from "../utils/helper";
const {
  getAvailablePort,
  getFileExtension,
  isSupportedFile,
  getCurrentFile,
} = Helper;

suite("Helpers test", () => {
  test("isSupportedFile() should return true for supported extensions", () => {
    assert.strictEqual(isSupportedFile(".md"), true);
    assert.strictEqual(isSupportedFile(".html"), true);
    assert.strictEqual(isSupportedFile(".htm"), true);
    assert.strictEqual(isSupportedFile(".xyz"), false);
  });
  test("getFileExtension() should return correct extension", () => {
    // console.log(getFileExtension("test.md"));
    
    assert.strictEqual(getFileExtension("test.md"), ".md");
    assert.strictEqual(getFileExtension("folder/subfolder/test.html"), ".html");
  });
  test("getCurrentFile() should return path of opened file in code", () => {
    const result = getCurrentFile();
    // console.log(result);
    assert.strictEqual(result, vscode.window.activeTextEditor?.document.fileName!);
  });
  test("getAvailablePorts() returns available ports", async () => {
    const port = await getAvailablePort();
    console.log(port);
    assert.ok(port > 0);
  });
});
