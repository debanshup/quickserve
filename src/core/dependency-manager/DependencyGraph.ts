import * as css from "css";
import * as acorn from "acorn";
import * as walk from "acorn-walk";
import { parse as parseHtml } from "node-html-parser";
import fs from "fs";
import { Node } from "../../Types";
import path from "path";
import { CORE_MODULES } from "../../consatnts/coreModules";
import {
  SCRIPT_EXTENSIONS,
  STYLE_EXTENSIONS,
} from "../../consatnts/supported-extension";

export class DependencyGraph {
  // [x: string]: any;
  private graph: Map<string, Node> = new Map();
  private visited: Set<string> = new Set();

  /**
   *
   *@test for circular dependency
   */
  static hasDeepImport(
    graph: DependencyGraph,
    start: string,
    target: string,
  ): boolean {
    const stack = [start];
    const visited = new Set<string>();

    while (stack.length > 0) {
      const current = stack.pop()!;
      console.log(`Checking: ${current} -> searching for ${target}`);

      if (visited.has(current)) {
        continue;
      }
      visited.add(current);

      const node = graph.getNode(current);
      if (!node) {
        continue;
      }

      if (node.imports.has(target)) {
        console.warn(
          `Circular Dependency Found: ${target} is imported by ${current}`,
        );
        return true;
      }

      for (const dep of node.imports) {
        if (!visited.has(dep)) {
          stack.push(dep); // ***replaces recursive call***
        }
      }
    }

    return false;
  }

  static findRootCss(
    graph: DependencyGraph,
    resolvedFilePath: string,
  ): string | null {
    const visited = new Set<string>();
    let current = path.normalize(resolvedFilePath);

    while (true) {
      if (visited.has(current)) {
        break;
      }
      visited.add(current);

      const node = graph.getNode(current);
      if (!node) {
        break;
      }

      // Look for an importer that is a CSS file (Case Insensitive)
      const cssParent = [...node.importers].find((imp) =>
        imp.toLowerCase().endsWith(".css"),
      );

      // If no CSS parent is found, it means the current 'current'
      // is the one imported by HTML (or it's an orphan).
      if (!cssParent) {
        break;
      }

      //  Move up the chain
      current = path.normalize(cssParent);
    }

    return current;
  }




  /**
   * Resolves relative paths like './App' to '/User/project/src/App.tsx'
   */
  private resolveModulePath(
    baseDir: string,
    importPath: string,
  ): string | null {
    // Basic resolution
    let target = path.resolve(baseDir, importPath);

    // If it exists exactly as is (e.g., explicit extension), return it
    if (fs.existsSync(target) && fs.statSync(target).isFile()) {
      return target;
    }

    // TypeScript/Node resolution strategy: Try extensions
    const extensions = [".ts", ".tsx", ".js", ".jsx", ".json"];
    for (const ext of extensions) {
      if (fs.existsSync(target + ext)) {
        return target + ext;
      }
    }

    // Try directory index (e.g., ./components -> ./components/index.ts)
    if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
      for (const ext of extensions) {
        const indexFile = path.join(target, `index${ext}`);
        if (fs.existsSync(indexFile)) {
          return indexFile;
        }
      }
    }

