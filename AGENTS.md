# repo-template working agreements

A layered Kotlin and Spring Boot item CRUD service, and a starting point for the fleet's JVM
repositories.

## Ground rules

- Business logic lives in `service/` and works in `domain.Item`. The controller never sees a JPA entity and the service never sees a DTO.
- `docs/openapi.json` is generated. Annotate the code and run `just spec`; never hand-edit the document.
- No secret, credential, or machine path is committed.

## Commands

- `just install`, `just deps`, `just fmt-check`, `just lint`, `just complexity`, `just test`, `just coverage`, `just spec`, `just check`, `just agent-files`.

## Repo facts

- Language and toolchain: Kotlin version is set in `build.gradle.kts`; Java, Gradle and Node versions are pinned in `mise.toml`. Spring Boot uses Gradle with the Kotlin DSL. Kotlin formatting is ktlint; the `.mjs` helpers run on Node until they port to Bun TypeScript.
- Data: H2 in memory, `spring.jpa.hibernate.ddl-auto=update`, entity `persistence.ItemEntity` in the `items` table. The `dev` profile seeds three items.
- Domain: item CRUD. Reads and deletes of an unknown id raise `ItemNotFoundException`, which `GlobalExceptionHandler` maps to a 404 problem detail.
- Coverage: JaCoCo writes `build/reports/jacoco/test/jacocoTestReport.xml`; `scripts/jacoco-to-lcov.mjs` converts it to lcov for the patch gate.
- `docs/` holds the documentation; `docs/README.md` is the index and `docs/manifest.json` declares the feature, diagram, and API documents.
- Hooks: `just hooks` installs the shared Lefthook jobs from `simpsonm09-projects/.github` at the `hooks-v2` tag; `lefthook-local.yml` is git-ignored. Never skip a hook: no `LEFTHOOK=0`, no `--no-verify`, and never create `lefthook-local.yml` (C7.11). The ruleset is the real gate.

## Skills

No repo-local skills. General best practices and integration come from the plugins.
