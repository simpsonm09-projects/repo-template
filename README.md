# repo-template

A layered Kotlin service on Java 25 and Spring Boot 4, wired to the shared `repo-standard`.
It ships one feature, item CRUD over HTTP, as a worked example of the fleet's layering and
tooling.

This repository lives in `simpsonm09-projects/repo-template`. Work happens on a branch
with a pull request into `main`.
See [`repo-standard`](https://github.com/simpsonm09-projects/repo-standard)
for the branch model and the protection rules.

## What it does

- A layered package under `src/main/kotlin`: `api`, `service`, `domain`, `persistence`, `config`, and `exception`.
- Spring Web MVC, bean validation, Spring Data JPA over H2, and Actuator, with springdoc generating the OpenAPI document from the code.
- Unit tests for the service and the controller, an integration test over the real endpoints, and a test that writes `docs/openapi.json`.
- JaCoCo coverage converted to lcov by `scripts/jacoco-to-lcov.mjs`. The shared CI coverage workflow runs the pinned standard's patch gate: 80 percent of changed lines and 70 percent of changed branches.
- A CI caller that runs the shared lint, aislop, security, standard, and coverage jobs plus this repository's `fmt` and `test` jobs.
- A multi-stage `Dockerfile` and a `compose.yaml` for local runs.

## Quick start

```bash
just install    # install the pinned tools with mise
just deps       # resolve the Gradle dependencies
just check      # everything CI requires
```

## Commands

| Recipe | Does |
| --- | --- |
| `just` | Lists the recipes. |
| `just install` | Installs the pinned tools with `mise install`. |
| `just deps` | Resolves the Gradle dependencies. |
| `just fmt` | Formats Kotlin with ktlint. |
| `just fmt-check` | Checks Kotlin formatting with ktlint. |
| `just lint` | Runs flint over the tracked files. |
| `just complexity` | Runs the Detekt complexity gate. |
| `just test` | Runs the JVM test suite. |
| `just test-workflow` | Runs the offline tests for the repository scripts. |
| `just coverage` | Runs the tests and writes `coverage/lcov.info`. |
| `just spec` | Regenerates `docs/openapi.json` from the code. |
| `just spec-check` | Fails when the generated API document differs from the code. |
| `just check` | Runs everything CI requires. |
| `just hooks` | Installs the guarded git hook. |
| `just agent-files` | Checks `.agents/skills/` against `.claude/skills/`. |
| `just prune` | Deletes local branches merged into `main`. |

The recipes run the pinned tools through `mise exec --`, so run `just install` once.

## Documentation

Read the [documentation index](docs/README.md) for the architecture, the feature pages, and the
generated OpenAPI document.

## Layout

- `src/main/kotlin/com/simpsonm09/template/` holds the application, split into layers.
- `src/test/kotlin/com/simpsonm09/template/` holds the unit, integration, and document tests.
- `docs/` holds the documentation tree; [docs/README.md](docs/README.md) is the index.
- `justfile` is the one local entry point for a human or an agent.
- `scripts/` holds the coverage converter, the Dependabot summary tests, the agent-file check, and the shared prune script.
- `.env.example` describes the optional local file; root `.worktreeinclude` lists `.env` for worktree copying. See [Repository setup](docs/features/repository-setup.md).
- `.github/workflows/ci.yml` is the caller for the shared workflows plus the `fmt` and `test` jobs.

## Starting a repository from this template

The decisions a new repository owner makes on day one are in [Repository setup](docs/features/repository-setup.md#decide-on-day-one).

## License

MIT. See [`LICENSE`](LICENSE).
