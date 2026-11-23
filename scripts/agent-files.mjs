#!/usr/bin/env node
// Verify the canonical `.agents/skills` tree and its Claude Code links.
// `.agents/skills/<name>/SKILL.md` is canonical; `.claude/skills/<name>` is a
// relative symlink to it. A repository with no skills passes. See the owner
// standard C8.2, C8.3 and C8.4.
//
// Usage:
//   node scripts/agent-files.mjs [root]
//
// Exits 0 when the trees agree and 1 with one `gap` line per difference.

import { existsSync, lstatSync, readdirSync, readFileSync, readlinkSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const CANONICAL = join('.agents', 'skills');
const LINKS = join('.claude', 'skills');

function entries(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((name) => !name.startsWith('.')).sort();
}

function isDirectory(path) {
  return existsSync(path) && statSync(path).isDirectory();
}

// Read the simple `key: value` pairs from the SKILL.md frontmatter.
export function readFrontmatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!match) return null;
  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    const pair = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (pair) fields[pair[1]] = pair[2].trim();
  }
  return fields;
}

// Return one message per difference between the two skill trees.
export function checkAgentFiles(root = ROOT) {
  const gaps = [];
  const canonical = join(root, CANONICAL);
  const links = join(root, LINKS);
  const skills = entries(canonical).filter((name) => isDirectory(join(canonical, name)));

  for (const name of skills) {
    const file = join(canonical, name, 'SKILL.md');
    if (!existsSync(file)) {
      gaps.push(`skill-missing: ${name} has no SKILL.md`);
      continue;
    }
    const fields = readFrontmatter(readFileSync(file, 'utf8'));
    if (!fields) {
      gaps.push(`skill-frontmatter: ${name}/SKILL.md has no frontmatter`);
      continue;
    }
    if (fields.name !== name) gaps.push(`skill-name: ${name}/SKILL.md names "${fields.name ?? ''}"`);
    if (!fields.description) gaps.push(`skill-description: ${name}/SKILL.md has no description`);
  }

  const linked = entries(links);
  for (const name of linked) {
    const link = join(links, name);
    if (!lstatSync(link).isSymbolicLink()) {
      gaps.push(`skill-link: .claude/skills/${name} is not a symlink`);
      continue;
    }
    if (!skills.includes(name)) {
      gaps.push(`skill-link: .claude/skills/${name} has no .agents/skills/${name}`);
      continue;
    }
    const target = readlinkSync(link);
    const expected = join('..', '..', '.agents', 'skills', name);
    if (target !== expected) gaps.push(`skill-link: .claude/skills/${name} points at ${target}, not ${expected}`);
  }

  for (const name of skills) {
    if (!linked.includes(name)) gaps.push(`skill-link: .agents/skills/${name} has no .claude/skills/${name}`);
  }

  return gaps;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = process.argv[2] ? resolve(process.argv[2]) : ROOT;
  const gaps = checkAgentFiles(root);
  if (gaps.length > 0) {
    for (const gap of gaps) process.stderr.write(`gap ${gap}\n`);
    process.exit(1);
  }
  process.stdout.write('agent-files: ok\n');
}
