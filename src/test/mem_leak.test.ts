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

test("Memory: Should not leak EventListeners on restart", async () => {
  const tempApp = new App();

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

  const baselines = new Map<string, number>();

  for (const { name, emitter, events } of emittersToTest) {
    for (const event of events) {
      const eventKey = String(event);
      baselines.set(`${name}:${eventKey}`, emitter.listenerCount(eventKey));
    }
  }

  await tempApp.start();
  await tempApp.stop();

  for (const { name, emitter, events } of emittersToTest) {
    for (const event of events) {
      const eventKey = String(event);
      const baseline = baselines.get(`${name}:${eventKey}`) || 0;
      const finalCount = emitter.listenerCount(eventKey);

      assert.strictEqual(
        finalCount,
        baseline,
        `Memory Leak Detected: Leaked ${finalCount - baseline} listeners for ${name} -> ${eventKey}`,
      );
    }
  }
});
