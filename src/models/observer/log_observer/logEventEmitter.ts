import EventEmitter from "events";
export const LoggerEvents = new EventEmitter();
export enum LogEventTypes {
  INFO = "info",
  CONN_URI = "connection_uri",
  HTTP_REQ = "http_request",
  HTTP_RES = "http_response",
  ERROR = "error",
  WARN = "warn",
  DEBUG = "debug",
}
