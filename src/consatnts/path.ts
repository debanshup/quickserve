import { homedir } from "os";
import path from "path";

export const PATH = {
  // ---------- ssl config ------------
  CERT_DIR: path.join(homedir(), ".quickserve"),
  // ------------ ui -------------
  FILE_BROWSER_PAGE: "../ui/dist/file-browser/index.html",
  ERROR_PAGE: "../ui/dist/error/index.html",
};
