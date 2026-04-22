import * as vscode from "vscode";
import {
  BINARY_EXTENSIONS,
  MARKDOWN_EXTENSIONS,
  SCRIPT_EXTENSIONS,
  STYLE_EXTENSIONS,
  TEXT_EXTENSIONS,
} from "../constants/supported-extension";
import path from "path";
import { marked } from "marked";
import fs from "fs";
import * as fsPromise from "fs/promises";
import { Config } from "./config";
import { HOST } from "../constants/host";
const { getHttpServerPort, getPublicAccessEnabled } = Config;
import os from "os";
import { PATH } from "../constants/path";
import { HMR_CLIENT } from "../constants/reload-client";
import { ServerContext } from "../store/ServerContext";
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
  return getPublicAccessEnabled() ? HOST.LAN : HOST.LOCALHOST;
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
 *
 * @param workspaceRootPath
 * @returns the relative file path, or an empty string if an invalid tab is open.
 */

export function getSafeRelativePath(workspaceRootPath: string) {
  const editor = vscode.window.activeTextEditor;
  console.info("root path:", workspaceRootPath);
  // console.info("scheme:", editor!.document.uri.scheme);
  if (!editor || editor.document.uri.scheme !== "file") {
    return "";
  }
  const activePath = editor.document.uri.fsPath;
  console.info("active path:", activePath);
  if (activePath.startsWith(workspaceRootPath)) {
    return path.relative(workspaceRootPath, activePath);
  }
  return "";
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
  if (!file) {
    return undefined;
  }

  const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

  const filePath = file?.fileName!;

  if (!root || !filePath.startsWith(root)) {
    return null;
  }

  return filePath;
}

/**
 *
 * @param fullPath
 * @returns relative path
 */

