# What's New in QuickServe

## [1.4.0] (2026-07-23)

### Added

- **In-Editor Device Emulation** — Preview your project with a responsive mobile layout directly inside VS Code. Set `quickserve.openWith` to `"internalWebview"` to launch the preview in the built-in webview. _(Requires VS Code v1.109+ and Simple Browser enabled.)_

- **Custom Live Reload Exclusions** — Added the `quickserve.ignoredFiles` setting to exclude specific files or glob patterns (for example, `**/*.md` or `node_modules/**`) from triggering Live Reload.
