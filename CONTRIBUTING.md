# Contribution Guide

Thank you for considering contributing to QuickServe — a fast, zero-config local dev server. Every contribution, big or small, is appreciated.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Running Locally](#running-locally)
- [Making Changes](#making-changes)
- [Commit Guidelines](#commit-guidelines)
- [Testing](#testing)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Reporting Issues](#reporting-issues)
- [Getting Help](#getting-help)

---

## Getting Started

1. **Fork the repository** on GitHub

2. **Clone your fork** (replace `YOUR-USERNAME` with your actual GitHub username)

   ```bash
   git clone https://github.com/YOUR-USERNAME/quickserve.git
   cd quickserve
   ```

3. **Add the upstream remote** so you can pull in future updates

   ```bash
   git remote add upstream https://github.com/debanshup/quickserve.git
   ```

4. **Install dependencies**

   ```bash
   npm install
   ```

5. **Create a new branch** for your change

   ```bash
   git checkout -b your-branch-name
   ```

---

## Running Locally

Open the project in VSCode and press `F5` to launch the extension in a new **Extension Development Host** window. This lets you test your changes in a live VSCode instance with the debugger attached.

To compile the project:

```bash
npm run compile
```

To package the extension into a `.vsix` file:

```bash
vsce package
```

You can then install the `.vsix` locally via **Extensions → Install from VSIX** in VSCode to do a final sanity check before submitting.

---

## Making Changes

- Keep changes focused — one fix or feature per branch
- If you're working on something significant, consider opening an issue first to discuss the approach
- Add or update tests if your change affects existing behavior
- Run the linter before committing to catch formatting issues early:

  ```bash
  npm run lint
  ```

---

## Commit Guidelines

Use clear, consistent commit messages following this format:

```bash
git commit -m "type: short description"
```

| Type       | When to use                            | Example                                      |
| ---------- | -------------------------------------- | -------------------------------------------- |
| `feat`     | New feature                            | `feat: add QR code for mobile access`        |
| `fix`      | Bug fix                                | `fix: resolve filepath resolving on Windows` |
| `docs`     | Documentation changes                  | `docs: update contribution guide`            |
| `style`    | Formatting or style only               | `style: fix indentation in server.js`        |
| `refactor` | Code restructuring, no behavior change | `refactor: simplify HMR detection logic`     |
| `test`     | Adding or fixing tests                 | `test: add unit tests for dependency graph`  |
| `chore`    | Maintenance tasks                      | `chore: update dependencies`                 |

---

## Testing

Run the full test suite before pushing:

```bash
npm run test
```

QuickServe uses unit tests for core logic and integration tests for server behavior. If you're adding a new feature, please include tests where applicable. If you're fixing a bug, a regression test is always welcome.

---

## Submitting a Pull Request

1. Make sure your branch is up to date with upstream:

   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. Push your branch to your fork:

   ```bash
   git push origin your-branch-name
   ```

3. Open a pull request against the `main` branch on GitHub

4. In your PR description, include:
   - **What** the change does
   - **Why** it's needed
   - A reference to any related issue (e.g., `Closes #42`)

PRs should be scoped to a single concern. Avoid bundling unrelated changes — they're harder to review and slower to merge.

---

## Reporting Issues

Found a bug or have a feature request? Please [open an issue](https://github.com/debanshup/quickserve/issues) and include:

- A clear description of the problem or request
- Steps to reproduce (for bugs)
- Your OS, Node.js version, and QuickServe version
- Any relevant logs or screenshots

---

## Getting Help

If you're stuck or unsure about something, feel free to open a [discussion](https://github.com/debanshup/quickserve/discussions/new) or leave a comment on the relevant issue. I'm always happy to help.
