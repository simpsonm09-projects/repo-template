# Exceptions

One row per rule this repository cannot meet yet. The reason and the revisit date
are required. The shared `standard` job reads this file.

| Rule | Reason | Revisit |
| --- | --- | --- |
| `C5.1` | The audit snapshot's median pull request run was 149 s, and the first run after this change took 104 s. The required work is the Gradle test job, which also regenerates and diffs `docs/openapi.json`, and the coverage job that reruns the suite for JaCoCo. Sharding the tests and moving the OpenAPI check to `main` are the next steps. | 2027-02-28 |
| `C7.4` | The `scripts/` helpers and their `node:test` suites are still `.mjs` on Node. The Kotlin application has no JavaScript or TypeScript sources, so this change adds the `fmt`, `fmt-check`, `hooks` and `agent-files` recipes without the Bun toolchain. The helpers port to Bun TypeScript with the standard's migration. | 2027-05-31 |
