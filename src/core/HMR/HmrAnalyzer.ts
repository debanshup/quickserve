import { parse, HTMLElement } from "node-html-parser";

export class HmrAnalyzer {
  private previousHtml: string = "";

  /**
   * Analyzes the new HTML content and determines the HMR action.
   * @param newHtml The raw string content of the newly saved HTML file
   */
  public analyze(newHtml: string) {
    // First run: No previous HTML to compare against
    if (!this.previousHtml) {
      console.info("FIRST TIME CHANGE");
      this.previousHtml = newHtml;
      return { action: "reload" };
    }

    // Parse both versions into ASTs
    const oldRoot = parse(this.previousHtml);
    const newRoot = parse(newHtml);

    // Extract Body and Styles (The Injectable Parts)
    const oldBodyNode = oldRoot.querySelector("body");
    const newBodyNode = newRoot.querySelector("body");

    const oldBodyContent = oldBodyNode?.innerHTML || "";
    const newBodyContent = newBodyNode?.innerHTML || "";

    const oldStyles = oldRoot
      .querySelectorAll("style")
      .map((s) => s.innerHTML)
      .join("\n");
    const newStyles = newRoot
      .querySelectorAll("style")
      .map((s) => s.innerHTML)
      .join("\n");
    const oldScripts = oldRoot
      .querySelectorAll("script")
      .map((s) => s.innerHTML)
      .join("\n");
    const newScripts = newRoot
      .querySelectorAll("script")
      .map((s) => s.innerHTML)
      .join("\n");

    // Check Body Attributes (Crucial Edge Case)
    // If the user changed <body class="light"> to <body class="dark">,
    // innerHTML won't catch it. Force a reload if attributes change.
    const oldBodyAttrs = oldBodyNode?.rawAttrs || "";
    const newBodyAttrs = newBodyNode?.rawAttrs || "";

    if (oldBodyAttrs !== newBodyAttrs) {
      this.previousHtml = newHtml;
      return { action: "reload" };
    }

    // Compare Critical Structure (Head, Scripts, Meta tags)
    // We strip out the injectables from the AST and compare what's left.
    this.stripInjectables(oldRoot);
    this.stripInjectables(newRoot);

    const oldStructure = oldRoot.toString();
    const newStructure = newRoot.toString();

    // Update the cache for the next save event
    this.previousHtml = newHtml;

    // DECISION LOGIC
    if (oldStructure !== newStructure) {
      // Something outside the body/styles changed  
      return { action: "reload" };
    }

    if (oldBodyContent !== newBodyContent || oldStyles !== newStyles) {
      if (oldScripts !== newScripts) {
        return { action: "reload" };
      }
      // Only safe injection targets changed!
      const payload: any = { action: "inject" };

      if (oldBodyContent !== newBodyContent) {
        payload.body = newBodyContent;
      }
      if (oldStyles !== newStyles) {
        payload.style = newStyles;
      }

      return payload;
    }

    // Nothing meaningful changed (e.g., the user just hit save without editing)
    return { action: "none" };
  }

  /**
   * Mutates the AST to remove nodes we handle via Hot Injection.
   */
  private stripInjectables(root: HTMLElement) {
    // Remove the body content, but keep the body tag itself
    // (since we already checked its attributes above)
    const body = root.querySelector("body");
    if (body) {
      body.innerHTML = "";
    }

    // Remove all style tags
    root.querySelectorAll("style").forEach((s) => s.remove());
  }
}
