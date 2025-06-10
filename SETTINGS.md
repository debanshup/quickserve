# Settings

This extension contributes the following settings:

1. **`quickserve.httpServer.port`**: Customise port of http server. **Default**: `3000`
2. **`quickserve.wsServer.port`**: Customise port of websocket server. **Default**: `5000`
3. **`quickserve.auto-reload`**: Enable or disable auto-reload on file changes. **Default**: `true`
4. **`quickserve.show-statusbar`**: Toggle display of status bar updates. **Default**: `true`
5. **`quickserve.showInfoMessages`**: Toggle display of informational pop-ups like "Server Started" and "File Changed". **Default**: `true`.
6. **`quickserve.ignoredFiles`**: List of files to ignore when watching for changes.
**Default**:

```bash
[  ".git",
   ".vscode",
   ".github",
   ".ts",
   ".js",
   ".log",
]
```

7. **`quickserve.logLevel`**: Controls how much logging output is shown by QuickServe.

- **`error`** – Logs only critical errors. Use this in production to avoid unnecessary output.
- **`warn`** – Logs warnings and errors. Helps identify potential issues without too much noise.
- **`info`** – Logs general information, warnings, and errors. Recommended for most users.
- **`http`** – Includes HTTP request and response logs along with info-level messages.
- **`verbose`** – Provides detailed internal logs. Useful for understanding extension flow.
- **`debug`** – Shows in-depth debug information.
- **`silly`** – Logs everything, including very low-level or excessive internal events. Use only when needed.
**Default:** `info`
