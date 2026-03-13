import { execSync } from "child_process";
import { CertManager } from "../core/certificate-manager/CertManager";
import assert from "assert";
import path from "path";
import fs from "fs";
test("SSL: Should detect if mkcert is installed on system", () => {
  let isMkcertAvailable = false;

  try {
    const version = execSync("mkcert -version", { stdio: "pipe" }).toString();
    isMkcertAvailable = version.length > 0;
  } catch (e) {
    isMkcertAvailable = false;
  }
  assert.strictEqual(CertManager.checkMkcert(), isMkcertAvailable);
});

test("SSL: Should validate provided certificate format", async () => {
  const invalidCertPath = path.join(__dirname, "fake_cert.txt");
  fs.writeFileSync(invalidCertPath, "not-a-real-cert");

  const sslConfig = {
    certPath: invalidCertPath,
    keyPath: invalidCertPath,
  };

  const { status } = CertManager.isCertValid(
    sslConfig.certPath,
    sslConfig.keyPath,
  );

  assert.strictEqual(
    status,
    false,
    "Should reject non-PEM formatted certificates",
  );

  // Cleanup
  fs.unlinkSync(invalidCertPath);
});

test("SSL: Should fallback to self-signed cert if paths are empty", async () => {
  const certs = await CertManager.generateFallbackCert();

  assert.ok(certs.cert, "Fallback certificate should be generated");
  assert.ok(certs.private, "Fallback key should be generated");
  assert.ok(
    certs.cert.includes("BEGIN CERTIFICATE"),
    "Should be a valid PEM string",
  );
});
