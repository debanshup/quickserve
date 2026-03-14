import { execSync } from "child_process";
import * as vscode from "vscode";
import { createPrivateKey, createPublicKey, X509Certificate } from "crypto";
import path from "path";
import { ERROR_MESSAGES } from "../../constants/errorMessages";
import { PATH } from "../../constants/path";
import fs from "fs";
import selfsigned from "selfsigned";

export class CertManager {
  protected constructor() {}
  // check if mkcert is installed
  public static checkMkcert() {
    try {
      // check mkcert
      execSync("mkcert --version", { stdio: "ignore" });
      return true;
    } catch (e) {
      vscode.window
        .showErrorMessage(
          "QuickServe: 'mkcert' not found. Please install it to use HTTPS without browser warnings.",
          "Install Guide",
        )
        .then((selection) => {
          if (selection === "Install Guide") {
            vscode.env.openExternal(
              vscode.Uri.parse(
                "https://github.com/FiloSottile/mkcert#installation",
              ),
            );
          }
        });
      return false;
    }
  }

  public static isCertValid(certPath: string, keyPath: string) {
    try {
      const certPem = fs.readFileSync(certPath);
      const keyPem = fs.readFileSync(keyPath);
      const cert = new X509Certificate(certPem);
      const expiry = new Date(cert.validTo);
      if (expiry <= new Date()) {
        return { status: false, msg: ERROR_MESSAGES.CERT_EXPIRED };
      }

      const certPublicKey = cert.publicKey.export({
        type: "spki",
        format: "pem",
      });
      const privateKey = createPrivateKey(keyPem);
      const derivedPublicKey = createPublicKey(privateKey).export({
        type: "spki",
        format: "pem",
      });

      if (certPublicKey !== derivedPublicKey) {
        return {
          status: false,
          msg: ERROR_MESSAGES.CERT_BINDING_ERROR,
        };
      }

      return { status: true, msg: "Certificate is valid." };
    } catch (error) {
      return { status: false, msg: ERROR_MESSAGES.CERT_FORMAT_ERROR };
    }
  }

  public static async generateFallbackCert() {
    const pems = await selfsigned.generate(
      [{ name: "commonName", value: "localhost" }],
      {
        extensions: [
          {
            name: "basicConstraints",
            cA: false,
          },
          // EKU
          {
            name: "extKeyUsage",
            serverAuth: true,
          },
          {
            name: "keyUsage",
            digitalSignature: true,
            keyEncipherment: true,
          },
          {
            name: "subjectAltName",
            altNames: [
              { type: 2, value: "localhost" }, // DNS
              { type: 7, ip: "127.0.0.1" }, // IPv4
              { type: 7, ip: "::1" }, // IPv6
            ],
          },
        ],
      },
    );

    return pems;
  }

  public static async getCert(sslConfig: {
    certPath: string;
    keyPath: string;
  }) {
    const certDir = PATH.CERT_DIR;
    if (!fs.existsSync(certDir)) {
      fs.mkdirSync(certDir);
    }
    let certPath;
    let keyPath;

    const isCustomConfig = sslConfig?.certPath && sslConfig?.keyPath;
    const isPartialConfig =
      (sslConfig?.certPath && !sslConfig?.keyPath) ||
      (!sslConfig?.certPath && sslConfig?.keyPath);
    if (isCustomConfig) {
      certPath = sslConfig.certPath;
      keyPath = sslConfig.keyPath;
      const { status, msg } = CertManager.isCertValid(certPath, keyPath);
      if (status === false) {
        throw Error(msg);
      }
      return { cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) };
    } else {
      if (isPartialConfig) {
        throw new Error(ERROR_MESSAGES.SSL_CONFIG_ERROR);
      }
      console.info("No custom SSL config provided, using defaults.");
      certPath = path.join(certDir, "cert.pem");
      keyPath = path.join(certDir, "key.pem");
      const { status, msg } = CertManager.isCertValid(certPath, keyPath);
      console.info(msg);
      if (status === true) {
        return {
          cert: fs.readFileSync(certPath),
          key: fs.readFileSync(keyPath),
        };
      } else {
        //  using default
        if (CertManager.checkMkcert()) {
          // check if mkcert CA already installed
          const caRoot = execSync("mkcert -CAROOT").toString().trim();
          console.info("CA root", caRoot);
          if (!fs.existsSync(caRoot)) {
            console.info("mkcert CA not installed");
            execSync("mkcert -install");
          }
          execSync(
            `mkcert -cert-file "${certPath}" -key-file "${keyPath}" localhost 127.0.0.1 ::1`,
            { stdio: "pipe" },
          );
          return {
            cert: fs.readFileSync(certPath),
            key: fs.readFileSync(keyPath),
          };
        } else {
          console.info("using selfsigned");
          const pems = await CertManager.generateFallbackCert();
          fs.writeFileSync(certPath, pems.cert);
          fs.writeFileSync(keyPath, pems.private);
          return { cert: pems.cert, key: pems.private };
        }
      }
    }
  }
}