export function getRelativeFilePath(fullPath: string) {
  const relative = vscode.workspace.asRelativePath(fullPath, false);
  return relative.replace(/\\/g, "/");
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
 *
 * @param bodyContent
 * @param title
 *  used to wrap md content within html document
 */
export function wrapHtmlDocument(
  bodyContent: string,
  title: string = "Preview",
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    :root {
      --bg-color: #ffffff;
      --text-color: #24292f;
      --text-muted: #57606a;
      --border-color: #d0d7de;
      --code-bg: #f6f8fa;
      --pre-bg: #f6f8fa;
      --link-color: #0969da;
      --table-row-alt: #f6f8fa;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg-color: #0d1117;
        --text-color: #c9d1d9;
        --text-muted: #8b949e;
        --border-color: #30363d;
        --code-bg: rgba(110, 118, 129, 0.4);
        --pre-bg: #161b22;
        --link-color: #58a6ff;
        --table-row-alt: #161b22;
      }
    }

    body { 
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"; 
      line-height: 1.5; 
      max-width: 900px; 
      margin: 0 auto; 
      padding: 2rem 1rem; 
      background-color: var(--bg-color);
      color: var(--text-color); 
      word-wrap: break-word;
    }
    
    a { color: var(--link-color); text-decoration: none; }
    a:hover { text-decoration: underline; }

    h1, h2 { 
      border-bottom: 1px solid var(--border-color); 
      padding-bottom: 0.3em; 
      margin-top: 24px; 
      margin-bottom: 16px; 
    }
    
    h1, h2, h3, h4, h5, h6 { 
      margin-top: 24px; 
      margin-bottom: 16px; 
      font-weight: 600; 
      line-height: 1.25; 
    }

    pre { 
      background-color: var(--pre-bg); 
      padding: 16px; 
      border-radius: 6px; 
      overflow-x: auto; 
      border: 1px solid var(--border-color);
    }
    
    code { 
      background-color: var(--code-bg); 
      padding: 0.2em 0.4em; 
      border-radius: 6px; 
      font-size: 85%; 
      font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace; 
    }
    
    pre code { 
      background-color: transparent; 
      padding: 0; 
      font-size: 100%; 
      border: 0; 
    }

    img { max-width: 100%; box-sizing: content-box; background-color: var(--bg-color); }
    
    blockquote { 
      border-left: 0.25em solid var(--border-color); 
      margin: 0; 
      padding: 0 1em; 
      color: var(--text-muted); 
    }
    
    table { border-collapse: collapse; width: 100%; margin-top: 0; margin-bottom: 16px; }
    th, td { border: 1px solid var(--border-color); padding: 6px 13px; }
    tr { background-color: var(--bg-color); border-top: 1px solid var(--border-color); }
    tr:nth-child(2n) { background-color: var(--table-row-alt); }
    
    hr {
      height: 0.25em;
      padding: 0;
      margin: 24px 0;
      background-color: var(--border-color);
      border: 0;
    }
  </style>
</head>
<body>
  ${bodyContent}
</body>
</html>`;
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

export async function processFileSafely(filePath: string) {
  let stats;
  try {
    stats = await fsPromise.stat(filePath);
  } catch (error) {
    return null;
  }

  const MAX_AST_PARSE_SIZE = 5 * 1024 * 1024; // 5 mb
  const ext = path.extname(filePath).toLowerCase();
  const isText = ALL_TEXT_EXTS.has(ext);
  const encoding = (isText ? "utf-8" : undefined) as BufferEncoding | undefined;

  if (stats.size < MAX_AST_PARSE_SIZE) {
    const data = await fsPromise.readFile(filePath, { encoding });
    let parsedData = data;
    let finalContentType = getMimeType(ext);
    if (MARKDOWN_EXTENSIONS.includes(ext)) {
      const rawHtml = marked.parse(data as string, { async: false });
      parsedData = wrapHtmlDocument(rawHtml as string, path.basename(filePath));
      finalContentType = "text/html";
    }
    return {
      type: isText ? "text" : "binary",
      path: filePath,
      size: stats.size,
      data: parsedData,
      contentType: finalContentType,
    };
  }
  const stream = fs.createReadStream(filePath, { encoding });

  if (isText) {
    const chunks: string[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const textContent = chunks.join("");
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
 *  @function listFilesRecursive(dir) recursively list all the files (excluding node_modules) of a specified directory.
 */
export function listFilesRecursive(dir: string, baseDir: string): any[] {
  return (
    fs
      .readdirSync(dir)
      // filter node_modules
      .filter((file) => file.toLowerCase() !== "node_modules")
      .map((file) => {
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
      })
  );
}

/**
 *
 * @param path
 * @returns true if path is a folder else false
 */
export function isFolder(path: fs.PathLike) {
  try {
    if (!fs.existsSync(path)) {
      return false;
    }
    const isDir = fs.lstatSync(path).isDirectory();
    return isDir;
  } catch (error) {
    // throw error;
    return false;
  }
}

/**
 *
 * @returns auto reload script to be injected within current file
 */
export function getReloadScript() {
  // console.info(HMR_CLIENT);

  return `
    <script>
    ${HMR_CLIENT}
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

export async function handleVersionUpdate(ctx: vscode.ExtensionContext) {
  const extensionId = "debanshupanigrahi.quickserve";
  const extension = vscode.extensions.getExtension(extensionId);
  const currentVersion = extension?.packageJSON.version;
  const previousVersion = ctx.globalState.get<string>("extensionVersion");
  //clean Install
  if (!previousVersion) {
    const uri = vscode.Uri.joinPath(ctx.extensionUri, "README.md");
    await vscode.commands.executeCommand("markdown.showPreview", uri);
    await ctx.globalState.update("extensionVersion", currentVersion);
    return;
  }

  // updated
  if (previousVersion !== currentVersion) {
    const uri = vscode.Uri.joinPath(ctx.extensionUri, "WHATS_NEW.md");
    await vscode.commands.executeCommand("markdown.showPreview", uri);
    await ctx.globalState.update("extensionVersion", currentVersion);
  }
}

/**
 * Safely opens a specific file in the browser via QuickServe.
 * If no URI is provided, it falls back to the currently active editor tab.
 */

export function openWithQuickServe(clickedUri?: vscode.Uri): void {
  let targetUri = clickedUri;

  if (!targetUri && vscode.window.activeTextEditor) {
    targetUri = vscode.window.activeTextEditor.document.uri;
  }

  if (!targetUri || targetUri.scheme !== "file") {
    return;
  }

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    return;
  }

  const rootPath = workspaceFolder.uri.fsPath;
  const filePath = targetUri.fsPath;

  if (filePath.startsWith(rootPath)) {
    const relativePath = path.relative(rootPath, filePath);
    const port = ServerContext.port;
    const proto = ServerContext.proto;
    const host = ServerContext.host;
    const uriToOpen = getConnectionURI(proto, host, port, relativePath);
    vscode.env.openExternal(uriToOpen);
  } else {
    vscode.window.showWarningMessage(
      "This file is outside the currently served QuickServe directory.",
    );
  }
}
