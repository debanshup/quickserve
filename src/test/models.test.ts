import * as assert from "assert";
import { Server } from "../models/ServerModel";
import { FileWatcher } from "../models/WatcherModel";
import path from "path";
import fs, { watch } from "fs";
import * as Helper from "../utils/helper";
import { Config } from "../utils/config";
import { HOST } from "../consatnts/host";
suite("Server", () => {
  test("should start server in given port", async () => {
    const port = await Helper.getAvailablePort();
    const host = Config.isPublicAccessEnabled() ? HOST.LAN : HOST.LOCALHOST;
    console.log("info", host, port);
    const server = new Server(host, port);
    await server.start(() => {});
    assert.strictEqual(server.port, port);

    assert.ok(server.on);
    await server.stop();
  });
  test("should stop server", async () => {
    const host = Config.isPublicAccessEnabled() ? HOST.LAN : HOST.LOCALHOST;
    const port = await Helper.getAvailablePort();
    const server = new Server(host, port);
    await server.start(() => {});
    await server.stop();
    assert.ok(!server.on);
  });
});

suite("FileWatcher", async () => {
  const host = Config.isPublicAccessEnabled() ? HOST.LAN : HOST.LOCALHOST;
  const port = await Helper.getAvailablePort();
  const server = new Server(host, port);
  await server.start(() => {});
  const testFile = path.join(__dirname, "test.md");
  let watcher: FileWatcher;

  setup((done) => {
    fs.writeFileSync(testFile, "initial");
    watcher = new FileWatcher(server.wsServer);
    done();
  });

  teardown(async () => {
    await watcher.stop();
    fs.unlinkSync(testFile);

    assert.ok(!watcher.on);
  });

  test("should send reload message on file change", async (done) => {
    watcher.start();
    const client = server.wsServer;
    client.on("message", (msg) => {
      assert.equal(msg.toString(), "reload");
      client.close();
      done();
    });

    client.on("open", () => {
      setTimeout(() => {
        fs.appendFileSync(testFile, "change");
      }, 100);
    });
    await watcher.stop();
  });
  await server.stop();
});
