<!-- markdownlint-disable MD033 -->

# QuickServe

## ![Logo](https://github.com/debanshup/quickserve/blob/main/images/logo.png?raw=true)

[![VS Code Marketplace](https://img.shields.io/badge/VS%20Code-Marketplace-blue?logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=debanshupanigrahi.quickserve)
[![GitHub issues](https://img.shields.io/github/issues/debanshup/quickserve)](https://github.com/debanshup/quickserve/issues)
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg?style=flat)](https://github.com/debanshup/quickserve/blob/main/LICENSE)

**QuickServe** is a zero-config local development server for VSCode. Open a workspace, start the server, and instantly preview your HTML and Markdown files — no setup, no config, no friction.

---

## Demo

![Demo](https://github.com/debanshup/quickserve-assets/blob/main/images/instructions/demo.gif?raw=true)

### In-Editor Device Emulation

Test responsive layouts without leaving your code or opening external browser devtools. QuickServe leverages VS Code's native integrated browser to provide seamless mobile testing right next to your files.

![Emulation](https://github.com/debanshup/quickserve-assets/blob/main/emulation_output.gif?raw=true)

- **Zero Context Switching:** Toggle between standard mobile viewports (iPhone, Pixel, iPad) natively.
- **Preserves HMR:** AST-driven surgical reloads pipe directly into the emulated device.
- **Unobtrusive Execution:** Snaps instantly to a side-by-side split pane without stealing your editor focus.

 **To enable:** Set `quickserve.openWith` to `"internalWebview"` in your VS Code settings. 
 For more details, see [settings](https://github.com/debanshup/quickserve/blob/main/SETTINGS.md).

## Features

- **One-click server** — start and stop directly from the VSCode status bar
- **Open with QuickServe** — right-click any `.html` or `.md` file to open it instantly in the browser
- **Live preview** — instant browser preview for `.html` and `.md` files
- **Auto-reload** — browser reloads automatically on file save (`.html` and `.md` only)
- **HMR** — hot module replacement for faster, state-preserving updates
- **Deep dependency graph** — tracks file relationships for accurate change detection
- **Self-healing HTTPS** — zero-config HTTPS that automatically recovers broken configurations (requires `mkcert` installed)
- **QR code for mobile** — scan to open your local server on any device on the same network
- **In-editor device emulation** — test responsive mobile layouts side-by-side without leaving VS Code
- **File exclusions** — exclude specific files from change detection
- **Customizable port** — configure the server port to fit your setup
- **Broad file support** — serves any file type, not just HTML and Markdown

---

## Installation

1. Open VSCode
2. Press `Ctrl+P` (or `Cmd+P` on Mac) and run:

```bash
ext install debanshupanigrahi.quickserve
```

> **Tip:** You can also search **QuickServe** directly in the Extensions sidebar (`Ctrl+Shift+X`).

---

## How to Use

### 1. Start the server

Click the QuickServe button in the status bar, or use the command palette (`Ctrl+Shift+P`) and run **quickserve.run**.

![Start server](https://github.com/debanshup/quickserve-assets/blob/main/images/instructions/start_server.png?raw=true)

### 2. Open the output panel

To see server logs and the local URL, open the Output panel and select **QuickServe** from the drop
down.

![Output panel](https://github.com/debanshup/quickserve-assets/blob/main/images/instructions/log_output.png?raw=true)

### 3. Access on mobile

Scan the QR code shown in the output panel to instantly open the server on any mobile device connected to the same network.

![Access](https://github.com/debanshup/quickserve-assets/blob/main/images/instructions/qr_code_demo.png?raw=true)

### 4. Stop the server

Click the QuickServe button in the status bar, or use the command palette (`Ctrl+Shift+P`) and run **quickserve.kill**.

![Stop server](https://github.com/debanshup/quickserve-assets/blob/main/images/instructions/stop_server.png?raw=true)

---

## Configuration

For all available settings and configuration options, see [SETTINGS.md](https://github.com/debanshup/quickserve/blob/main/SETTINGS.md).

---

## Known Limitations

- **Multi-root workspaces** — QuickServe currently serves the primary (first) folder in your workspace. Full multi-root support is planned for a future release.
- **Auto-reload scope** — live reload and HMR are only available for `.html` and `.md` files. Other file types are served statically.

---

## Changelog

For a full list of changes across versions, see [CHANGELOG.md](https://github.com/debanshup/quickserve/blob/main/CHANGELOG.md).

---

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](https://github.com/debanshup/quickserve/blob/main/CONTRIBUTING.md) to get started.

---

## License

This project is licensed under the [MIT](https://github.com/debanshup/quickserve/blob/main/LICENSE) license.
