#!/usr/bin/env node
/**
 * Canonical pre-push policy for simpsonm09-projects (core.md C7.10).
 *
 * Adapted from the sakuragaoka-homelab `scripts/git-hook.ts` pre-push logic and
 * kept byte-identical in every repository of this owner. It must not embed a
 * directory depth: the repository root comes from `git rev-parse
 * --show-toplevel`, so the same bytes work in every checkout and worktree.
 *
 * Usage:
 *   node scripts/git-hook.ts pre-push
 *
 * `pre-push` reads Git's ref lines from stdin, refuses `refs/heads/main`, and
 * scans the exact pushed range with gitleaks. Exit codes: 0 passed, 1 refused,
 * 2 the check could not complete.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const BLOCKED_REFS = new Set(["refs/heads/main"]);
const ZERO = /^0+$/u;

export interface PushRef {
  localRef: string;
  localSha: string;
  remoteRef: string;
  remoteSha: string;
}

/** Git's four-field pre-push lines, with blank and malformed lines dropped. */
export function pushRefs(input: string): PushRef[] {
  const refs: PushRef[] = [];
  for (const line of input.split("\n")) {
    const fields = line.trim().split(/\s+/u);
    if (fields.length !== 4) continue;
    const [localRef, localSha, remoteRef, remoteSha] = fields;
    if (localRef === undefined || localSha === undefined) continue;
    if (remoteRef === undefined || remoteSha === undefined) continue;
    refs.push({ localRef, localSha, remoteRef, remoteSha });
  }
  return refs;
}

/** A deletion pushes no object, so it has nothing to scan. */
export function isDeletion(ref: PushRef): boolean {
  return ZERO.test(ref.localSha);
}

/** The ruleset is the real gate; this makes the mistake visible locally. */
export function blockedRef(remoteRef: string): boolean {
  return BLOCKED_REFS.has(remoteRef);
}

function git(root: string, ...args: string[]): string | null {
  const result = spawnSync("git", ["-C", root, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    windowsHide: true,
  });
  if (result.status !== 0) return null;
  const value = (result.stdout ?? "").trim();
  return value.length > 0 ? value : null;
}

function repositoryRoot(): string | null {
  return git(".", "rev-parse", "--show-toplevel");
}

/** The commit a new branch diverged from, or null when it cannot be resolved. */
function mergeBase(root: string, oid: string): string | null {
  for (const candidate of ["origin/main", "origin/HEAD", "main"]) {
    if (git(root, "rev-parse", "--verify", "--quiet", candidate) === null) continue;
    const base = git(root, "merge-base", candidate, oid);
    if (base !== null) return base;
  }
  return null;
}

function scanRange(root: string, from: string, to: string): number {
  const result = spawnSync(
    "gitleaks",
    ["git", `--log-opts=${from}..${to}`, "--redact", "--no-banner"],
    { cwd: root, stdio: "inherit", windowsHide: true },
  );
  if (result.error !== undefined) {
    console.error(
      "hook-pre-push: gitleaks is not installed; run `mise install` before pushing.",
    );
    return 2;
  }
  return result.status ?? 1;
}

export function prePush(input: string): number {
  const root = repositoryRoot();
  if (root === null) {
    console.error("hook-pre-push: not inside a Git worktree");
    return 2;
  }

  const refs = pushRefs(input);
  for (const ref of refs) {
    if (blockedRef(ref.remoteRef)) {
      console.error(
        `hook-pre-push: ${ref.remoteRef} takes a pull request; refusing the push (C2.1)`,
      );
      return 1;
    }
  }

  for (const ref of refs) {
    if (isDeletion(ref)) continue;
    const to = git(root, "rev-list", "-n", "1", ref.localSha);
    if (to === null) continue;
    const from = ZERO.test(ref.remoteSha)
      ? mergeBase(root, to)
      : git(root, "rev-list", "-n", "1", ref.remoteSha);
    if (from === null) {
      console.error(
        `hook-pre-push: could not resolve the base for ${ref.remoteRef}; refusing the push`,
      );
      return 2;
    }
    const status = scanRange(root, from, to);
    if (status !== 0) {
      console.error(
        `hook-pre-push: gitleaks rejected the pushed range for ${ref.remoteRef}`,
      );
      return status;
    }
  }

  return 0;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(prePush(readFileSync(0, "utf8")));
}
