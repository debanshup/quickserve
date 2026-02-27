import * as vscode from "vscode";
import {
  BINARY_EXTENSIONS,
  MARKDOWN_EXTENSIONS,
  SCRIPT_EXTENSIONS,
  STYLE_EXTENSIONS,
  TEXT_EXTENSIONS,
} from "../consatnts/supported-extension";
import path from "path";
import { marked } from "marked";
import fs from "fs";
import * as fsPromise from "fs/promises";
import { Config } from "./config";
import { HOST } from "../consatnts/host";
const { getHttpServerPort, isPublicAccessEnabled } = Config;
import os from "os";
import { PATH } from "../consatnts/path";
// all text extension
const ALL_TEXT_EXTS = new Set([
  ...TEXT_EXTENSIONS,
  ...MARKDOWN_EXTENSIONS,
  ...SCRIPT_EXTENSIONS,
  ...STYLE_EXTENSIONS,
]);
/**
 *
 * @returns ports available to use
 */
export async function getAvailablePort() {
  const getPortModule = await import("get-port");
  getPortModule.clearLockedPorts();
  const getPort = getPortModule.default;
  const portNumbers = getPortModule.portNumbers;
  const defaultHTTPServerPort = getHttpServerPort();
  const httpServerPort = await getPort({
    port: portNumbers(defaultHTTPServerPort!, 65535),
  });
  return httpServerPort;
}

/**
 * Returns the appropriate host based on user setting.
 *
 * @returns {string} `'0.0.0.0'` if public access is enabled, otherwise `127.0.0.1`.
 */
export function getHost(): string {
  return isPublicAccessEnabled() ? HOST.LAN : HOST.LOCALHOST;
}

/**
 * Returns the first non-internal IPv4 address of the machine.
 * Useful for accessing the server from other devices on the same network.
 * Falls back to "localhost" if no external interface is found.
 *
 * @returns {string} The local IP address (e.g., "192.168.1.x") or "localhost.
 */
