export class ServerContext {
  public static isRunning: boolean = false;
  public static port: number = 3000;
  public static host: string = "127.0.0.1";
  public static proto: "http:" | "https:" = "http:";
  public static rootPath: string = "";

  public static getBaseUrl(): string {
    return `${ServerContext.proto}//${ServerContext.host}:${ServerContext.port}`;
  }

  public static clear() {
    ServerContext.isRunning = false;
    ServerContext.rootPath = "";
  }
}
