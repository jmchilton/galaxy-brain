# Implementation debrief: `issue_232_workflow_diff`

Head `54c68efb`, base `origin/main` `7370df1b`. Five commits:

1. `9090d439`: syncs the fixtures and adds `fixture_after` to the declarative runner. The 20 `diff.yml` cases run as unknown-op expected failures here.
2. `e2d4d3b6`: adds `diffWorkflows`.
3. `5f81ba02`: adds the `gxwf diff` CLI.
4. `bb20f750`: treats explicit `null` keys in nested input-model lists as unset, to match pydantic's null-fill. Found by probe; red-to-green.
5. `54c68efb` (normal review, [subagents/normal_review.md](subagents/normal_review.md)): untyped steps with a `run` report `type: subworkflow` (shared `inferredStepType`, also used by mermaid/cytoscape); `StepSummary.connections` dedupes self-sourcing edges; output actions derive from the step-output schema fields; `plan_fields` typed by `PlanField`. Red-to-green.

## What was built

- `packages/schema/src/workflow/workflow-diff.ts`:
  - `diffWorkflows(before, after): WorkflowDiff` takes parsed docs. The result interfaces use the Python field names (snake_case, plus camelCase `restrictOnConnections`), so no `toSnakeCaseKeys` wrapper is needed.
  - `renderWorkflowDiff(diff)` is the port of `render_text`.
  - Both are exported from both schema barrels.
- It reuses `normalizedFormat2`, `resolveSourceReference`, and from `draft-checks`:
  - `iterateSteps`, now exported. It already mirrored Python `iterate_steps`, including index ids.
  - The new exported `presentPlanFields`. Two inline copies in `draft-checks` now use it.
- `normalizedFormat2`: list-form inputs now resolve type aliases (`File` → `data`), as dict-form inputs and Python already did. Found by a probe; red-to-green in `workflow-diff.test.ts`.
- `packages/cli/src/commands/diff.ts`:
  - `gxwf diff <before> <after> [--json] [--exit-code]`, with a spec entry and handler.
  - Exit 1 only with `--exit-code` when there are changes.
  - Exit 2 on a read failure, native input or `$graph` input, matching the `draft-*` siblings.
- Harness: `TestCase.fixture_after`. The runner passes both fixtures to the operation and skips the case if either fixture is missing.
- Sync: the manifest gets a `gxformat2/examples/format2/diff/` entry.
- Docs: a line in `docs/guide/workflow-operations.md`, a regenerated `SKILL.md`, and a changeset (minor for schema and cli).

## Tests

- Red: 20 `diff.yml` failures against a throwing stub. Green: all 20 pass.
- Parity: a scratch test diffed the TS JSON (deep equal) and text against Python `diff_workflows`/`render_text` output for all 20 pairs. Everything matched. An extra probe covered list-form steps with index ids, `@import` vs URL `run`, `tool_state` JSON strings, `$link` state, empty-dict state leaves, a validator with explicit `negate: null`, and `rename: ""` / `set_columns: {}`. It matched after the alias fix.
- `schema/test/workflow-diff.test.ts`:
  - text rendering, ported from `test_diff.py`
  - native, `$graph` and non-mapping rejection
  - `@import` run
  - list-form alias
- `cli/test/diff.test.ts`: text, JSON equal to `diffWorkflows`, `--exit-code` 0/1, and native exit 2.
- Gate: `make check`, `pnpm lint:unused:ci` (knip), `pnpm build` and `pnpm test` are all green.

## Divergences from the Python contract

- **JS integer-like keys:** JS objects hoist integer-like keys ahead of all string keys, in numeric order. Index ids rise with position, so all-unlabeled list-form steps keep workflow order; mixed labeled/unlabeled steps `[a, <2>, c]` come out `2, a, c` (Python: `a, 2, c`) in both JSON and `renderWorkflowDiff` text. `Side` Maps keep order; the result objects don't. Accepted: JSON object order isn't semantic, and those steps already warn.
- **Step type precedence:** `inferredStepType` treats a `GalaxyUserTool` run as `tool` even with an explicit `type:`, whereas Python honors `type:` first. The input is invalid, so this is accepted.
- **Undeclared `out` keys:** TS compares only the declared output actions. Python dumps the `extra="allow"` model, so an extra key such as `_plan_note` on an `out` entry counts as an action change there, against the contract's action list and "`_plan_*` never compared". Python should change.
- **Lenient normalization:** TS normalization doesn't validate the way pydantic does. Python raises on malformed input (for example, a list-form input with a string `format`), while TS diffs it, and `format` is listified in the diff.
- **Nested input models** (`validators`, `restrictions`, `suggestions`, `fields`, `column_definitions`):
  - Python compares these as pydantic dumps, which fill unset keys with `null`. TS drops `null` keys before comparing, so membership matches.
  - Reported values differ in shape: TS shows the raw objects without the filled-in nulls.
  - Where an input type doesn't declare the field (for example `validators` on an `int` input, which is invalid Format2 that Python keeps raw), Python treats an explicit `null` as a change and TS doesn't.
  - TS fills the pydantic `type` defaults the TS schemas lack (validator `regex`, record field `File`, column `string`; `709e1b7c`). On such invalid input Python also counts an omitted defaulted `type` as a change and TS doesn't.
- **Numbers:** Python compares `1` and `1.0` as different. JS can't tell them apart.
- **Text output:** values use Python `json.dumps` separators, but non-ASCII is not `\u`-escaped. The text format is not part of the contract.

## Left undone / follow-ups

- Re-sync `diff.yml` and the fixtures from gxformat2 main after galaxyproject/gxformat2#296 merges (last re-synced from the branch at `efb2e5b` in `4d086efa`: 32 cases, adding the id-pairing fallbacks and the two-level relabeled-parent case; see [delta review](subagents/delta_review.md)).
- Pre-existing drift from gxformat2 main was left unsynced: `synthetic-extra-field-output.gxwf.yml` and the `validate_format2.yml` strict cases. TS doesn't reject an extra output field under strict validation (`test_extra_field_output_rejected_format2_strict` fails), so it needs its own issue.
- Nothing else beyond Python's own "left undone" list (linked subworkflow contents, native, `$graph`; inline recursion added in `a5c6cd57`).
- Reviewed and hardened afterwards: [normal review](subagents/normal_review.md), [Codex](codex_review.md) (`e6000747`, `709e1b7c`), [thermo-nuclear](thermo_nuclear_review.md) (`e796e9d7`, `a8c6ea89`).
