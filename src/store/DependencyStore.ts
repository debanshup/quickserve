import { Node } from "../Types";
import DependencyGraph from "../core/dependency-manager/DependencyGraph";

export class DependencyStore {
  protected constructor() {}

  private static depsGraph = new DependencyGraph();

  private static depsStore = new Map<string, Node>();

  static findAndUpdateImports(fullPath: string) {
    let node: Node;
    if (this.depsStore.has(fullPath)) {
      console.info("HIT");
      node = this.depsStore.get(fullPath)!;
    }
    console.info("MISS");
    node = DependencyStore.depsGraph.build(fullPath)!;
    // console.info("GRAPH:", node);
    if (!node || !node.imports.size) {
      return [];
    }
    this.depsStore.set(fullPath, node);

    return [...node?.imports];
  }
}

const entry = "F://demo_ext_test/index1.html";
const nodes = DependencyStore.findAndUpdateImports(entry);
console.info(nodes);
