import * as vscode from "vscode";
import {
  BINARY_EXTENSIONS,
  MARKDOWN_EXTENSIONS,
  SCRIPT_EXTENSIONS,
  STYLE_EXTENSIONS,
  TEXT_EXTENSIONS,
} from "./consatnts/supported-extension";
import path from "path";
import { marked } from "marked";
import fs from "fs";
const UI_PATH = {
  FILE_BROWSER_PAGE: path.join(__dirname, "../ui/dist/file-browser/index.html"),
  ERROR_PAGE: path.join(__dirname, "../ui/dist/error/index.html"),
};
import { Config } from "./config";
import { HOST } from "./consatnts/host";
const {
  getHttpServerPort,
  getWSServerPort,
  getIgnoredFileList,
  isPublicAccessEnabled,
} = Config;
import os from "os";
export class Helper {
  /**
   *
   * @returns ports available to use
   */
  public static async getAvailablePorts(): Promise<{
    httpServerPort: number;
    wssPort: number;
  }> {
    const getPortModule = await import("get-port");
    getPortModule.clearLockedPorts();
    const getPort = getPortModule.default;
    const portNumbers = getPortModule.portNumbers;
    const [defaultHTTPServerPort, defaultWSServerPort] = [
      getHttpServerPort(),
      getWSServerPort(),
    ];

    const [httpServerPort, wssPort] = await Promise.all([
      getPort({
        port: portNumbers(defaultHTTPServerPort!, defaultHTTPServerPort! + 100),
      }),
      getPort({
        port: portNumbers(defaultWSServerPort!, defaultWSServerPort! + 100),
      }),
    ]);
    return { httpServerPort, wssPort };
  }

  /**
   * Returns the appropriate host based on user setting.
   *
   * @returns {string} `'0.0.0.0'` if public access is enabled, otherwise `'localhost'`.
   */
  public static getHost(): string {
    return isPublicAccessEnabled() ? HOST.LAN : HOST.LOCALHOST;
  }

