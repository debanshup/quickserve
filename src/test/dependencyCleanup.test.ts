import * as assert from "assert";
import path from "path";
import { DependencyGraph } from "../core/dependency-manager/DependencyGraph";

suite("DependencyGraph - cleanUp", () => {
  let graph: DependencyGraph;
  const absRoot = path.resolve("/project/index.html");
  const absChild = path.resolve("/project/utils.js");
  const absOther = path.resolve("/project/other.js");
  const absDeepChild = path.resolve("/project/deep.js");

  setup(() => {
    graph = new DependencyGraph();
    const graphMap = graph["graph"];

    graphMap.set(absRoot, {
      imports: new Set([absChild]),
      importers: new Set(),
    });
    graphMap.set(absOther, {
      imports: new Set([absChild]),
      importers: new Set(),
    });
    graphMap.set(absChild, {
      imports: new Set([absDeepChild]), // Added deep child to test outward disconnection
      importers: new Set([absRoot, absOther]),
    });
    graphMap.set(absDeepChild, {
      imports: new Set(),
      importers: new Set([absChild]),
    });
  });

  test("1. Hard Delete: Should remove all references of a deleted node from its children", () => {
    // clean up the Root (index.html), explicitly calling a permanent hard-delete
    DependencyGraph.cleanUp(graph, absRoot, true);

    const childNode = graph.getNode(absChild);

    assert.strictEqual(
      graph.getNode(absRoot),
      undefined,
      "Node itself should be deleted from the graph",
    );
    assert.ok(childNode, "Child node should still exist");
    assert.ok(
      !childNode.importers.has(absRoot),
      "Child node should no longer list the deleted node as an importer",
    );
    assert.strictEqual(
      childNode.importers.size,
      1,
      "Child should still retain other valid importers",
    );
  });

  test("2. Should handle non-existent nodes gracefully", () => {
    const fakePath = path.resolve("/project/missing.js");

    // This should not throw an error
    assert.doesNotThrow(() => {
      DependencyGraph.cleanUp(graph, fakePath);
    });
  });

  test("3. Hard Delete: Should clear the node from the 'visited' set if it exists", () => {
    // Manually add to visited (simulating a prior build)
    (graph as any).visited = new Set([absRoot, absChild]);

    DependencyGraph.cleanUp(graph, absRoot);

    assert.ok(
      !(graph as any).visited.has(absRoot),
      "Deleted path should be removed from visited set",
    );
    assert.ok(
      (graph as any).visited.has(absChild),
      "Other paths in visited set should remain untouched",
    );
  });

  test("4. Hard Delete: Should remove node from its own importers (bi-directional cleanup)", () => {
    // Delete the child permanently
    DependencyGraph.cleanUp(graph, absChild, true);

    const rootNode = graph.getNode(absRoot);
    const otherNode = graph.getNode(absOther);

    assert.ok(
      rootNode && !rootNode.imports.has(absChild),
      "Parent node should no longer list child in its 'imports'",
    );
    assert.ok(
      otherNode && !otherNode.imports.has(absChild),
      "Secondary parent should no longer list child in its 'imports'",
    );
    assert.strictEqual(
      graph.getNode(absChild),
      undefined,
      "Child node should be fully deleted from the graph map",
    );
  });

  test("5. Soft Delete: Should preserve node and 'importers' but clear 'imports' when isPermanent is false", () => {
    // Simulate File Watcher "unlink" event (Soft Delete)
    DependencyGraph.cleanUp(graph, absChild);

    const softDeletedNode = graph.getNode(absChild);
    const rootNode = graph.getNode(absRoot);
    const deepChildNode = graph.getNode(absDeepChild);

    // 1. The node MUST still exist in the graph map
    assert.ok(
      softDeletedNode,
      "Node should still exist in graph during soft delete",
    );

    // 2. Its own outward imports must be cleared
    assert.strictEqual(
      softDeletedNode.imports.size,
      0,
      "Node's own imports should be cleared since its content is gone",
    );

    // 3. It should properly disconnect from its children
    assert.ok(
      !deepChildNode?.importers.has(absChild),
      "Deep child should no longer see the soft-deleted node as an importer",
    );

    // 4. CRITICAL: Its 'importers' (parents) must be preserved
    assert.ok(
      softDeletedNode.importers.has(absRoot),
      "Should remember that Root previously imported it",
    );
    assert.ok(
      softDeletedNode.importers.has(absOther),
      "Should remember that Other previously imported it",
    );

    // 5. Parents should still technically point to it
    // 5. Parents should SAFELY remove it from their active imports to prevent ENOENT crashes
    assert.ok(
      !rootNode?.imports.has(absChild),
      "Parent should safely remove soft-deleted node from its active imports",
    );
  });
});
