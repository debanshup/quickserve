import * as css from "css";
import * as acorn from "acorn";
import * as walk from "acorn-walk";
import { parse as parseHtml } from "node-html-parser";
import fs from "fs";
import { Node } from "../../Types";
import path from "path";
export default class DependencyGraph {
  private graph: Map<string, Node> = new Map();
  private visited: Set<string> = new Set();
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
    const resolvedPath = path.resolve(entry);
    this.processFile(resolvedPath);
    const graph = this.graph.get(resolvedPath);
    return graph;
  }
  private processFile(resolvedPath: string) {
    // avoid cycle
    if (this.visited.has(resolvedPath)) {
      return;
    }

    // init node in graph
    // console.info(resolvedPath);

    if (!this.graph.has(resolvedPath)) {
      this.graph.set(resolvedPath, {
        file: resolvedPath,
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
        dependencies = this.extractScriptDeps(content, ext);
      }
    } catch (error) {
      console.error(`Error parsing ${resolvedPath}:`, error);
    }

    // track built in modules to ignore
    // const CORE_MODULES = new Set(builtinModules);

    // process deps
    dependencies.forEach((relPath) => {
      // console.info(relPath);
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
        file: parent,
        imports: new Set(),
        importers: new Set(),
      });
    }
    if (!this.graph.has(child)) {
      this.graph.set(child, {
        file: parent,
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
  private extractScriptDeps(content: string, ext?: string) {
    const deps: string[] = [];

    // Configure Acorn for TS/ESM
    const parserOptions: acorn.Options = {
      sourceType: "module",
      ecmaVersion: 2020,
      // Note: Acorn doesn't natively support TS syntax (types).
      // For pure TS files, we use a trick: standard imports usually parse fine
      // if we ignore type errors, or we use a regex fallback for complex TS.
    };

    try {
      const ast = acorn.parse(content, parserOptions);

      walk.simple(ast, {
        // import x from './file'
        ImportDeclaration(node: any) {
          if (node.source && node.source.value) {
            deps.push(node.source.value);
          }
        },
        // export { x } from './file'
        ExportNamedDeclaration(node: any) {
          if (node.source && node.source.value) {
            deps.push(node.source.value);
          }
        },
        // export * from './file'
        ExportAllDeclaration(node: any) {
          if (node.source && node.source.value) {
            deps.push(node.source.value);
          }
        },
      });
    } catch (e) {
      // Fallback for TS files that Acorn chokes on (because of type syntax)
      // Simple regex to catch imports in TS files
      const importRegex = /import\s+.*?\s+from\s+['"](.*?)['"]/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        deps.push(match[1]);
      }
    }

    return deps;
  }

  extractImports(content: string, filePath: string) {
    const ext = path.extname(filePath).toLowerCase();
    const dir = path.dirname(filePath);

    let rawImports: string[] = [];

    if (ext === ".html") {
      rawImports = this.extractHtmlDeps(content);
    } else if (ext === ".css") {
      rawImports = this.extractCssDeps(content);
    } else if ([".js", ".ts", ".jsx", ".tsx", ".mjs"].includes(ext)) {
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

      // Ignore Node built-ins ('fs', 'path', 'node:fs')
      // if (CORE_MODULES.has(rawPath) || rawPath.startsWith('node:')) {
      //   continue;
      // }

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

  public updateNode(filePath: string, newDeps: string[]) {
    if (!this.graph.has(filePath)) {
      this.graph.set(filePath, {
        file: filePath,
        imports: new Set(),
        importers: new Set(),
      });
    }

    const node = this.graph.get(filePath);
    if (!node) {
      return;
    }
    const oldDeps = node?.imports!;
    const newDepsSet = new Set(newDeps);
    oldDeps.forEach((oldDep) => {
      if (!newDepsSet.has(oldDep)) {
        console.log(
          `Severing tie: ${path.basename(filePath)} no longer imports ${path.basename(oldDep)}`,
        );

        // Remove the reverse link from the child
        const childNode = this.graph.get(oldDep);
        if (childNode) {
          childNode.importers.delete(filePath);

          // Optional Memory Cleanup: If the child is now completely orphaned, delete it
          if (childNode.imports.size === 0 && childNode.imports.size === 0) {
            this.graph.delete(oldDep);
          }
        }
      }
    });

    newDepsSet.forEach((newDep) => {
      if (!oldDeps.has(newDep)) {
        console.log(
          `Adding tie: ${path.basename(filePath)} now imports ${path.basename(newDep)}`,
        );
        if (!this.graph.has(newDep)) {
          this.graph.set(newDep, {
            file: newDep,
            imports: new Set(),
            importers: new Set(),
          });
        }
      }
    });

    node!.imports = newDepsSet;
  }

  public getGraph(path: string) {
    this.build(path);

    return this.graph.get(path);
    // if (this.graph.has(path)) {
    // } else {
    //   new Map();
    // }
    // return this.graph
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

// const graph = new DependencyGraph();
// const node = graph.build("F://demo_ext_test/index1.html");
// console.info(graph);

// graph.printGraph();