export function getLocalIP(): string {
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

export function getConnectionURI(
  protocol: "https:" | "http:",
  ip: string,
  port: number | null,
  relativePath: string,
) {
  return vscode.Uri.parse(
    `${protocol}//${ip}:${port}/${relativePath.replace(/\\/g, "/")}`,
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
export function isSupportedFile(ext: string): boolean {
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
export function getFileExtension(pathName: string) {
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
export function isEditableFile(ext: string): boolean {
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

export function isBinary(ext: string) {
  const normalizedExt = ext.toLowerCase();
  return BINARY_EXTENSIONS.includes(normalizedExt);
}

/**
 * Gets the current VS Code workspace folders.
 *
 * @returns An array of workspace folders if opened, otherwise `undefined`.
 *
 */

export function getCurrentWorkpace():
  | readonly vscode.WorkspaceFolder[]
  | undefined {
  return vscode.workspace.workspaceFolders;
}

/**
 *
 * @returns current file path
 */
export function getCurrentFile() {
  const file: vscode.TextDocument | undefined =
    vscode.window.activeTextEditor?.document;
  return file?.fileName!;
}

/**
 *
 * @param fullPath
 * @returns relative path
 */

export function getRelativeFilePath(fullPath: string) {
  const workspaceFolders = vscode.workspace.workspaceFolders!;

  if (!workspaceFolders || workspaceFolders.length === 0) {
    // console.log("no workspace");
    return undefined;
  }
  return path.relative(workspaceFolders![0].uri.fsPath, path.resolve(fullPath));
}

/**
 *
 * @returns current directory
 */

export function getCurrentDir(): string | undefined {
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
export function pathExists(path: string): boolean {
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
export function getFileContent(data: string | Buffer, ext: string) {
  const normalizedExt = ext.toLowerCase();

  if (
    STYLE_EXTENSIONS.includes(normalizedExt) ||
    SCRIPT_EXTENSIONS.includes(normalizedExt) ||
    TEXT_EXTENSIONS.includes(normalizedExt)
  ) {
    return data.toString("utf-8");
  } else if (MARKDOWN_EXTENSIONS.includes(normalizedExt)) {
    return marked.parse(data.toString("utf-8"), { async: false });
  } else if (BINARY_EXTENSIONS.includes(normalizedExt)) {
    // return raw for binary files
    return data;
  }

  return null;
}

export async function processFilesafely(filePath: string) {
  const MAX_AST_PARSE_SIZE = 5 * 1024 * 1024; // 5 mb
  const ext = path.extname(filePath).toLowerCase();
  const isText = ALL_TEXT_EXTS.has(ext);
  const encoding = (isText ? "utf-8" : undefined) as BufferEncoding | undefined;

  const stats = await fsPromise.stat(filePath);
  if (stats.size < MAX_AST_PARSE_SIZE) {
    const data = await fsPromise.readFile(filePath, { encoding });
    return {
      type: isText ? "text" : "binary",
      path: filePath,
      size: stats.size,
      data: data, // string if isText, Buffer if not
      contentType: getMimeType(ext),
    };
  }
  const stream = fs.createReadStream(filePath, { encoding });

  if (isText) {
    let textContent = "";
    for await (const chunk of stream) {
      textContent += chunk;
    }
    return {
      type: "text",
      data: textContent,
      path: filePath,
      size: stats.size,
      contentType: getMimeType(ext),
    };
  }
  return {
    type: "binary",
    data: stream, // Returning the stream itself for the consumer to handle
    path: filePath,
    size: stats.size,
    contentType: getMimeType(ext),
  };
}

/**
 * Checks if a file type supports script injection (e.g., HTML or Markdown).
 *
 * @param ext - file extension (e.g., ".html", ".md")
 * @returns `true` if script can be injected, else `false`
 */
export function supportsScriptInjection(ext: string): boolean {
  const normalizedExt = ext.toLowerCase();
  return (
    normalizedExt === ".html" ||
    normalizedExt === ".htm" ||
    MARKDOWN_EXTENSIONS.includes(normalizedExt)
  );
}

/**
 *  @function listFilesRecursive(dir) recursively list all the files of a specified directory.
 */
export function listFilesRecursive(dir: string, baseDir: string): any[] {
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
        children: listFilesRecursive(fullPath, baseDir),
      }),
    };
  });
}

/**
 *
 * @param path
 * @returns true if path is a folder else false
 */
export function isFolder(path: fs.PathLike) {
  try {
    const isDir = fs.lstatSync(path).isDirectory();
    return isDir;
  } catch (error) {
    throw error;
    // return false;
  }
}

/**
 *
 * @returns auto reload script to be injected within current file
 */
export function getReloadScript() {
  return `
    <script>
      (function() {
        const proto = location.protocol === "https:" ? "wss" : "ws";
        const ws = new WebSocket(\`\${proto}://\${location.host}\`);

        ws.onopen = () => console.log("[HMR] Connected to Dev Server");
        ws.onerror = (err) => console.error("[HMR] WebSocket Error:", err);

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            
            if (msg.action === "reload") {
              console.log("[HMR] Full reload triggered.");
              location.reload();
            } 
            else if (msg.action === "inject") {
              console.log("[HMR] Hot injecting changes...");
              
              // 1. Hot Swap the Body
              if (msg.body !== undefined) {
                document.body.innerHTML = msg.body;
              }

              // 2. Hot Swap the Styles
              if (msg.style !== undefined) {
                let styleTag = document.getElementById("hmr-injected-styles");
                
                // Create the style tag if it's the first time injecting
                if (!styleTag) {
                  styleTag = document.createElement("style");
                  styleTag.id = "hmr-injected-styles";
                  document.head.appendChild(styleTag);
                }
                
                styleTag.innerHTML = msg.style;
              }
            }
          } catch (e) {
            console.error("[HMR] Failed to process message:", e);
          }
        };
      })();
    </script>
  `;
}

export function getStatusCode(errorCode?: string): number {
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
 * Asynchronously loads the file browser UI HTML, injecting runtime values for port, file tree, and root path.
 *
 * @param port - The HTTP server port to be injected into the UI.
 * @param fullPath - The root directory path to be displayed in the file browser.
 * @param file_tree - An array representing the file tree structure to be rendered in the UI.
 * @returns HTML string of the file browser UI with injected values.
 *
 * The method reads the file browser HTML template, replaces placeholders (__PORT__, __FILE_TREE__, __ROOT__)
 * with the provided runtime values, and returns the resulting HTML string.
 */
export function getFileBrowserUi(
  port: number,
  fullPath: string,
  file_tree: any[],
) {
  const fileBrowserPath = path.join(__dirname, PATH.FILE_BROWSER_PAGE);
  const data = fs.readFileSync(fileBrowserPath, "utf-8");
  return data
    .replace(/__PORT__/g, port.toString())
    .replace(/__FILE_TREE__/g, JSON.stringify(file_tree))
    .replace(/__ROOT__/g, fullPath);
}

export function getErrorPage(statusCode: number, stack: string) {
  const errorPath = path.join(__dirname, PATH.ERROR_PAGE);
  // console.info("error_page_path", path);
  const data = fs.readFileSync(errorPath, "utf-8");
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
export function getMimeType(ext: string): string {
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

export async function checkVersion(ctx: vscode.ExtensionContext) {
  const extensionId = "debanshupanigrahi.quickserve";
  const extension = vscode.extensions.getExtension(extensionId);
  const currentVersion = extension?.packageJSON.version;
  const previousVersion = ctx.globalState.get<string>("extensionVersion");
  console.log(currentVersion, previousVersion);
  let uri;
  // clean install
  if (!previousVersion) {
    console.log("clean install");
    uri = vscode.Uri.joinPath(ctx.extensionUri, "README.md");
    await vscode.commands.executeCommand("markdown.showPreview", uri);
    await ctx.globalState.update("extensionVersion", currentVersion);
    return;
  }

  // update
  if (previousVersion !== currentVersion) {
    console.log("update");

    uri = vscode.Uri.joinPath(ctx.extensionUri, "CHANGELOG.md");

    await vscode.commands.executeCommand("markdown.showPreview", uri);

    await ctx.globalState.update("extensionVersion", currentVersion);
  }
}
