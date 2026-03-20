import assert from "assert";
import { App } from "../app/App";
import { loggerEvents } from "../core/models/observer/log_observer/logEventEmitter";
import { serverEvents } from "../core/models/observer/server_observer/serverEventEmitter";
import { statusEvents } from "../core/models/observer/status_observer/StatusEventEmitter";
import { dependencyEvents } from "../core/models/observer/dependency_observer/dependencyEventEmitter";

suite("App Lifecycle & Memory Management", () => {
  const emittersToTest = [
    {
      name: "loggerEvents",
      emitter: loggerEvents,
      events: [
        "info",
        "connection_uri",
        "http_request",
        "http_response",
        "error",
        "warn",
        "debug",
      ],
    },
    {
      name: "serverEvents",
      emitter: serverEvents,
      events: [
        "server:start",
        "server:stop",
        "server:error",
        "server:not_running",
        "server:no_active_path",
      ],
    },
    {
      name: "dependencyEvents",
      emitter: dependencyEvents,
      events: ["graph:build", "graph:update_node_imports", "graph:cleanup"],
    },
    {
      name: "statusEvents",
      emitter: statusEvents,
      events: ["start", "stop", "show", "hide", "error"],
    },
  ];

  const getListenerSnapshot = () => {
    const counts = new Map<string, number>();
    for (const { name, emitter, events } of emittersToTest) {
      for (const event of events) {
        counts.set(`${name}:${event}`, emitter.listenerCount(event));
      }
    }
    return counts;
  };

  test("1. Should not leak EventListeners on a single start/stop cycle", async () => {
    const tempApp = new App();
    const baselines = getListenerSnapshot();

    await tempApp.start();
    await tempApp.stop();

    const finalCounts = getListenerSnapshot();

    for (const [key, baseline] of baselines.entries()) {
      const finalCount = finalCounts.get(key) || 0;
      assert.strictEqual(
        finalCount,
        baseline,
        `Memory Leak Detected: Leaked ${finalCount - baseline} listeners for ${key}`,
      );
    }
  });

  test("2. Should handle multiple start/stop cycles without leaking (Stress Test)", async () => {
    const tempApp = new App();
    const baselines = getListenerSnapshot();

    // rapidly starting and stopping the server 10 times
    for (let i = 0; i < 10; i++) {
      await tempApp.start();
      await tempApp.stop();
    }

    const finalCounts = getListenerSnapshot();

    for (const [key, baseline] of baselines.entries()) {
      const finalCount = finalCounts.get(key) || 0;
      assert.strictEqual(
        finalCount,
        baseline,
        `Stress Test Leak Detected: Leaked ${finalCount - baseline} listeners for ${key} after 5 cycles`,
      );
    }
  });
});
