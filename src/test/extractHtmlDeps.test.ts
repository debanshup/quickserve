import * as assert from "assert";
import { DependencyGraph } from "../core/dependency-manager/DependencyGraph";

suite("DependencyGraph - extractHtmlDeps Edge Cases", () => {
  let graph: DependencyGraph;

  setup(() => {
    graph = new DependencyGraph();
  });

  test("1. Should correctly extract local script sources and stylesheets", () => {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <link rel="stylesheet" href="./style.css">
          <link as="style" href="/theme.css">
          <link rel="icon" href="/favicon.ico"> 
        </head>
        <body>
          <script src="./app.js"></script>
          <script src="utils.js"></script>
          <script>console.log("inline")</script> 
        </body>
      </html>
    `;

    const deps = graph["extractHtmlDeps"](htmlContent);

    assert.deepStrictEqual(
      deps,
      ["./app.js", "utils.js", "./style.css", "/theme.css"], // Actual extraction order
      "Should extract valid local scripts and styles while ignoring inline ones and icons",
    );
  });

  test("2. Should ignore external URLs, protocol-relative URLs, and Data URIs", () => {
    const htmlContent = `
      <script src="https://cdn.example.com/react.js"></script>
      <link rel="stylesheet" href="http://fonts.com/font.css">
      
      <script src="//cdnjs.cloudflare.com/ajax/libs/jquery.js"></script>
      
      <script src="data:text/javascript;base64,YWxlcnQoJ2hpJyk="></script>
      
      <script src="/local.js"></script>
    `;

    const deps = graph["extractHtmlDeps"](htmlContent);

    assert.deepStrictEqual(
      deps,
      ["/local.js"],
      "Should aggressively filter out all forms of external URLs and Data URIs",
    );
  });

  test("3. Should trim whitespace from attributes", () => {
    const htmlContent = `
      <script src="  ./dirty-path.js  "></script>
      <link rel="stylesheet" href="
        ./dirty-style.css
      ">
    `;

    const deps = graph["extractHtmlDeps"](htmlContent);

    assert.deepStrictEqual(
      deps,
      ["./dirty-path.js", "./dirty-style.css"],
      "Should strip leading and trailing whitespace from the extracted paths",
    );
  });
});