  /**
   * Returns the first non-internal IPv4 address of the machine.
   * Useful for accessing the server from other devices on the same network.
   * Falls back to "localhost" if no external interface is found.
   *
   * @returns {string} The local IP address (e.g., "192.168.1.x") or "localhost.
   */
  public static getLocalIP(): string {
    const interfaces = os.networkInterfaces();
    for (const name in interfaces) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === "IPv4" && !iface.internal) {
          return iface.address;
        }
      }
    }
    return "localhost"; // fallback
  }

  /**
   * Generates a URI for accessing a local server endpoint.
   *
   * @param port - The local server port number (e.g., 3000).
   * @param relativePath - The relative path to append to the URI.
   *                       Backslashes will be converted to forward slashes.
   * @returns A parsed VSCode URI pointing to the local endpoint.
   *
   * @example
   * getConnectionURI(3000, "docs/index.html")
   * // => vscode.Uri for "http://localhost:3000/docs/index.html"
   */

  public static getConnectionURI(
    ip: string,
    port: number,
    relativePath: string
  ) {
    return vscode.Uri.parse(
      `http://${ip}:${port}/${relativePath.replace(/\\/g, "/")}`
    );
  }

  /**
   * Checks if the given file extension is supported by the server.
   *
   * Supported extensions include styles, scripts, binary assets, markdown, and text files.
   *
   * @param ext - The file extension (including dot), e.g., ".js", ".css"
   * @returns `true` if the extension is supported; otherwise, `false`.
   */
  public static isSupportedFile(ext: string): boolean {
    const normalizedExt = ext.toLowerCase();
    return (
      STYLE_EXTENSIONS.includes(normalizedExt) ||
      SCRIPT_EXTENSIONS.includes(normalizedExt) ||
      MARKDOWN_EXTENSIONS.includes(normalizedExt) ||
      TEXT_EXTENSIONS.includes(normalizedExt) ||
      BINARY_EXTENSIONS.includes(normalizedExt)
    );
  }

  /**
   *
   * @param pathName
   * @returns file extension
   */
  public static getFileExtension(pathName: string) {
    return path.extname(pathName).toLowerCase();
  }

  /**
   * @unused
   * Checks if a file extension corresponds to an editable file type.
   *
   * Editable files include stylesheets, scripts, markdown, and plain text files.
   *
   * @param ext - The file extension (including dot), e.g., ".js", ".css"
   * @returns `true` if the file is editable; otherwise, `false`.
   * @see supportsScriptInjection
   */
  public static isEditableFile(ext: string): boolean {
    const normalizedExt = ext.toLowerCase();
    return (
      STYLE_EXTENSIONS.includes(normalizedExt) ||
      SCRIPT_EXTENSIONS.includes(normalizedExt) ||
      MARKDOWN_EXTENSIONS.includes(normalizedExt) ||
      TEXT_EXTENSIONS.includes(normalizedExt)
    );
  }

  /**
   *
   * @param ext
   * @returns checks if the file is binary
   */

  public static isBinary(ext: string) {
    const normalizedExt = ext.toLowerCase();
    return BINARY_EXTENSIONS.includes(normalizedExt);
  }

  /**
   * Gets the current VS Code workspace folders.
   *
   * @returns An array of workspace folders if opened, otherwise `undefined`.
   *
   */

  public static getCurrentWorkpace():
    | readonly vscode.WorkspaceFolder[]
    | undefined {
    return vscode.workspace.workspaceFolders;
  }

  /**
   *
   * @returns current file path
   */
  public static getCurrentFile() {
    const file: vscode.TextDocument | undefined =
      vscode.window.activeTextEditor?.document;
    return file?.fileName!;
  }

  /**
   *
   * @param fullPath
   * @returns relative path
   */

  public static getRelativeFilePath(fullPath: string) {
    const workspaceFolders = vscode.workspace.workspaceFolders!;

    if (!workspaceFolders || workspaceFolders.length === 0) {
      // console.log("no workspace");
      return undefined;
    }
    return path.relative(
      workspaceFolders![0].uri.fsPath,
      path.resolve(fullPath)
    );
  }

  /**
   *
   * @returns current directory
   */

  public static getCurrentDir(): string | undefined {
    // console.log(vscode.workspace.workspaceFolders);

    const workspaceFolders = vscode.workspace.workspaceFolders!;

    if (!workspaceFolders || workspaceFolders.length === 0) {
      // console.log("no workspace");
      return undefined;
    }
    return workspaceFolders[0].uri.fsPath;
  }

  /**
   * Checks if a file or directory exists at the given path.
   *
   * @param path - The file system path to check.
   * @returns `true` if the path exists, otherwise `false`.
   */
  public static pathExists(path: string): boolean {
    try {
      return fs.existsSync(path);
    } catch {
      return false;
    }
  }

  /**
   * Returns processed content based on file extension.
   * - Text/Code: returned as string.
   * - Markdown: parsed to HTML.
   * - Binary: returned as base64 string.
   *
   * @param data - file data (string or Buffer)
   * @param ext - file extension
   */
  public static async getFileContent(
    data: string | Buffer,
    ext: string
  ): Promise<string | null | Buffer<ArrayBufferLike>> {
    const normalizedExt = ext.toLowerCase();

    if (
      STYLE_EXTENSIONS.includes(normalizedExt) ||
      SCRIPT_EXTENSIONS.includes(normalizedExt) ||
      TEXT_EXTENSIONS.includes(normalizedExt)
    ) {
      return data.toString("utf-8");
    } else if (MARKDOWN_EXTENSIONS.includes(normalizedExt)) {
      return await marked(data.toString("utf-8"));
    } else if (BINARY_EXTENSIONS.includes(normalizedExt)) {
      // return raw for binary files
      return data;
    }

    return null;
  }

  /**
   * Checks if a file type supports script injection (e.g., HTML or Markdown).
   *
   * @param ext - file extension (e.g., ".html", ".md")
   * @returns `true` if script can be injected, else `false`
   */
  public static supportsScriptInjection(ext: string): boolean {
    const normalizedExt = ext.toLowerCase();
    return (
      normalizedExt === ".html" || MARKDOWN_EXTENSIONS.includes(normalizedExt)
    );
  }

  /**
   *  @function listFilesRecursive(dir) recursively list all the files of a specified directory.
   */
  public static listFilesRecursive(dir: string, baseDir: string): any[] {
    return fs.readdirSync(dir).map((file) => {
      const fullPath = path.join(dir, file);
      const isDir = fs.lstatSync(fullPath).isDirectory();

      const relativePath = path
        .relative(baseDir, fullPath)
        .split(path.sep)
        .join("/"); // normalize

      return {
        name: file,
        type: isDir ? "folder" : "file",
        path: fullPath,
        url: `/${relativePath}`, // relative URL
        ...(isDir && {
          children: Helper.listFilesRecursive(fullPath, baseDir),
        }),
      };
    });
  }

  /**
   *
   * @param path
   * @returns true if path is a folder else false
   */
  public static isDirectory(path: fs.PathLike) {
    try {
      const isDir = fs.lstatSync(path).isDirectory();
      return isDir;
    } catch (error) {
      throw error;
      // return false;
    }
  }

  /**
   * Checks if a given file extension is in the ignored list (case-insensitive).
   *
   * @param extension - The file extension to check (e.g., "js", "txt").
   * @returns {boolean} True if the extension is ignored; otherwise, false.
   */
  public static isIgnored(extension: string): boolean {
    const ignoredList = getIgnoredFileList();
    if (ignoredList.length === 0) {
      return false;
    }
    return ignoredList
      .map((item) => item.toLowerCase())
      .includes(extension.toLowerCase());
  }

  /**
   *
   * @param wssPort
   * @returns auto reload script to be injected within current file
   */
  public static getReloadScript(ip: string, wssPort: number) {
    return `<script>
      const ws = new WebSocket('ws://${ip}:${wssPort.toString()}');
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.action === "reload") {
          location.reload();
        }
      };
    </script>`;
  }

  public static getStatusCode(errorCode?: string): number {
    switch (errorCode) {
      case "ENOENT":
        return 404;
      case "EACCES":
      case "EPERM":
        return 403;
      case "EISDIR":
      case "ENOTDIR":
      case "ENAMETOOLONG":
        return 400;
      case "EMFILE":
        return 503;
      case "EIO":
        return 500;
      default:
        return 500;
    }
  }

  /**
   * @unused
   * @returns full path of ui file
   */
  public static getFileBrowserUiPath() {
    return path.join(__dirname, UI_PATH.FILE_BROWSER_PAGE);
  }

  /**
   * Asynchronously loads the file browser UI HTML, injecting runtime values for port, file tree, and root path.
   *
   * @param port - The HTTP server port to be injected into the UI.
   * @param fullPath - The root directory path to be displayed in the file browser.
   * @param file_tree - An array representing the file tree structure to be rendered in the UI.
   * @returns A Promise that resolves to the HTML string of the file browser UI with injected values.
   *
   * The method reads the file browser HTML template, replaces placeholders (__PORT__, __FILE_TREE__, __ROOT__)
   * with the provided runtime values, and returns the resulting HTML string.
   */
  public static async getFileBrowserUi(
    port: number,
    fullPath: string,
    file_tree: any[]
  ) {
    const fileBrowserPath = path.join(UI_PATH.FILE_BROWSER_PAGE);
    const data = await fs.promises.readFile(fileBrowserPath, "utf-8");
    return data
      .replace(/__PORT__/g, port.toString())
      .replace(/__FILE_TREE__/g, JSON.stringify(file_tree))
      .replace(/__ROOT__/g, fullPath);
  }

  public static async getErrorPage(statusCode: number, stack: string) {
    const errorPath = path.join(UI_PATH.ERROR_PAGE);
    const data = await fs.promises.readFile(errorPath, "utf-8");
    return data
      .replace(/__STATUS_CODE__/g, statusCode.toString())
      .replace(/__STACK__/g, stack);
  }

  /**
   * Returns the correct MIME type based on file extension.
   *
   * @param ext - file extension (e.g., ".js", ".png")
   * @returns MIME type as string
   */
  public static getMimeType(ext: string): string {
    const types: Record<string, string> = {
      // HTML/Text
      ".html": "text/html",
      ".htm": "text/html",
      ".css": "text/css",
      ".md": "text/html",
      ".js": "application/javascript",
      ".json": "application/json",
      ".txt": "text/plain",
      ".csv": "text/csv",
      ".xml": "application/xml",

      // Images
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".svg": "image/svg+xml",
      ".webp": "image/webp",
      ".ico": "image/x-icon",

      // Fonts
      ".woff": "font/woff",
      ".woff2": "font/woff2",
      ".ttf": "font/ttf",
      ".eot": "application/vnd.ms-fontobject",
      ".otf": "font/otf",

      // Media
      ".mp3": "audio/mpeg",
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".avi": "video/x-msvideo",
      ".mov": "video/quicktime",

      // Other
      ".pdf": "application/pdf",
      ".zip": "application/zip",
      ".wasm": "application/wasm",
    };

    return types[ext.toLowerCase()] || "application/octet-stream";
  }
}
