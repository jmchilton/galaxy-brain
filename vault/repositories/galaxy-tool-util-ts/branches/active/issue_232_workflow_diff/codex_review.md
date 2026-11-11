Run via gpt-6-sol at medium effort.

Codex reviewed `62d073cc` (after the fixture re-sync from gxformat2 `729027d`) against `7370df1b`, read-only, with the Python `diff.py` and contract as reference. It returned four findings; three were confirmed by probe and fixed red-to-green, one is an already-accepted divergence. Fixes are in `e6000747` and `709e1b7c`.

## Confirmed and fixed

- **P1: a missing file exits 1 with a stack trace, not 2.** `readWorkflowFile` called `readFile` outside its try, so `gxwf diff missing.yml b.yml` rejected (ENOENT, exit 1). `readWorkflowFile` now reports `Failed to read <path>` and returns `null`, like a parse failure. This also fixes `draft-extract` and the other callers, whose headers promise exit 2 on read failure. Test: `cli/test/diff.test.ts` "exits 2 when a workflow file cannot be read".
- **P2: nested input-model type defaults.** Python's pydantic models default `WorkflowTextValidator.type` to `regex`, `RecordFieldDefinition.type` to `File` and `SampleSheetColumnDefinition.type` to `string`. The TS Effect schemas mark `type` required and carry no default, so TS reported `{expression}` vs `{type: regex, expression}` as a change. `INPUT_MODEL_LIST_FIELDS` became `INPUT_MODEL_DEFAULTS`, which fills those defaults after dropping nulls. Python and TS now agree on all three pairs, and on a non-default `type: int` still counting as a change.
- **P2: `__proto__` keys vanish.** Result records were built by assignment, so a step key, input id, output id or state path named `__proto__` set the prototype. A step `__proto__` was dropped from `steps.added`, and `has_changes` came out false (Python: true). Every keyed record now goes through `keyed()` (`Object.fromEntries`).

## Needs decision / accepted

- **P2: a `GalaxyUserTool` run overrides an explicit `type:`.** This is already a recorded divergence (debrief "Step type precedence"; normal review "Not acted on"). It only affects invalid input, and the shared `inferredStepType` keeps the precedence that `mermaid`/`cytoscape` had before this branch. Unchanged.

## Coverage

Codex skipped the synced fixtures, expectations, docs and manifest. They are byte-copies from gxformat2 and are checked by `make check-sync` against the gxformat2 branch.

## For the Python side (gxformat2#296)

- Add `diff.yml` cases where an omitted validator/record-field/column `type` equals its default, so the TS defaults table is pinned cross-language.

## Follow-up (not this branch)

- TS strict validation requires `type` on `WorkflowTextValidator`, `RecordFieldDefinition` and `SampleSheetColumnDefinition`, where Python defaults it. The schema generator drops these defaults.
