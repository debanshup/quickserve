import * as assert from "assert";
import { DependencyGraph } from "../core/dependency-manager/DependencyGraph";
suite("DependencyGraph - extractScriptDeps Edge Cases", () => {
  let graph: DependencyGraph;

  setup(() => {
    graph = new DependencyGraph();
  });

  test("1. Should correctly extract ESM, CommonJS, and Dynamic imports via Acorn", () => {
    const validJsContent = `
      import { a } from './a.js';
      export { b } from '/b.js';
      export * from './c.js';
      const d = require('./d.js');
      const e = import('./e.js');
    `;

    const deps = graph["extractScriptDeps"](validJsContent);

    assert.deepStrictEqual(
      deps,
      ["./a.js", "/b.js", "./c.js", "./d.js", "./e.js"],
      "Should extract all 5 dependency types correctly",
    );
  });

  test("2. Should gracefully fallback to Regex when Acorn fails (e.g., TypeScript syntax)", () => {
    const tsContent = `
      import type { MyInterface } from './types.ts';
      export type { OtherType } from './other-types.ts';
      const x: number = 5; 
      const y = require('./common.js');
      const z = import('./dynamic.js');
    `;

    const deps = graph["extractScriptDeps"](tsContent);

    assert.deepStrictEqual(
      deps,
      ["./types.ts", "./other-types.ts", "./common.js", "./dynamic.js"],
      "Regex fallback should correctly extract paths from TypeScript code",
    );
  });

  test("3. Should strictly filter out Node built-ins, URLs, and bare NPM packages", () => {
    const mixedContent = `
      import fs from 'fs';                        // Ignored: Typically in CORE_MODULES
      import path from 'node:path';               // Ignored: startsWith node:
      import axios from 'https://cdn.com/ax.js';  // Ignored: startsWith https://
      import react from 'react';                  // Ignored: bare NPM package (doesn't start with . or /)
      
      // Valid local and absolute imports
      import local from './local.js';             // KEPT
      import absolute from '/absolute.js';        // KEPT
      
      // Test deduplication
      import localAgain from './local.js';        // IGNORED (Duplicate)
      const dynamicLocal = import('./local.js');  // IGNORED (Duplicate)
    `;

    const deps = graph["extractScriptDeps"](mixedContent);

    // Ensure it only kept the valid local/absolute paths and deduplicated them
    assert.deepStrictEqual(
      deps,
      ["./local.js", "/absolute.js"],
      "Should actively filter out built-ins, URLs, and bare NPM packages while deduplicating valid paths",
    );
  });
});
