# Task runner for humans and agents. `just --list` shows every
# recipe. Keep each recipe a thin call to a portable tool or a script under
# scripts/. See https://github.com/simpsonm09-projects/repo-standard/blob/main/docs/task-runner.md

# List the recipes.
default:
    @just --list

# Install the pinned tools.
install:
    mise install

# Resolve and download the Gradle dependencies.
deps:
    mise exec -- gradle dependencies

# Format Kotlin with ktlint.
fmt *files:
    mise exec -- node scripts/fmt.mjs {{files}}

# Check Kotlin formatting with ktlint.
fmt-check:
    mise exec -- ktlint

# Run every linter over the tracked files.
lint *files:
    mise exec -- flint run --full

# Fix what the linters can fix.
lint-fix:
    mise exec -- flint run --fix

# Run the Detekt complexity gate over the main Kotlin sources.
complexity:
    mise exec -- detekt --config detekt.yml --input src/main/kotlin

# Run the AI-slop gate.
aislop:
    npx --yes aislop@0.16.1 ci

# Run the test suite.
test:
    mise exec -- gradle test

# Run the offline tests for the repository scripts.
test-workflow:
    mise exec -- node --test scripts/dependabot-summary.test.mjs scripts/agent-files.test.mjs

# Run the tests with coverage and convert the JaCoCo report to lcov.
coverage:
    mise exec -- gradle test jacocoTestReport
    mise exec -- node scripts/jacoco-to-lcov.mjs

# Regenerate docs/openapi.json from the application.
spec:
    mise exec -- gradle generateOpenApi

# Fail when the generated API document differs from the code.
spec-check:
    mise exec -- gradle generateOpenApi
    git diff --exit-code -- docs/openapi.json

# Everything CI requires.
check: fmt-check lint complexity test test-workflow spec-check

# Historical alias for `check`, kept for the support template.
verify: check

# Install the shared Lefthook hooks and assert the merged jobs (C7.8).
hooks:
    mise exec -- node scripts/hooks.ts

# Check the .agents/skills tree and its .claude/skills links.
agent-files:
    mise exec -- node scripts/agent-files.mjs

# Staged secret scan (C7.10).
secrets-staged:
    mise exec -- gitleaks git --staged --redact --no-banner

# Reject env files, private keys, kubeconfigs and files over 5 MB (C7.10).
forbidden-files *files:
    mise exec -- node scripts/forbidden-files.ts {{files}}

# actionlint and zizmor over the given workflows, or every workflow (C7.10).
workflows *files:
    {{ if files == "" { "mise exec -- actionlint" } else { "mise exec -- actionlint -- " + files } }}
    {{ if files == "" { "mise exec -- zizmor --quiet .github/workflows" } else { "mise exec -- zizmor --quiet " + files } }}

# shellcheck over the given scripts; nothing to do when none are given (C7.10).
shellcheck *files:
    {{ if files == "" { "echo shellcheck: no files to check" } else { "mise exec -- shellcheck -- " + files } }}

# Advisory Conventional Commit check (C2.4); never fails the commit (C7.10).
commit-msg file:
    mise exec -- node scripts/commit-msg.ts {{quote(file)}}

# Read the pushed refs from stdin, refuse main, and scan the range (C7.10).
hook-pre-push:
    mise exec -- node scripts/git-hook.ts pre-push

# Fast pre-push subset, under 30 seconds (C7.10). It runs the same
# recipes the required pull-request checks run, so CI confirms what
# the hook already caught (C5.7).
pre-push-check:
    just fmt-check
    just lint
    just complexity
    just test
    just test-workflow
    just spec-check

# Refresh locked dependencies when a manifest changed (C7.10).
deps-refresh *files:
    {{ if files == "" { "mise exec -- node scripts/deps-refresh.ts mise.toml" } else { "mise exec -- node scripts/deps-refresh.ts " + files } }}

# Owner hook: fail when this checkout cannot sign commits (C2.7).
signing-check:
    mise exec -- node scripts/signing-check.mjs

# Prune remote-tracking refs and delete local branches merged into main.
prune:
    mise exec -- node scripts/prune.mjs
