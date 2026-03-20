
import EventEmitter from "events";
import { TypedEventEmitter } from "../../../event-emitter/TypedEventEmitter";
interface ServerEventMap {
  "server:start": [port: number];
  "server:stop": [];
  "server:error": [error: Error];
  "server:not_running": [];
  "server:no_active_path": [];
}
 
export const serverEvents = new TypedEventEmitter<ServerEventMap>();
