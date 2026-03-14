import assert from "assert";
import WebSocket from "ws";
import path from "path";

// Adjust these imports to match your actual project structure
import { FileWatcher } from "../core/models/WatcherModel";

import { getCurrentDir } from "../utils/helper";
import { DependencyGraph } from "../core/dependency-manager/DependencyGraph";
import { clientRegistry } from "../store/ClientRegistry";

suite("WatcherModel - Broadcasting Logic (Real Graph Integration)", () => {
  let watcher: FileWatcher;
  let mockServer: any;
  let clientA: any;
  let clientB: any;
  let realGraph: DependencyGraph;

  const pageA = "/index.html";
  const pageB = "/about.html";

  let absPageA: string;
  let absPageB: string;
  let absAppJs: string;
  let absStyleCss: string;
  let absOtherJs: string;

  setup(() => {
    absPageA = path.resolve(getCurrentDir()! + pageA);
    absPageB = path.resolve(getCurrentDir()! + pageB);
    absAppJs = path.resolve(getCurrentDir()! + "/app.js");
    absStyleCss = path.resolve(getCurrentDir()! + "/style.css");
    absOtherJs = path.resolve(getCurrentDir()! + "/other.js");

    clientA = { readyState: WebSocket.OPEN, send: () => {} };
    clientB = { readyState: WebSocket.OPEN, send: () => {} };

    clientRegistry.set(clientA, { page: pageA });
    clientRegistry.set(clientB, { page: pageB });

    mockServer = { clients: new Set([clientA, clientB]) };
    watcher = new FileWatcher(mockServer as any);

    realGraph = new DependencyGraph();
    const graphMap = realGraph["graph"];

    // Build Tree A: index.html -> app.js -> style.css
    graphMap.set(absPageA, {
      imports: new Set([absAppJs]),
      importers: new Set(),
    });
    graphMap.set(absAppJs, {
      imports: new Set([absStyleCss]),
      importers: new Set([absPageA]),
    });
    graphMap.set(absStyleCss, {
      imports: new Set(),
      importers: new Set([absAppJs]),
    });

    // Build Tree B: about.html -> other.js
    graphMap.set(absPageB, {
      imports: new Set([absOtherJs]),
      importers: new Set(),
    });
    graphMap.set(absOtherJs, {
      imports: new Set(),
      importers: new Set([absPageB]),
    });
  });

  test("1. broadcastToAll: Should send payload to every active client", () => {
    let aReceived = false;
    let bReceived = false;

    clientA.send = () => {
      aReceived = true;
    };
    clientB.send = () => {
      bReceived = true;
    };

    watcher.broadcastToAll({ action: "reload" });

    assert.strictEqual(
      aReceived,
      true,
      "Client A should have received the broadcast",
    );
    assert.strictEqual(
      bReceived,
      true,
      "Client B should have received the broadcast",
    );
  });

  test("2. broadcastToPage: Should send to client viewing the EXACT changed file", () => {
    let aReceived = false;
    let bReceived = false;

    clientA.send = () => {
      aReceived = true;
    };
    clientB.send = () => {
      bReceived = true;
    };

    watcher.broadcastToPage(absPageA, realGraph, { action: "inject" });

    assert.strictEqual(
      aReceived,
      true,
      "Client A should receive payload (direct match)",
    );
    assert.strictEqual(bReceived, false, "Client B should NOT receive payload");
  });

  test("3. broadcastToPage: Should send to client if they DEEPLY import the changed file", () => {
    let aReceived = false;
    let bReceived = false;

    clientA.send = () => {
      aReceived = true;
    };
    clientB.send = () => {
      bReceived = true;
    };

    watcher.broadcastToPage(absStyleCss, realGraph, { action: "inject" });

    assert.strictEqual(
      aReceived,
      true,
      "Client A should receive payload because index.html deeply imports style.css",
    );
    assert.strictEqual(
      bReceived,
      false,
      "Client B should NOT receive payload because about.html does not import style.css",
    );
  });

  test("4. broadcastToPage: Should safely ignore clients looking at unrelated files", () => {
    let aReceived = false;
    let bReceived = false;

    clientA.send = () => {
      aReceived = true;
    };
    clientB.send = () => {
      bReceived = true;
    };

    watcher.broadcastToPage(absOtherJs, realGraph, { action: "inject" });

    assert.strictEqual(
      aReceived,
      false,
      "Client A should NOT receive payload (unrelated file)",
    );
    assert.strictEqual(
      bReceived,
      true,
      "Client B should receive payload because about.html imports other.js",
    );
  });

  test("5. broadcastToPage: Should safely ignore clients with no registered page", () => {
    let cReceived = false;
    const clientC: any = {
      readyState: WebSocket.OPEN,
      send: () => {
        cReceived = true;
      },
    };

    mockServer.clients.add(clientC);

    watcher.broadcastToPage(absPageA, realGraph, { action: "inject" });

    assert.strictEqual(
      cReceived,
      false,
      "Client C should be safely ignored without crashing since it has no page state",
    );
  });
});
