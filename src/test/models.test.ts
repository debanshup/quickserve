import * as assert from "assert";
import path from "path";
import fs from "fs";
import * as Helper from "../utils/helper";
import { Config } from "../utils/config";
import { HOST } from "../consatnts/host";
import { Server } from "../core/models/ServerModel";
import { FileWatcher } from "../core/models/WatcherModel";
import WebSocket from "ws";

suite("Server", () => {
  test("should start server in given port", async () => {
    const port = await Helper.getAvailablePort();
    const host = Config.getPublicAccessEnabled() ? HOST.LAN : HOST.LOCALHOST;
    const proto = Config.isHttpsEnabled() ? "https:" : "http:";
    console.log("info", host, port);

    const server = await Server.create(
      host,
      port,
      proto,
      Config.getSSLConfig()!,
    );
    await server.start(() => {});

    assert.strictEqual(server.port, port);
    assert.ok(server.on);

    await server.stop();
  });

  test("should stop server", async () => {
    const host = Config.getPublicAccessEnabled() ? HOST.LAN : HOST.LOCALHOST;
    const port = await Helper.getAvailablePort();
    const proto = Config.isHttpsEnabled() ? "https:" : "http:";

    const server = await Server.create(
      host,
      port,
      proto,
      Config.getSSLConfig()!,
    );
    await server.start(() => {});
    await server.stop();

    assert.ok(!server.on);
  });
});

suite("FileWatcher", () => {
  let server: Server;
  let watcher: FileWatcher;
  let testFile: string;
  setup(async () => {
    const host = Config.getPublicAccessEnabled() ? HOST.LAN : HOST.LOCALHOST;
    const port = await Helper.getAvailablePort();
    const proto = Config.isHttpsEnabled() ? "https:" : "http:";
    server = await Server.create(host, port, proto, Config.getSSLConfig()!);
    await server.start(() => {});

    // isolate File System (Use a unique file name per test run)
    testFile = path.join(
      __dirname,
      `test-${Date.now()}-${Math.random().toString(36).substring(7)}.md`,
    );
    fs.writeFileSync(testFile, "initial");
    watcher = new FileWatcher(server.wsServer!);
  });
  teardown(async () => {
    if (watcher) {
      await watcher.stop();
      assert.ok(!watcher.on);
    }

    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }

    if (server) {
      await server.stop();
    }
  });

  test("should monitor file change", () => {
    return new Promise<void>((resolve, reject) => {
      watcher.start();

      const wsProto = Config.isHttpsEnabled() ? "wss:" : "ws:";
      const wsUrl = `${wsProto}//127.0.0.1:${server.port}`;
      const client = new WebSocket(wsUrl);
      client.on("error", (error) => {
        reject(new Error(`WebSocket client error: ${error}`));
      });
      client.on("message", (msg) => {
        try {
          assert.strictEqual(typeof msg.toString(), "string");
          client.close();
          resolve();
        } catch (error) {
          reject(error);
        }
      });
      client.on("open", () => {
        setTimeout(() => {
          try {
            fs.appendFileSync(testFile, "change");
          } catch (error) {
            reject(error);
          }
        }, 50);
      });
    });
  });
});
