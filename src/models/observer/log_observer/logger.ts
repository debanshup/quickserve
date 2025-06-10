import * as winston from "winston";
import { Config } from "../../../config";
// console.log(process.env.NODE_ENV);
// console.log(Config.getCurrentLogLevel());

export const logger = winston.createLogger({
  // level: Config.getCurrentLogLevel(),
  level:"http",
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.printf(({ message }) => message as string)
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.Stream({ stream: process.stdout }),
  ],
});

export enum LogLevel {
  ERROR = "error",
  WARN = "warn",
  INFO = "info",
  HTTP = "http",
  VERBOSE = "verbose",
  DEBUG = "debug",
  SILLY = "silly",
}
