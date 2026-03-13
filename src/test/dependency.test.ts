import * as assert from "assert";
import path from "path";
import fs from "fs";
import { DependencyGraph } from "../core/dependency-manager/DependencyGraph";
import { Node } from "../../src/Types";

suite("HMR DependencyGraph", () => {
  let graph: DependencyGraph;
  let tmpDir: string;

  // create test files and return their absolute paths
  const createTestFile = (fileName: string, content: string) => {
    const fullPath = path.join(tmpDir, fileName);
    fs.writeFileSync(fullPath, content);
    return fullPath;
  };

  setup(() => {
    graph = new DependencyGraph();
    // create a unique temporary directory for each test run
    tmpDir = path.join(__dirname, `hmr-tmp-${Date.now()}`);
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
  });

  teardown(() => {
    // clean up the generated files and folder after each test
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
    graph.clearGraph();
  });

  test("Extract Imports: Should correctly parse JS, CSS, and HTML", () => {
    // create test files
    const jsPath = createTestFile("main.js", `import { dep } from './dep.js';`);
    const cssPath = createTestFile("style.css", `@import "./vars.css";`);
    const htmlPath = createTestFile(
      "index.html",
      `<script src="./app.js"></script>`,
    );

    // create dummy dependencies so resolveModulePath finds them
    createTestFile("dep.js", "export const dep = 1;");
    createTestFile("vars.css", "body { color: red; }");
    createTestFile("app.js", "console.log('app');");

    // test js
    const jsImports = graph.extractImports(
      jsPath,
      fs.readFileSync(jsPath, "utf-8"),
    );
    assert.strictEqual(jsImports.length, 1);
    assert.strictEqual(jsImports[0], path.join(tmpDir, "dep.js"));

    // test css
    const cssImports = graph.extractImports(
      cssPath,
      fs.readFileSync(cssPath, "utf-8"),
    );
    assert.strictEqual(cssImports.length, 1);
    assert.strictEqual(cssImports[0], path.join(tmpDir, "vars.css"));

    // test html
    const htmlImports = graph.extractImports(
      htmlPath,
      fs.readFileSync(htmlPath, "utf-8"),
    );
    assert.strictEqual(htmlImports.length, 1);
    assert.strictEqual(htmlImports[0], path.join(tmpDir, "app.js"));
  });

  test("Create Node: Should establish bi-directional relationships (imports & importers)", () => {
    const parentPath = createTestFile("parent.js", `import './child.js';`);
    const childPath = createTestFile("child.js", `console.log('child');`);

    // create node for parent
    const content = fs.readFileSync(parentPath, "utf-8");
    graph.createNode(parentPath, content);

    // assert parent node exists and has 'child.js' in its imports
    const parentNode = graph.getNode(parentPath);
    assert.ok(parentNode);
    assert.ok(parentNode.imports.has(childPath));

    // assert child node was implicitly created and has 'parent.js' in its importers
    const childNode = graph.getNode(childPath);
    assert.ok(childNode);
    assert.ok(childNode.importers.has(parentPath));
  });

  test("Update Node: Should update an existing node's imports", () => {
    const fileA = createTestFile("A.js", "console.log('A');");

    // create an initial empty node
    graph.createNode(fileA, "");

    const newNodeData: Node = {
      imports: new Set(["/fake/path/B.js"]),
      importers: new Set(["/fake/path/C.js"]),
    };

    // update the node
    graph.updateNode(fileA, newNodeData);

    const updatedNode = graph.getNode(fileA);
    assert.ok(updatedNode);
    assert.ok(updatedNode.imports.has("/fake/path/B.js"));
    assert.ok(updatedNode.importers.has("/fake/path/C.js"));
  });

  test("Deep Dependency Analysis: Should detect circular dependencies", () => {
    //  mock
    const fileA = path.resolve(tmpDir, "A.js");
    const fileB = path.resolve(tmpDir, "B.js");
    const fileC = path.resolve(tmpDir, "C.js");

    // force inject a cycle: A -> B -> C -> A
    graph["graph"].set(fileA, {
      imports: new Set([fileB]),
      importers: new Set([fileC]),
    });
    graph["graph"].set(fileB, {
      imports: new Set([fileC]),
      importers: new Set([fileA]),
    });
    graph["graph"].set(fileC, {
      imports: new Set([fileA]),
      importers: new Set([fileB]),
    });

    // start at A, search if A imports itself (circular)
    const hasCycle = DependencyGraph.hasDeepImport(graph, fileA, fileA);

    assert.strictEqual(
      hasCycle,
      true,
      "Should have detected the circular dependency A -> B -> C -> A",
    );
  });

  test("Find Root CSS: Should traverse up the tree to find the top-level CSS file", () => {
    const rootCss = path.resolve(tmpDir, "main.css");
    const childCss = path.resolve(tmpDir, "components.css");
    const varsCss = path.resolve(tmpDir, "vars.css");

    // manually setup graph: main.css -> components.css -> vars.css
    graph["graph"].set(rootCss, {
      imports: new Set([childCss]),
      importers: new Set(),
    });
    graph["graph"].set(childCss, {
      imports: new Set([varsCss]),
      importers: new Set([rootCss]),
    });
    graph["graph"].set(varsCss, {
      imports: new Set(),
      importers: new Set([childCss]),
    });

    // ask it to find the root starting from the bottom-most file
    const foundRoot = DependencyGraph.findRootCss(graph, varsCss);

    assert.strictEqual(foundRoot, rootCss);
  });
  test("Build: Should construct a full graph from an entry file, handling deep and circular dependencies", () => {
    const htmlPath = path.join(tmpDir, "index.html");
    const mainJsPath = path.join(tmpDir, "main.js");
    const utilsJsPath = path.join(tmpDir, "utils.js");
    const cssPath = path.join(tmpDir, "style.css");
    const varsCssPath = path.join(tmpDir, "vars.css");

    // entry point
    fs.writeFileSync(
      htmlPath,
      `
      <html>
        <head><link rel="stylesheet" href="./style.css"></head>
        <body><script type="module" src="./main.js"></script></body>
      </html>
    `,
    );

    // CSS chain
    fs.writeFileSync(cssPath, `@import "./vars.css";`);
    fs.writeFileSync(varsCssPath, `:root { --bg: red; }`);

    // JS chain WITH a circular dependency (main.js <-> utils.js)
    fs.writeFileSync(mainJsPath, `import { util } from './utils.js';`);
    fs.writeFileSync(utilsJsPath, `import './main.js'; export const util = 1;`);

    graph.build(htmlPath);

    // assert Graph Completeness
    const allNodes = graph.getAllNodes();
    assert.strictEqual(
      allNodes.length,
      5,
      `Graph should contain exactly 5 nodes, but found ${allNodes.length}`,
    );

    // assert Forward Edges (Imports)
    const htmlNode = graph.getNode(htmlPath)!;
    assert.ok(htmlNode.imports.has(mainJsPath), "HTML should import main.js");
    assert.ok(htmlNode.imports.has(cssPath), "HTML should import style.css");

    const mainNode = graph.getNode(mainJsPath)!;
    assert.ok(
      mainNode.imports.has(utilsJsPath),
      "main.js should import utils.js",
    );

    const utilsNode = graph.getNode(utilsJsPath)!;
    assert.ok(
      utilsNode.imports.has(mainJsPath),
      "utils.js should import main.js (circular)",
    );

    const cssNode = graph.getNode(cssPath)!;
    assert.ok(
      cssNode.imports.has(varsCssPath),
      "style.css should import vars.css",
    );

    // assert Reverse Edges (Importers)
    const varsNode = graph.getNode(varsCssPath)!;
    assert.ok(
      varsNode.importers.has(cssPath),
      "vars.css should be imported by style.css",
    );

    // main.js is imported by BOTH the HTML file and utils.js
    assert.ok(
      mainNode.importers.has(htmlPath),
      "main.js should be imported by index.html",
    );
    assert.ok(
      mainNode.importers.has(utilsJsPath),
      "main.js should be imported by utils.js",
    );
  });
});
