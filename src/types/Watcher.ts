export interface Watcher {
  on: boolean;
  add(file: string) :void;
  start(): void;
  stop(): void;
}
