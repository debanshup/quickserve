import * as assert from "assert";
import { HTTPServer } from "../models/ServerModel";
import { FileWatcher } from "../models/WatcherModel";
import { DocReloader } from "../models/ReloaderModel";
import path from "path";
import WebSocket, { WebSocketServer } from "ws";
import fs from "fs";
const { getAvailablePorts } = Helper;
import { Helper } from "../helper";
suite("HTTPServer", () => {
  test("should start http server in given port", async () => {
    const port = await getAvailablePorts();
    const server = new HTTPServer(port.httpServerPort, "localhost");
    await new Promise<void>((resolve) => {
      server.start(()=>{
        resolve();
      });
    });
    assert.strictEqual(server.port, port.httpServerPort);
    assert.ok(server.on);
    server.stop();
  });
  test("should stop server", async () => {
    const port = await getAvailablePorts();
    const server = new HTTPServer(port.httpServerPort, "localhost");
    server.start();
    await server.stop();
    assert.strictEqual(server.on, false);
  });
});

suite("DocReloader", () => {
  test("should start ws server", async () => {
    const port = await getAvailablePorts();
    const reloader = new DocReloader();
    reloader.start(port.wssPort);
    assert.ok(reloader.on);
    await reloader.stop();
  });
  test("Should stop wss server", async () => {
    const{wssPort}= await getAvailablePorts();
    const reloader = new DocReloader();
    reloader.start(wssPort);
    await reloader.stop();
    assert.strictEqual(reloader.on, false) ;
  });
});
suite("FileWatcher", () => {
  const testFile = path.join(__dirname, "test.md");
  let wss: WebSocketServer;
  let watcher: FileWatcher;

  setup((done) => {
    fs.writeFileSync(testFile, "initial");
    wss = new WebSocketServer({ port: 9001 });
    watcher = new FileWatcher(wss);
    done();
  });

  teardown(async () => {
    await watcher.stop();
    fs.unlinkSync(testFile);
    wss.close();
  });

  test("should send reload message on file change", (done) => {
    watcher.start();

    const client = new WebSocket("ws://localhost:9001");

    client.on("message", (msg) => {
      assert.equal(msg.toString(), "reload");
      client.close();
      done();
    });

    client.on("open", () => {
      setTimeout(() => {
        fs.appendFileSync(testFile, "change");
      }, 100); // wait for watcher to initialize
    });
  });
});
