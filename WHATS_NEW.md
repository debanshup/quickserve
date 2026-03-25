# What's New in QuickServe

## [1.2.0] (2026-03-25)

### Added

- **Zero-config HTTPS** — HTTPS works out of the box with self-healing support, so broken SSL configurations are automatically recovered without any manual intervention
- **Deep dependency graph** — builds a thorough map of your project's dependencies, enabling smarter change detection and more reliable reloads
- **HMR (Hot Module Replacement)** — pushes only the changed modules to the browser instantly, keeping app state intact without a full page reload
- **QR code to open with mobile** — generates a QR code on startup so you can instantly open your local server on any mobile device on the same network
- **Smart reload strategy** — analyzes what changed and decides the most efficient reload approach, avoiding unnecessary full reloads when a partial update is enough
- **Open with QuickServe** — right-click any `.html` or `.md` file to open it instantly in the browser without navigating manually

### Fixed

- **Stability issue** — resolved intermittent crashes and unexpected shutdowns that occurred during long-running sessions
- **File processing** — fixed incorrect handling of certain file types that caused them to be served malformed or skipped entirely
- **Script injection strategy** — corrected how scripts are injected into served pages, preventing conflicts and broken behavior in some project setups
- **Filepath resolving** — fixed edge cases where file paths with special characters, spaces, or unusual structures failed to resolve correctly
