#!/usr/bin/env node
/**
 * Install the shared Lefthook hooks (core.md C7.8). A local `core.hooksPath`
 * that equals `.githooks` is migrated; any other value, and a global one, is
 * refused because it is a deliberate machine setting. `lefthook install` only
 * warns when the remote config cannot be fetched, so the merged job list is
 * asserted before success is reported.
 *
 * Kept byte-identical in every simpsonm09-projects repository.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const SHARED_JOBS = ["core-fmt", "core-forbidden-files", "core-policy", "owner-signing"];

function git(args: string[]): string | null {
  const result = spawnSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    windowsHide: true,
  });
  if (result.status !== 0) return null;
  const value = (result.stdout ?? "").trim();
  return value.length > 0 ? value : null;
}

function fail(message: string): number {
  console.error(message);
  return 1;
}

export function installHooks(): number {
  const global = git(["config", "--global", "--get", "core.hooksPath"]);
  if (global !== null) {
    return fail(
      `A global core.hooksPath is set (${global}); lefthook install refuses it.\n` +
        "Remove it yourself, or use `lefthook install --force` only if you really mean it.",
    );
  }

  const existing = git(["config", "--get", "core.hooksPath"]);
  if (existing !== null && existing !== ".githooks") {
    return fail(`core.hooksPath is ${existing}; integrate it manually.`);
  }
  if (existing === ".githooks") git(["config", "--unset-all", "--local", "core.hooksPath"]);

  const installed = spawnSync("mise", ["exec", "--", "lefthook", "install"], {
    stdio: "inherit",
    windowsHide: true,
  });
  if (installed.status !== 0) return fail("lefthook install failed; run `mise install` and try again.");

  // A failed remote sync only warns in 2.2.2 and still exits 0, so assert the
  // shared jobs loaded before declaring success.
  const dump = spawnSync("mise", ["exec", "--", "lefthook", "dump"], {
    encoding: "utf8",
    windowsHide: true,
  });
  const text = dump.stdout ?? "";
  const missing = SHARED_JOBS.filter((job) => !text.includes(`name: ${job}`));
  if (missing.length > 0) {
    return fail(
      `The shared hook config did not load (missing ${missing.join(", ")}); check access to the .github repository.`,
    );
  }

  const hooksDir = git(["rev-parse", "--path-format=absolute", "--git-path", "hooks"]);
  if (hooksDir === null) return fail("could not resolve the Git hooks directory");
  for (const name of ["pre-commit", "pre-push"]) {
    if (!existsSync(join(hooksDir, name))) return fail(`Lefthook did not write the ${name} shim.`);
  }

  console.log("Shared Lefthook hooks installed; no global settings changed.");
  return 0;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(installHooks());
}
