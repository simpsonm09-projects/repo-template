# Cross-platform task runner for humans and agents. `just --list` shows every
# recipe. Keep each recipe a thin call to a portable tool or a script under
# scripts/. See https://github.com/simpsonm09-projects/repo-standard/blob/main/docs/task-runner.md
set windows-shell := ["powershell.exe", "-NoLogo", "-NoProfile", "-Command"]

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
fmt:
    mise exec -- ktlint --format

# Check Kotlin formatting with ktlint.
fmt-check:
    mise exec -- ktlint

# Run every linter over the tracked files.
lint:
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

# Install the guarded git hook.
hooks:
    git config --local core.hooksPath .githooks

# Check the .agents/skills tree and its .claude/skills links.
agent-files:
    mise exec -- node scripts/agent-files.mjs

# Prune remote-tracking refs and delete local branches merged into main.
prune:
    mise exec -- node scripts/prune.mjs
