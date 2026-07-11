#!/usr/bin/env node
// One-off: merge the language blurb JSONs (written by page-reader agents in
// the scratchpad) into src/content/page-blurbs.js
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const SP = "C:/Users/loyam/AppData/Local/Temp/claude/A--WebDev-Magazine-V28/3098fd80-4206-48f6-8cf4-325ff456e2cc/scratchpad";
const merged = {};
for (const f of ["blurbs-en.json", "blurbs-hi.json", "blurbs-mr.json", "blurbs-front.json"]) {
  Object.assign(merged, JSON.parse(readFileSync(path.join(SP, f), "utf8")));
}
let out = "// GENERATED page blurbs — what the Sutradhar says about each page.\n";
out += "// Written by actually reading the printed pages (English/Hindi/Marathi).\n";
out += "export const pageBlurbs = " + JSON.stringify(merged, null, 1) + ";\n";
writeFileSync("src/content/page-blurbs.js", out);
console.log("blurbs:", Object.keys(merged).length, "| chars:", Object.values(merged).join("").length);
