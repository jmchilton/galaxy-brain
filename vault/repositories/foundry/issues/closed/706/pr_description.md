Title: Pin cast bundles to the schema their validator carries

A skill bundle copies its schema when it is cast. `foundry validate-*` validates against whatever schema its installed package release shipped. When the two differ, the gate inverts: conformant output fails and stale output passes. This bit `summarize-nextflow` in #643. This PR makes that mismatch fail loudly, before the work starts.

## Changes

- **`--schema-sha256 <hex>` on every single-schema `foundry validate-*`.** The validator hashes the schema it carries as sha256 of `JSON.stringify(schema, null, 2) + "\n"`. That is the same bytes cast writes, so the hash equals the ref's `dst_hash` in `_provenance.json`.
  - On a mismatch it exits `4` without validating, and the message says this is a validator/bundle mismatch, not an artifact defect.
  - Given the pin and no artifact, it checks only the pin. That is the preflight.
  - The option is added once in `lib/schema-pin.ts`, and its spec is shared with `foundryCliMeta`.
- **Cast wiring.**
  - `_verify.json` args carry the pin when the bundle copied the schema and the validator is a `foundry` subcommand.
  - The SKILL.md Validation section gains a "before starting" pin check. Its validate command now carries the pin too. A validator release older than this option fails with `unknown option '--schema-sha256'`, and the bullet tells the skill to treat that as skew too.
- **`check-fixtures`.** The registry ignores the pin when comparing validator declarations. The pin describes the bundle, so a producer that copied the schema and a consumer that did not still agree.
- **Docs.** The 9 `content/cli/foundry/validate-*` notes, `schema-packages.md` "Validator invocation", and a changeset (`@galaxy-foundry/gxwf-foundry` minor).
- **Regenerated output.** 35 bundles recast: `_verify.json`, Validation bullets, and the `validate-workflow-brief` CLI sidecar. The Dashboard is regenerated.

## Testing

- New `packages/gxwf-foundry/test/schema-pin.test.ts`, written red first. It covers the hash vs cast bytes, skew exiting 4 unvalidated, a matching pin validating normally, the pin-only check (match and skew), the artifact still being required without a pin, and every single-schema `validate-*` offering the option.
- `tests/cast-mold.test.ts`: the verify manifest pins subcommand validators. The committed `summarize-nextflow` bundle's pin equals `schemaSha256(summaryNextflowSchema)`, which ties the caster and the CLI together.
- `tests/artifact-fixtures.test.ts`: the registry treats a pinned and an unpinned declaration as the same validator.
- Local `make check`:
  - Passed: `validate`, `validate-roadmap`, `check-generated`, `check-planemo-pin`, `check-casts`, `check-verify`, `check-assemble-pipelines`, `check-fixtures`, `test` (494).
  - Also green: `packages-test`, `packages-typecheck`, `typecheck:root`, `lint`, `format`.
  - Failed: `check-vendored`, which compares vendored files against my local Galaxy / galaxy-tool-util-ts checkouts. The drift is in files this PR doesn't touch.
- Smoke-tested the built CLI: a matching pin exits 0, a wrong pin exits 4, and no artifact without a pin exits 1.

- Also ran the CI steps `make check` doesn't cover: `lint:packages`, `check:kinds`, full `typecheck` (with the site), `smoke:packages`, `site:build`, and `changeset status`. All green. I didn't run the Pi container test because there's no Docker here; it uses a synthetic skill and doesn't read the recast bundles.

## Rollout

The recast bundles break validation until this is released. Published `@galaxy-foundry/gxwf-foundry` 0.3.0, and the 0.1.0 baked into the `gxwf-pi-harness` image, reject `--schema-sha256` with `unknown option`. So from merge until a release, each cast skill's preflight and validate step will fail, as the skill text intends, and `validate-artifact` will report failures. CI is unaffected because it validates against workspace sources. Merge together with a `gxwf-foundry` release, and bump the harness image's `FOUNDRY_CLI_VERSION` in the same step.

## Known gap

14 Mold bodies (e.g. `summarize-nextflow` step 8) still spell out the unpinned `foundry validate-<name> <file>` in their procedure. The cast Validation section's preflight still catches skew up front, but the procedure and the Validation section now give different commands. That can follow separately.

Fixes #706

🤖 Generated with [Claude Code](https://claude.com/claude-code)
