import { EventEmitter } from "events";

// emitter for status:

export const StatusEvents = new EventEmitter();

export enum StatusEventTypes {
  START = "start",
  STOP = "stop",
  SHOW = "show",
  HIDE = "hide",
  ERROR = "error",
}

// implement handler -> start, stop ac to server state
// show server status and qr code dynamically ac to event
