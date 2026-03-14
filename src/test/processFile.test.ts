import * as assert from "assert";
import path from "path";
import fs from "fs";
import { DependencyGraph } from "../core/dependency-manager/DependencyGraph";

suite("DependencyGraph - processFile Edge Cases", () => {
    let graph: DependencyGraph;
    let tmpDir: string;
    let originalConsoleWarn: typeof console.warn;
    let originalConsoleError: typeof console.error;

    setup(() => {
        graph = new DependencyGraph();
        tmpDir = path.join(__dirname, `process-tmp-${Date.now()}`);
        fs.mkdirSync(tmpDir, { recursive: true });

        // Suppress expected console warnings/errors to keep test output clean
        originalConsoleWarn = console.warn;
        originalConsoleError = console.error;
        console.warn = () => { };
        console.error = () => { };
    });

    teardown(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });

        // Restore console
        console.warn = originalConsoleWarn;
        console.error = originalConsoleError;
    });

    test("1. Should return early if file is already in 'visited' set", () => {
        const filePath = path.join(tmpDir, "visited.js");
        fs.writeFileSync(filePath, "console.log('hi');");

        // Manually flag it as visited
        graph["visited"].add(filePath);

        // Execute
        graph["processFile"](filePath);

        // it should have returned without creating a graph node
        assert.strictEqual(graph.getNode(filePath), undefined);
    });

    test("2. Should return early if file does not exist (Negative Cache)", () => {
        const missingPath = path.join(tmpDir, "ghost.js");

        graph["processFile"](missingPath);

        assert.ok(
            graph["visited"].has(missingPath),
            "Missing file should be marked as visited (negative cache)",
        );

        assert.strictEqual(
            graph.getNode(missingPath),
            undefined,
            "Node should not be created for a missing file",
        );
    });

    test("3. Should catch read errors and return early without crashing", () => {
        const dirPath = path.join(tmpDir, "some-folder");
        fs.mkdirSync(dirPath);

        graph["processFile"](dirPath);

        // it safely bypassed the crash
        const node = graph.getNode(dirPath);
        assert.ok(node, "Node should be created before the read error occurs");

        assert.strictEqual(
            node.imports.size,
            0,
            "Imports should remain empty due to the read error",
        );
    });

    test("4. Should handle unsupported extensions gracefully (fallthrough)", () => {
        const txtPath = path.join(tmpDir, "readme.txt");
        fs.writeFileSync(txtPath, "Just some text");

        graph["processFile"](txtPath);

        const node = graph.getNode(txtPath);
        // Node is created
        assert.ok(node);
        // but dependencies remain empty because the extension didn't match html/css/js
        assert.strictEqual(node.imports.size, 0);
    });

    test("5. Should ignore child dependencies that cannot be resolved", () => {
        const entryPath = path.join(tmpDir, "entry.js");
        // Imports a file that strictly does not exist and won't resolve
        fs.writeFileSync(
            entryPath,
            `import { missing } from './does-not-exist.js';`,
        );

        graph["processFile"](entryPath);

        const node = graph.getNode(entryPath);
        assert.ok(node);

        // ./does-not-exist.js' cannot be resolved to an absolute path,
        // it skips `addEdge` and does not add it to the imports Set.
        assert.strictEqual(
            node.imports.size,
            0,
            "Unresolvable imports should be ignored",
        );
    });
});
