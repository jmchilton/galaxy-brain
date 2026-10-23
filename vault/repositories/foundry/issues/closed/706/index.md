# foundry#706 — `summarize-nextflow`: detect bundled-schema vs installed-validator skew before a run

[Issue](https://github.com/galaxyproject/foundry/issues/706) · [PR description](pr_description.md)

Follow-up split from [#643](../../closed/643/index.md) on 2026-10-22. Labels at triage: `needs-triage` (auto).

## Status (2026-10-23)

`closed`: PR [#707](https://github.com/galaxyproject/foundry/pull/707) merged 2026-10-23 (`d6311c5e`), closing the issue. Branch record: [issue-706-schema-skew-guard](../../../branches/merged/issue-706-schema-skew-guard/index.md).

Codex review (2026-10-23): one confirmed finding. The `validate-tests-format` pin hashed Foundry's snapshot `testsFormatSchema`, but `validateTestsFile` compiles upstream `@galaxy-tool-util/schema` `testsSchema` (`^1.14.0`, so the two can drift). They are identical at 1.14.0, so the bug was latent. Fixed in `c10cb59a`, which pins upstream `testsSchema`. A red-to-green test mocks upstream drift.

## Design

- Hash pin, not a path. The validator runs from the user's cwd, so there's no bundle-relative path available. Cast already records the schema hash as the ref `dst_hash`, computed as sha256 of `JSON.stringify(export, null, 2) + "\n"`. The CLI computes the same hash from its own copy of the schema.
- Covers every single-schema `foundry validate-*`, not just summary-nextflow.
- Exit 4 means skew. A pin with no artifact runs as a preflight-only check.
- The pin is added only when the bundle copied the schema. The check-fixtures registry strips the pin before comparing.

## Local gates

`make check` all green except `check-vendored`, which fails on local upstream checkout drift in files this branch doesn't touch.
