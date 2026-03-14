import * as assert from "assert";
import path from "path";
import fs from "fs";
import WebSocket from "ws";

import * as Helper from "../utils/helper";
import { Config } from "../utils/config";
import { HOST } from "../constants/host";
import { Server } from "../core/models/ServerModel";
import { FileWatcher } from "../core/models/WatcherModel";

async function createTestServer() {
  const port = await Helper.getAvailablePort();
  const host = Config.getPublicAccessEnabled() ? HOST.LAN : HOST.LOCALHOST;
  const proto = Config.isHttpsEnabled() ? "https:" : "http:";

  const server = await Server.create(host, port, proto, Config.getSSLConfig()!);
  return { server, port, host, proto };
}

suite("ServerModel", () => {
  test("1. Should start server on the given port", async () => {
    const { server, port } = await createTestServer();
    await server.start(() => {});

    assert.strictEqual(
      server.port,
      port,
      "Server port should match the requested port",
    );
    assert.ok(server.on, "Server state should be marked as 'on'");

    await server.stop();
  });

  test("2. Should stop server and update its status", async () => {
    const { server } = await createTestServer();

    await server.start(() => {});
    await server.stop();

    assert.ok(!server.on, "Server state should be completely turned off (!on)");
  });
});

suite("WatcherModel - FileWatcher", () => {
  let server: Server;
  let watcher: FileWatcher;
  let testFile: string;

  setup(async () => {
    const testConfig = await createTestServer();
    server = testConfig.server;
    await server.start(() => {});

    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    testFile = path.join(__dirname, `test-${uniqueId}.md`);
    fs.writeFileSync(testFile, "initial content");

    watcher = new FileWatcher(server.wsServer!);
  });

  teardown(async () => {
    // teardown in reverse order of creation
    if (watcher) {
      await watcher.stop();
      assert.ok(!watcher.on, "Watcher should be turned off after teardown");
    }

    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }

    if (server) {
      await server.stop();
    }
  });

  test("1. Should broadcast a message to WebSocket clients on file change", () => {
    return new Promise<void>((resolve, reject) => {
      watcher.start();

      const wsProto = Config.isHttpsEnabled() ? "wss:" : "ws:";
      const wsUrl = `${wsProto}//127.0.0.1:${server.port}`;

      const client = new WebSocket(wsUrl, {
        rejectUnauthorized: false,
      });

      client.on("error", (error) => {
        reject(new Error(`WebSocket client error: ${error}`));
      });

      client.on("message", (msg) => {
        try {
          assert.strictEqual(
            typeof msg.toString(),
            "string",
            "Broadcasted message should be converted to a string",
          );
          client.close();
          resolve();
        } catch (error) {
          reject(error);
        }
      });

      client.on("open", () => {
        // Give the server little time to register the WS connection
        setTimeout(() => {
          try {
            fs.appendFileSync(testFile, "\nnew change applied");
          } catch (error) {
            reject(error);
          }
        }, 50);
      });
    });
  });
});