    return null;
  }
  public build(entry: string) {
    this.visited.clear();
    const resolvedPath = path.resolve(entry);
    this.processFile(resolvedPath);
    // const graph = this.graph.get(resolvedPath);
    // return graph;
  }
  private processFile(resolvedPath: string) {
    // avoid cycle
    if (this.visited.has(resolvedPath)) {
      return;
    }

    // fix: infinite loop

    this.visited.add(resolvedPath);

    // init node in graph
    // console.info(resolvedPath);

    if (!this.graph.has(resolvedPath)) {
      this.graph.set(resolvedPath, {
        // file: resolvedPath,
        imports: new Set(),
        importers: new Set(),
      });
    }
    if (!fs.existsSync(resolvedPath)) {
      console.warn("File not found", resolvedPath);
    }

    const content = fs.readFileSync(resolvedPath, "utf-8");
    const ext = path.extname(resolvedPath).toLowerCase();
    const dir = path.dirname(resolvedPath);

    let dependencies: any[] = [];

    try {
      if (ext === ".html" || ext === ".htm") {
        dependencies = this.extractHtmlDeps(content);
      } else if (ext === ".css") {
        dependencies = this.extractCssDeps(content);
      } else if ([".js", ".mjs", ".ts", ".tsx"].includes(ext)) {
        dependencies = this.extractScriptDeps(content);
      }
    } catch (error) {
      console.error(`Error parsing ${resolvedPath}:`, error);
    }

    // track built in modules to ignore
    // process deps
    dependencies.forEach((relPath) => {
      const absPath = this.resolveModulePath(dir, relPath);
      // console.info(absPath);
      if (absPath) {
        this.addEdge(resolvedPath, absPath);
        this.processFile(absPath);
      }
    });
  }

  // bi-directional link between two files
  private addEdge(parent: string, child: string) {
    if (!this.graph.has(parent)) {
      this.graph.set(parent, {
        // file: parent,
        imports: new Set(),
        importers: new Set(),
      });
    }
    if (!this.graph.has(child)) {
      this.graph.set(child, {
        // file: parent,
        imports: new Set(),
        importers: new Set(),
      });
    }

    // forward

    this.graph.get(parent)?.imports.add(child);

    // reverse
    this.graph.get(child)?.importers.add(parent);
  }
  private extractHtmlDeps(content: string) {
    const root = parseHtml(content);
    const deps: string[] = [];

    // <script src="...">
    root.querySelectorAll("script").forEach((el) => {
      const src = el.getAttribute("src");
      if (src && !src.startsWith("http")) {
        deps.push(src);
      }
    });

    // <link href="...">
    root
      .querySelectorAll('link[rel="stylesheet"], link[as="style"]')
      .forEach((el) => {
        const href = el.getAttribute("href");
        if (href && !href.startsWith("http")) {
          deps.push(href);
        }
      });

    // <img src="...">
    // root.querySelectorAll("img").forEach((el) => {
    //   const src = el.getAttribute("src");
    //   if (src && !src.startsWith("http")) {
    //     deps.push(src);
    //   }
    // });

    return deps;
  }
  private extractCssDeps(content: string) {
    const ast = css.parse(content);
    const deps: string[] = [];

    ast.stylesheet?.rules.forEach((rule: any) => {
      if (rule.type === "import") {
        // @import "style.css"; -> style.css
        const importPath = rule.import.replace(/['"]/g, "").trim();
        deps.push(importPath);
      }
    });
    return deps;
  }
  private extractScriptDeps(content: string) {
    const deps: string[] = [];

    const parserOptions: acorn.Options = {
      sourceType: "module",
      ecmaVersion: "latest",
    };

    try {
      const ast = acorn.parse(content, parserOptions);

      walk.simple(ast, {
        ImportDeclaration(node: any) {
          if (node.source && node.source.value) {
            deps.push(node.source.value);
          }
        },
        ExportNamedDeclaration(node: any) {
          if (node.source && node.source.value) {
            deps.push(node.source.value);
          }
        },
        ExportAllDeclaration(node: any) {
          if (node.source && node.source.value) {
            deps.push(node.source.value);
          }
        },
        CallExpression(node: any) {
          const isRequire = node.callee.name === "require";
          const isDynamicImport = node.callee.type === "Import";
          if (
            (isRequire || isDynamicImport) &&
            node.arguments[0]?.type === "Literal"
          ) {
            // console.info("Got:: require / dynamic import");
            deps.push(node.arguments[0].value);
          }
        },
      });
    } catch (e) {
      // FALLBACK: Acorn failed (likely TS syntax)
      const matchers = [
        /import\s+(?:type\s+)?(?:.*?\s+from\s+)?['"](.*?)['"]/g,
        /export\s+(?:type\s+)?(?:.*?\s+from\s+)?['"](.*?)['"]/g, // export { Button } from './Button';
        /(?:require|import)\s*\(\s*['"](.*?)['"]\s*\)/g,
      ];

      for (const regex of matchers) {
        let match;
        while ((match = regex.exec(content)) !== null) {
          if (match[1]) {
            deps.push(match[1]);
          }
        }
      }
    }

    const localDeps: string[] = [];

    for (const dep of deps) {
      if (CORE_MODULES.has(dep) || dep.startsWith("node:")) {
        continue;
      }
      if (dep.startsWith("http://") || dep.startsWith("https://")) {
        continue;
      }
      if (dep.startsWith(".") || dep.startsWith("/")) {
        localDeps.push(dep);
      }
    }

    return [...new Set(localDeps)];
  }

  extractImports(filePath: string, content: string) {
    const ext = path.extname(filePath).toLowerCase();
    const dir = path.dirname(filePath);

    let rawImports: string[] = [];

    if (ext === ".html" || ext === ".htm") {
      rawImports = this.extractHtmlDeps(content);
    } else if (STYLE_EXTENSIONS.includes(ext)) {
      rawImports = this.extractCssDeps(content);
    } else if (SCRIPT_EXTENSIONS.includes(ext)) {
      rawImports = this.extractScriptDeps(content);
    }

    //  Filter & Resolve to Absolute Paths
    const resolvedDependencies: string[] = [];

    for (const rawPath of rawImports) {
      // Ignore external URLs (CDNs) and Data URIs
      if (
        rawPath.startsWith("http://") ||
        rawPath.startsWith("https://") ||
        rawPath.startsWith("data:")
      ) {
        continue;
      }

      // Ignore NPM packages (Bare specifiers don't start with '.' or '/')
      const isLocalFile = rawPath.startsWith(".") || rawPath.startsWith("/");
      if (!isLocalFile) {
        continue;
      }

      // Resolve the relative path to an absolute path on disk
      const absolutePath = this.resolveModulePath(dir, rawPath);
      if (absolutePath) {
        resolvedDependencies.push(absolutePath);
      }
    }

    // Return unique absolute paths
    return [...new Set(resolvedDependencies)];
  }

  isNodeAvailable(filePath: string) {
    const resolvedPath = path.resolve(filePath);
    return this.graph.has(resolvedPath);
  }

  /**
   *
   * @param filePath
   * @param newNode
   * @description -- use this function to update node of a existing graph
   *
   *
   * @returns
   */
  public updateNode(filePath: string, newNode: Node) {
    const resolvedPath = path.resolve(filePath);
    console.info(resolvedPath);
    if (!this.graph.has(resolvedPath)) {
      console.warn("Node not found");
      return;
    }
    const existingNode = this.graph.get(resolvedPath)!;
    if (newNode.imports) {
      existingNode.imports = newNode.imports;
    }
    if (newNode.importers) {
      existingNode.importers = newNode.importers;
    }

    // console.info("Updated node:", newNode);
  }

  /**
   * @todo redefine
   */

  public getGraph(path: string) {
    return this.build(path);
  }

  public getAllNodes() {
    return [...this.graph.keys()];
  }
  /**
   * @todo redefine
   */
  public getNode(filePath: string) {
    const resolvedPath = path.resolve(filePath);
    return this.graph.get(resolvedPath);
  }

  public createNode(filePath: string, content: string) {
    const resolvedPath = path.resolve(filePath);
    // console.info(path.resolve(resolvedPath))
    // console.info(resolvedPath);
    const extractedImports = this.extractImports(resolvedPath, content);
    // console.info(extractedImports);
    if (!this.graph.has(resolvedPath)) {
      this.graph.set(resolvedPath, {
        imports: new Set(extractedImports),
        importers: new Set(),
      });
    } else {
      this.graph.get(resolvedPath)!.imports = new Set(extractedImports);
    }

    for (const importedPath of extractedImports) {
      if (!this.graph.has(importedPath)) {
        this.graph.set(importedPath, {
          imports: new Set(),
          importers: new Set(),
        });
      }

      this.graph.get(importedPath)!.importers.add(resolvedPath);
    }

    return this.graph.get(resolvedPath);
  }
  /**
   * @todo redefine
   */
  public deleteNode(filePath: string) {
    const resolvedPath = path.resolve(filePath);
    return this.graph.delete(resolvedPath);
  }

  public clearGraph(){
    this.graph.clear();
  }











  // ---- Debug ------

  public printGraph() {
    console.log("\n==============================");
    console.log("      DEPENDENCY GRAPH");
    console.log("==============================\n");

    for (const [file, node] of this.graph.entries()) {
      const shortName = path.basename(file);

      console.log(`${shortName}`);
      console.log(`   ├─ Imports (${node.imports.size})`);

      if (node.imports.size === 0) {
        console.log(`   │    (none)`);
      } else {
        node.imports.forEach((dep) => {
          console.log(`   │    → ${dep}`);
        });
      }

      console.log(`   └─ Used By (${node.importers.size})`);

      if (node.importers.size === 0) {
        console.log(`        (root module)`);
      } else {
        node.importers.forEach((parent) => {
          console.log(`        ← ${parent}`);
        });
      }

      console.log(""); // spacing
    }
  }
}
export const graph = new DependencyGraph();
