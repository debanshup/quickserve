export type Node = {
  // file: string;
  imports: Set<string>;
  importers: Set<string>;
};

export type FileCache = {
  content: string; // The raw or transformed code sent to the browser
  imports: string[]; // Forward dependencies (to update the graph)
  lastParsed: number; // Timestamp (optional, for debugging)
};

export type SSLConfig = { certPath: string; keyPath: string };

export type WSMessage = {
  action: "none" | "css-update" | "inject" | "reload";
  body?: string;
  style?: string;
  path?: string;
};

export type StartPayload = {
  on: boolean;
  port: number;
  isPublicAccessEnabled: boolean; // STRICTLY boolean (no undefined allowed)
  publicUrl: string;
}