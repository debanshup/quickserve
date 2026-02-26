export type Node = {
  file: string;
  imports: Set<string>;
  importers: Set<string>;
};

export type FileCache = {
  content: string; // The raw or transformed code sent to the browser
  imports: string[]; // Forward dependencies (to update the graph)
  lastParsed: number; // Timestamp (optional, for debugging)
};
