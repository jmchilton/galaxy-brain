# foundry#643 — Published `summarize-nextflow` ships the previous schema revision, so `validate-summary-nextflow` is inverted

[Issue](https://github.com/galaxyproject/foundry/issues/643)

Labels at triage (2026-10-22): `needs-triage`. Filed 2026-10-12 on scottcain's behalf; no comments, no linked PRs.

## Findings (2026-10-22)

- Fix (1) shipped: `@galaxy-foundry/summarize-nextflow` 0.4.0 (published 2026-10-16) carries `test_candidates`, `test_selection`, `NfTest.execution_mode`; no `test_fixtures`/`nf_tests`. Its `dist/schema/summary-nextflow.schema.json` is identical (`jq -S` sha256 `d110ccc4…`) to `origin/main`'s package source and the `summarize-nextflow` cast bundle copy.
- `@galaxy-foundry/gxwf-foundry` 0.3.0 pins `summarize-nextflow` 0.4.0. Report was against 0.3.0 / 0.1.2.
- Guard (2) not done: schema has a fixed `$id`, no revision marker; nothing compares bundled schema vs installed validator. Skew can recur whenever the schema changes ahead of a release.
- Not re-run end to end (`validate-summary-nextflow` on a real artifact); conclusion is from schema identity.

## Proposed labels

- `bug` — validator rejected conformant output.
- `roadmap/off` — release hygiene, not roadmap work.
- `priority/v2` — default; fix already released.

## Decide

Close as fixed by 0.4.0 (draft comment below)? File guard (2) as a separate small issue (draft below)?

### Draft close comment

```markdown
Fixed by the 0.4.0 release of `@galaxy-foundry/summarize-nextflow` (2026-10-16), now pinned by `@galaxy-foundry/gxwf-foundry` 0.3.0. Its packaged `summary-nextflow.schema.json` is identical to the one the `summarize-nextflow` skill bundles: `test_candidates`, `test_selection`, and `NfTest.execution_mode` are present, and `test_fixtures`/`nf_tests` are gone. Upgrading should make `foundry validate-summary-nextflow` accept conformant output again.

The guard you suggested (a version marker so skew fails at the start of a run) is tracked separately in #NNN. Closing; reopen if 0.4.0 still disagrees with the bundled schema.
```

### Draft follow-up issue

Title: `summarize-nextflow`: detect bundled-schema vs installed-validator skew before a run

```markdown
Follow-up to #643. The `summarize-nextflow` skill bundles `references/schemas/summary-nextflow.schema.json`, while `foundry validate-summary-nextflow` validates against the copy in the installed `@galaxy-foundry/summarize-nextflow`. Nothing compares the two. When the schema changes ahead of a release, the gate inverts: conformant output fails and stale output passes (#643, fixed for now by 0.4.0).

The schema has only a fixed `$id` and no revision marker.

Proposal: give the schema a revision marker (or check a content hash), have the CLI report it, and have the skill compare it with the bundled copy before the phase starts, failing loudly on a mismatch.
```
