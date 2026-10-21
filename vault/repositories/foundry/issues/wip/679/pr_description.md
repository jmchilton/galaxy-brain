Title: test-plan: fixture-derived evidence, output-attribute families, nested element ids

Fixes #679.

The test-plan schema couldn't say whether an expected value was measured or made up, and it had no documented place for collection checks like `element_count`.

**`evidence`**
- New assertion-level value `fixture-derived`: the value was measured from upstream fixture bytes, but the source has no assertion to translate.
- `test-evidence` now means only a value translated from an upstream assertion, checksum or expected file.
- `nextflow-test-to-galaxy-test-plan` no longer says "prefer `test-evidence`". For snapshot-only nf-tests, it now splits assertions between `fixture-derived` and `intent`, and records the warning `no-upstream-expected-outputs`.
- The `derived_from` fields at the plan and test-case level are unchanged.

**`family`**
- The description now lists the output fields that sit beside `asserts:` rather than inside it: `element_count`, `count`, `ftype`, `checksum`, `metadata`.
- `collection_type` stays in `collection_shape`, and a non-null `element_identifier` already implies `element_tests`.
- `implement-galaxy-workflow-test` now says where each of these goes in the test file.

**`element_identifier`**
- Nested collections join identifiers outermost first with `/`, e.g. `WT_REP1/forward`.

The 6 test-plan casts and `Dashboard.md` are regenerated, and there is a changeset (minor bump for `@galaxy-foundry/gxwf-foundry`).

Tests: added cases that accept `fixture-derived` on an assertion and reject it at `source.derived_from`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
