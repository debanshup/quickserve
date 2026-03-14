// // import { readFileSync } from "fs";
// // // import { Node } from "../Types";
// // import depsGraph from "../core/dependency-manager/DependencyGraph";

// import { readFileSync } from "fs";
// import { HmrAnalyzer } from "../core/HMR/HmrAnalyzer";

// // // export class DependencyStore {
// // //   protected constructor() {}

// // //   private static depsStore = new Map<string, Node>();
// // // }

// // // // const entry = "F://demo_ext_test/index1.html";
// // // // const nodes = DependencyStore.findAndUpdateImports(entry);
// // // // console.info("Dependencies", nodes);

// // // const entry1 = "F://demo_ext_test/The Music Channel - YouTube.htm";
// // const entry2 = "F://demo_ext_test/index.html";
// // const entry3 = "F://demo_ext_test/index1.html";
// // // depsGraph.build(entry2)!;
// // // depsGraph.build(entry2);
// // // depsGraph.build(entry1);
// // // console.info(depsGraph);

// // // console.info("e2", depsGraph.getNode(entry2));
// // console.info("e2", depsGraph.getNode(entry2));

// // // depsGraph.deleteNode(entry3);

// // console.info("e3", depsGraph.getNode(entry3));

// // console.dir(depsGraph, { depth: null, colors: true });
// // // console.info("node 1 ::", node1);
// // const content = readFileSync(entry3, "utf-8");
// // depsGraph.createNode(entry3, content);
// // console.dir(depsGraph, { depth: null, colors: true });

import { readFileSync } from "fs";
import { graph } from "../core/dependency-manager/DependencyGraph";
const entry = "F://demo_ext_test/index1.html";
graph.build(entry);
console.info(graph);

// graph.createNode(entry, readFileSync(entry, "utf-8"));

console.info(graph);
