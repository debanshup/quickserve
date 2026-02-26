import EventEmitter from "events";
export const ServerEvents = new EventEmitter();

export enum ServerEventTypes {
  START = "server:start",
  STOP = "server:stop",
  ERROR = "server:error",
  NOT_RUNNING = "server:not_running",
  NO_ACTIVE_PATH = "server:no_active_path",
}
