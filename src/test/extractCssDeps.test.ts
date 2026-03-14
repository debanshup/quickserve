import * as assert from "assert";
import { DependencyGraph } from "../core/dependency-manager/DependencyGraph";
suite("DependencyGraph - extractCssDeps Edge Cases", () => {
  let graph: DependencyGraph;

  setup(() => {
    graph = new DependencyGraph();
  });

  test("1. Should correctly extract basic string imports (single and double quotes)", () => {
    const cssContent = `
      @import "normalize.css";
      @import 'theme.css';
      @import   "spacing.css"  ;
    `;

    const deps = graph["extractCssDeps"](cssContent);

    assert.deepStrictEqual(
      deps,
      ["normalize.css", "theme.css", "spacing.css"],
      "Should strip quotes and trim whitespace perfectly",
    );
  });

  test("2. Should ignore standard CSS rules and only extract @import", () => {
    const mixedCss = `
      @import "variables.css";
      
      body {
        background-color: #000;
        color: white;
      }

      @import "layout.css";

      .container {
        display: flex;
      }
    `;

    const deps = graph["extractCssDeps"](mixedCss);

    assert.deepStrictEqual(
      deps,
      ["variables.css", "layout.css"],
      "Should ignore the body and .container rules completely",
    );
  });

  test("3. Should correctly extract paths wrapped in url() function", () => {
    const urlCss = `
      @import url("fonts.css");
      @import url('animations.css');
      @import url(reset.css);
    `;

    const deps = graph["extractCssDeps"](urlCss);

    assert.deepStrictEqual(
      deps,
      ["fonts.css", "animations.css", "reset.css"],
      "Should strip the url() wrapper and quotes",
    );
  });
});
