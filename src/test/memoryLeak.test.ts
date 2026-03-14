import assert from "assert";
import { App } from "../app/App";
import {
  LogEventTypes,
  LoggerEvents,
} from "../core/models/observer/log_observer/logEventEmitter";
import {
  ServerEventTypes,
  ServerEvents,
} from "../core/models/observer/server_observer/serverEventEmitter";
import {
  StatusEventTypes,
  StatusEvents,
} from "../core/models/observer/status_observer/StatusEventEmitter";

suite("App Lifecycle & Memory Management", () => {
  const emittersToTest = [
    {
      name: "LoggerEvents",
      emitter: LoggerEvents,
      events: Object.values(LogEventTypes),
    },
    {
      name: "ServerEvents",
      emitter: ServerEvents,
      events: Object.values(ServerEventTypes),
    },
    {
      name: "StatusEvents",
      emitter: StatusEvents,
      events: Object.values(StatusEventTypes),
    },
  ];

  const getListenerSnapshot = () => {
    const counts = new Map<string, number>();
    for (const { name, emitter, events } of emittersToTest) {
      for (const event of events) {
        const eventKey = String(event);
        counts.set(`${name}:${eventKey}`, emitter.listenerCount(eventKey));
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
