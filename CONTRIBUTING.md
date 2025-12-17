# Contribution Guide

First off, thank you for considering contributing to QuickServe! Your help is highly appreciated. Below you'll find a guide to get started with contributing.

## Installation

1. **Fork the repository and create a new branch**

2. **Clone the repository**

   Replace your-username with your GitHub username:

   ```bash
   git clone https://github.com/your-username/quick-serve.git
    cd quick-serve
   ```

3. **Install dependencies**

   ```bash
   npm install
   ```

4. **Make your changes and add tests if necessary.**

5. **Commit your changes**
   Use clear, consistent messages like:

   ```bash
   git commit -m "type: short description"
   ```

   Common types are:

   - **feat**: new feature (e.g., `feat: add dark mode`)
   - **fix**: bug fix (e.g., `fix: resolve server crash`)
   - **docs**: documentation changes (e.g., `docs: update README`)
   - **style**: formatting or style changes (e.g., `style: fix indentation`)
   - **refactor**: code restructuring without changing behavior (e.g., `refactor: simplify code`)
   - **test**: adding or fixing tests (e.g., `test: add unit tests`)
   - **chore**: maintenance tasks like updating dependencies (e.g., `chore: update deps`)

   Example:

   ```bash
   git commit -m "feat: add preview mode for first release"
   ```

6. **Push your changes to your fork**

   ```bash
   git push origin your-branch
   ```

7. **Create a pull request**

## Testing

Before you push your changes, make sure to run the tests

```bash
npm test
```

## Reporting Issues

If you encounter any issues, please create a new [issue](https://github.com/debanshup/quickserve/issues).
