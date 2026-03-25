import { TypedEventEmitter } from "../../../event-emitter/TypedEventEmitter";
import { StartPayload } from "../../../../Types";

// emitter for status:

interface StatusEventMap {
  start: [
    status: StartPayload,
  ];
  stop: [];
  show: [];
  hide: [];
  error: [error: Error]; // Assuming error emits an Error object
}
export const statusEvents = new TypedEventEmitter<StatusEventMap>();
