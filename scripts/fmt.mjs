#!/usr/bin/env node
// Format the given files, or the whole repository when none are given
// (core.md C7.10). Lefthook passes every staged file the shared glob matches;
// files this repository's formatter cannot parse are skipped.
import { spawnSync } from "node:child_process";
import { extname } from "node:path";

const EXTENSIONS = new Set([".kt", ".kts"]);
const FULL = ["mise", "exec", "--", "ktlint", "--format"];
const PREFIX = ["mise", "exec", "--", "ktlint", "--format"];

const args = process.argv.slice(2);
const files = args.filter((file) => EXTENSIONS.has(extname(file).toLowerCase()));
if (args.length > 0 && files.length === 0) {
  console.log("fmt: no formattable files");
  process.exit(0);
}
const command = files.length > 0 ? [...PREFIX, ...files] : FULL;
const [binary, ...rest] = command;
const result = spawnSync(binary, rest, { stdio: "inherit", windowsHide: true });
if (result.error !== undefined) {
  console.error(`fmt: could not run ${binary}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
