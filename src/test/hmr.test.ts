import * as assert from "assert";
import { HmrAnalyzer } from "../core/HMR/HmrAnalyzer";

suite("HmrAnalyzer", () => {
  let analyzer: HmrAnalyzer;

  const baseHtml = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <title>App</title>
        <style>body { color: black; }</style>
        <script src="bundle.js"></script>
      </head>
      <body>
        <div id="app">Hello</div>
      </body>
    </html>
  `;

  setup(() => {
    analyzer = new HmrAnalyzer();
  });

  test("1. First Run: Should trigger a full reload on the first analysis", () => {
    const result = analyzer.analyzeHTML(baseHtml);
    assert.deepStrictEqual(result, { action: "reload" });
  });

  test("2. No Changes: Should return action 'none' if HTML is identical", () => {
    analyzer.analyzeHTML(baseHtml); // first run  (same pattern goes for each test to omit first start result)
    const result = analyzer.analyzeHTML(baseHtml); // no change
    assert.deepStrictEqual(result, { action: "none" });
  });

  test("3. Hot Inject Body: Should inject body if only body content changes", () => {
    analyzer.analyzeHTML(baseHtml);

    const newHtml = baseHtml.replace(
      '<div id="app">Hello</div>',
      '<div id="app">World</div>',
    );
    const result = analyzer.analyzeHTML(newHtml);

    assert.strictEqual(result.action, "inject");
    assert.strictEqual(result.body?.trim(), '<div id="app">World</div>');
    assert.strictEqual(result.style, undefined);
  });

  test("4. Hot Inject Styles: Should inject styles if only style tags change", () => {
    analyzer.analyzeHTML(baseHtml);

    const newHtml = baseHtml.replace(
      "body { color: black; }",
      "body { color: red; }",
    );
    const result = analyzer.analyzeHTML(newHtml);

    assert.strictEqual(result.action, "inject");
    assert.strictEqual(result.style?.trim(), "body { color: red; }");
    assert.strictEqual(result.body, undefined);
  });

  test("5. Hot Inject Both: Should inject both if body and styles change simultaneously", () => {
    analyzer.analyzeHTML(baseHtml);

    let newHtml = baseHtml.replace(
      '<div id="app">Hello</div>',
      "<h1>Updated</h1>",
    );
    newHtml = newHtml.replace(
      "body { color: black; }",
      "h1 { font-size: 2em; }",
    );

    const result = analyzer.analyzeHTML(newHtml);

    assert.strictEqual(result.action, "inject");
    assert.strictEqual(result.body?.trim(), "<h1>Updated</h1>");
    assert.strictEqual(result.style?.trim(), "h1 { font-size: 2em; }");
  });

  test("6. Structural Change (Attributes): Should reload if body attributes change", () => {
    analyzer.analyzeHTML(baseHtml);

    // Change <body> to <body class="dark-mode">
    const newHtml = baseHtml.replace("<body>", '<body class="dark-mode">');
    const result = analyzer.analyzeHTML(newHtml);

    assert.deepStrictEqual(result, { action: "reload" });
  });

  test("7. Structural Change (Head): Should reload if head tags (like title) change", () => {
    analyzer.analyzeHTML(baseHtml);

    // Change <title>App</title> to <title>New App</title>
    const newHtml = baseHtml.replace(
      "<title>App</title>",
      "<title>New App</title>",
    );
    const result = analyzer.analyzeHTML(newHtml);

    assert.deepStrictEqual(result, { action: "reload" });
  });

  test("8. Script Change (Head): Should reload if a script in the head changes", () => {
    analyzer.analyzeHTML(baseHtml);

    const newHtml = baseHtml.replace(
      '<script src="bundle.js"></script>',
      '<script src="bundle.js" defer></script>',
    );
    const result = analyzer.analyzeHTML(newHtml);

    assert.deepStrictEqual(result, { action: "reload" });
  });

  test("9. Script Change (Body): Should reload if a script is added to the body", () => {
    analyzer.analyzeHTML(baseHtml);

    // Injecting a script tag into the body content.
    // Even though it's inside the body, your analyzer logic explicitly checks oldScripts !== newScripts
    const newHtml = baseHtml.replace(
      "</body>",
      '<script>console.log("hi")</script>\n</body>',
    );
    const result = analyzer.analyzeHTML(newHtml);

    assert.deepStrictEqual(result, { action: "reload" });
  });
});
