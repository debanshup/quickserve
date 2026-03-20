import {
  DependencyGraph,
  graph,
} from "../../../dependency-manager/DependencyGraph";
import { dependencyEvents } from "./dependencyEventEmitter";

export class DependencyObserver {
  public init() {
    dependencyEvents.on("graph:build", (entry) => {
      this.build(entry);
    });
    dependencyEvents.on("graph:update_node_imports", (filePath, textData) => {
      const newImports = graph.extractImports(filePath, textData);

      this.updateNodeImports(filePath, newImports);
    });
    dependencyEvents.on("graph:cleanup", (graph, filePath, isHardCleanup) => {
      this.cleanup(graph, filePath, isHardCleanup);
    });
    dependencyEvents.on("graph:clear", () => {
      this.clearGraph();
    });
  }

  public dispose() {
    dependencyEvents.removeAllListeners();
  }

  private build(entry: string) {
    graph.build(entry);
  }
  private updateNodeImports(resolvedFilePath: string, newImports: string[]) {
    graph.updateNodeImports(resolvedFilePath, newImports);
  }
  private cleanup(
    graph: DependencyGraph,
    filePath: string,
    isHardCleanup: boolean,
  ) {
    DependencyGraph.cleanUp(graph, filePath, isHardCleanup);
  }

  private clearGraph() {
    graph.clear();
  }
}
