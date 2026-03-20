import { TypedEventEmitter } from "../../../event-emitter/TypedEventEmitter";
export interface LoggerEventMap {
  info: [payload: { msg: string }];
  connection_uri: [payload: { url: string }];
  http_request: [
    payload: { method: string | undefined; url: string | undefined },
  ];
  http_response: [
    payload: {
      code: number;
      method: string | undefined;
      url: string | undefined;
    },
  ];
  error: [payload: { error: Error }];
  warn: [payload: { msg: string }];
  debug: [payload: { msg: string }];
}
export const loggerEvents = new TypedEventEmitter<LoggerEventMap>();