#!/usr/bin/env node
// Prove the agent-file checker. Each case builds a throwaway tree and asserts
// the named gap, so a change to the checker cannot pass silently.
//
// Usage:
//   node --test scripts/agent-files.test.mjs
//
// Exits 0 when every assertion holds and 1 on the first failure.

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { checkAgentFiles, readFrontmatter } from './agent-files.mjs';

const SKILL = '---\nname: verify\ndescription: Check a change before it lands.\n---\n\n# Verify\n';

function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), 'agent-files-'));
  for (const [rel, content] of Object.entries(files)) {
    const full = join(root, ...rel.split('/'));
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  return root;
}

function withLink(root, name, target = join('..', '..', '.agents', 'skills', name)) {
  mkdirSync(join(root, '.claude', 'skills'), { recursive: true });
  symlinkSync(target, join(root, '.claude', 'skills', name));
  return root;
}

test('an empty repository passes', () => {
  const root = mkdtempSync(join(tmpdir(), 'agent-files-'));
  try {
    assert.deepEqual(checkAgentFiles(root), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a matching skill and link pass', () => {
  const root = withLink(fixture({ '.agents/skills/verify/SKILL.md': SKILL }), 'verify');
  try {
    assert.deepEqual(checkAgentFiles(root), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a real directory in .claude/skills fails', () => {
  const root = fixture({
    '.agents/skills/verify/SKILL.md': SKILL,
    '.claude/skills/verify/SKILL.md': SKILL,
  });
  try {
    assert.deepEqual(checkAgentFiles(root), ['skill-link: .claude/skills/verify is not a symlink']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a missing link fails', () => {
  const root = fixture({ '.agents/skills/verify/SKILL.md': SKILL });
  try {
    assert.deepEqual(checkAgentFiles(root), ['skill-link: .agents/skills/verify has no .claude/skills/verify']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a wrong link target fails', () => {
  const root = withLink(fixture({ '.agents/skills/verify/SKILL.md': SKILL }), 'verify', 'verify');
  try {
    assert.deepEqual(checkAgentFiles(root), [
      'skill-link: .claude/skills/verify points at verify, not ../../.agents/skills/verify',
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a link without a skill fails', () => {
  const root = withLink(fixture({}), 'verify');
  try {
    assert.deepEqual(checkAgentFiles(root), ['skill-link: .claude/skills/verify has no .agents/skills/verify']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('frontmatter must name the skill and describe it', () => {
  const root = withLink(
    fixture({ '.agents/skills/verify/SKILL.md': '---\nname: other\n---\n\n# Verify\n' }),
    'verify',
  );
  try {
    assert.deepEqual(checkAgentFiles(root), [
      'skill-name: verify/SKILL.md names "other"',
      'skill-description: verify/SKILL.md has no description',
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a skill without frontmatter fails', () => {
  const root = withLink(fixture({ '.agents/skills/verify/SKILL.md': '# Verify\n' }), 'verify');
  try {
    assert.deepEqual(checkAgentFiles(root), ['skill-frontmatter: verify/SKILL.md has no frontmatter']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a skill directory without SKILL.md fails', () => {
  const root = withLink(fixture({ '.agents/skills/verify/README.md': '# Verify\n' }), 'verify');
  try {
    assert.deepEqual(checkAgentFiles(root), ['skill-missing: verify has no SKILL.md']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('readFrontmatter reads simple pairs', () => {
  assert.deepEqual(readFrontmatter(SKILL), { name: 'verify', description: 'Check a change before it lands.' });
  assert.equal(readFrontmatter('# Verify\n'), null);
});
