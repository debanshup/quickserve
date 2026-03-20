import { TypedEventEmitter } from "../../../event-emitter/TypedEventEmitter";
import { DependencyGraph } from "../../../dependency-manager/DependencyGraph";
export interface DependencyEventMap {
  // "fs:add": [filePath: string];
  // "fs:change": [filePath: string];
  // "fs:unlink": [filePath: string];
  "graph:build": [entry: string];
  "graph:update_node_imports": [filePath: string, textData: string];
  "graph:cleanup": [graph: DependencyGraph, filePath: string, isHardCleanup: boolean];
  "graph:clear": [];
}
export const dependencyEvents = new TypedEventEmitter<DependencyEventMap>();
