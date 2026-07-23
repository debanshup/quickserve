# QuickServe Configuration

## Core Settings

1. **`quickserve.port`**: The port on which the server runs. If already in use, server may fail to start.  
   **Default**: `3000`

2. **`quickserve.enableWatcher`**: Start background file watcher for detecting changes (required for reload + HMR).  
   **Default**: `true`

3. **`quickserve.enableHMR`**: Enable Hot Module Replacement for instant updates without full reload.  
   **Default**: `false`

4. **`quickserve.ignoredFiles`**: List of fully qualified file paths or glob patterns to exclude from live reload watching.  
   **Default**: `["node_modules/**", ".git/**", "**/.DS_Store"]`

---

## Network Settings

1. **`quickserve.publicAccess`**: Allow access from other devices on the same network (Wi-Fi, USB).  
   **Default**: `true`

---

## HTTPS & SSL

1. **`quickserve.https`**: Enable HTTPS for features requiring **secure context** (Service Workers, Clipboard API, etc.)
   - **Self-Healing Mode**:
     1. With `mkcert`: Generates a **trusted local certificate** (local install required)
     2. Fallback: Generates a **self-signed certificate** (browser warning)

   - **Options**:
     - **`enable`**: Activate HTTPS  
       **Default**: `false`
     - **`certPath`**: Path to SSL certificate (`.crt` / `.pem`)  
       **Default**: `""`
     - **`keyPath`**: Path to SSL key file (`.key`)  
       **Default**: `""`

---

## UI & Developer Experience

1. **`quickserve.showStatusbar`**: Show QuickServe controls in VS Code status bar.  
   **Default**: `true`

2. **`quickserve.showInfoMessages`**: Show notifications for server events (Start, Stop, Errors).  
   **Default**: `true`

3. **`quickserve.showServerStatusOnStart`**: Auto open output panel with URL + QR code on server start.  
   **Default**: `true`

4. **`quickserve.openWith`**: Controls where the preview opens when the server starts.  
   **Default**: `"browser"`
   - `"browser"` — Opens the project in your default external browser.
   - `"internalWebview"` — Opens the project inside a VS Code internal Webview panel (required for in-editor device emulation).
   - `"none"` — Do nothing when the server starts.
