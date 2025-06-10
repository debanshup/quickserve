export interface Server {
  on: boolean;
  port: number | null;
  start(): void;
  stop(): void;
}
