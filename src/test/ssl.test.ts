import assert from "assert";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import { CertManager } from "../core/certificate-manager/CertManager";

suite("CertManager - SSL & Certificate Handling", () => {
  let tmpDir: string;

  setup(() => {
    tmpDir = path.join(__dirname, `cert-tmp-${Date.now()}`);
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
  });

  teardown(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("1. Should detect if mkcert is installed on system", () => {
    let isMkcertAvailable = false;

    try {
      const version = execSync("mkcert -version", { stdio: "pipe" }).toString();
      isMkcertAvailable = version.trim().length > 0;
    } catch (e) {
      isMkcertAvailable = false;
    }

    // accessing private method for testing, same pattern in other test files
    const managerResult = (CertManager as any).checkMkcert();

    assert.strictEqual(
      managerResult,
      isMkcertAvailable,
      `CertManager mkcert detection (${managerResult}) should match system baseline (${isMkcertAvailable})`,
    );
  });

  test("2. Should validate provided certificate format and reject invalid ones", () => {
    const invalidCertPath = path.join(tmpDir, "fake_cert.pem");
    const invalidKeyPath = path.join(tmpDir, "fake_key.pem");

    fs.writeFileSync(invalidCertPath, "not-a-real-cert");
    fs.writeFileSync(invalidKeyPath, "not-a-real-key");

    const { status } = (CertManager as any).isCertValid(
      invalidCertPath,
      invalidKeyPath,
    );

    assert.strictEqual(
      status,
      false,
      "Should reject non-PEM formatted certificates and return false status",
    );
  });

  test("3. Should fallback to self-signed cert if paths are empty", async () => {
    const certs = await (CertManager as any).generateFallbackCert();

    assert.ok(certs.cert, "Fallback certificate string should be generated");
    assert.ok(certs.private, "Fallback private key string should be generated");

    assert.ok(
      certs.cert.includes("BEGIN CERTIFICATE"),
      "Generated certificate should be a valid PEM string",
    );
    assert.ok(
      certs.private.includes("PRIVATE KEY"),
      "Generated key should be a valid PEM string",
    );
  });
});
