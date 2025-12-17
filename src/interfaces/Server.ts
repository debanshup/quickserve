export interface IServer {
  on: boolean;
  port: number | null;
  start(): void;
  stop(): void;
}
