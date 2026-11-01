# Initial implementation debrief: issue_24350_has_line_matching_docs_26_1

Docs-only fix for galaxyproject/galaxy#24350. `has_line_matching` gets its own `expression` description. Its docstring now explains the `^expression$` per-line wrap, the `.*` needed after a prefix, and grouping alternatives. `has_text_matching` now says it does unanchored search, that `^`/`$` refer to the whole output, and that `(?m)` changes this. Every generated artifact was regenerated.

```
created .../differential-review/snapshots/20261101T143515Z-implementation-3d0791a59b79.json
  implementation @ 3d0791a59b79 vs origin/release_26.1 (merge-base 32f18adbdd1c)
  first snapshot: 4 commits, 6 files, 20 hunks
```

## Commits (base `release_26.1`)

1. `Baseline tests ...` plus its `fixup!`. Two parametrized tests in `test/unit/tool_util/verify/test_asserts.py` pin the current behavior:
   - `has_line_matching`: `I\t` and `^I\t` count 0; `I\t.*` and `^I\t.*$` count 2; a grouped alternative counts 2; ungrouped `I\t|II\t` counts 2, half-anchored.
   - `has_text_matching`: `I\t` counts 3 and `^I\t` counts 1.
   These tests pass on the base branch.
2. `Document that has_line_matching anchors ...` plus its `fixup!`. This splits `Expression` into `Expression` and `LineExpression` in `asserts/text.py`, extends both docstrings, and regenerates `galaxy.xsd`, `tool_util_models/assertions.py`, `client/packages/api-client/src/schema/schema.ts` and `client/src/components/Tool/ToolSourceSchema.json`.

The `fixup!` commits hold the changes from the review round. A force-push to fold them in was denied, so they were pushed as autosquash fixups. Run `git rebase --autosquash origin/release_26.1` and force-push when polishing.

## Choices

- **Docs only, no behavior change**, as the issue's proposed approach says. The ungrouped `^{e}$` wrap is a real quirk, but grouping it changes counts for existing tests that use `|`. The scope evaluation is left to weigh that.
- **Target `release_26.1`.** It is the oldest release whose client artifacts (`schema.ts`, `ToolSourceSchema.json`) carry these descriptions, so the PR is self-contained and forward-merges cleanly. `release_25.1` also has the bug, but only in `galaxy.xsd` and `assertions.py`.
- The docstring examples use `\t` written as an escaped backslash in the source, so the generated docs show a literal `\t` rather than a tab.

## Review

Normal review (`subagents/normal_review.md`) found no blockers and no medium findings. I acted on the ungrouped-alternation test, the `(?m)` tip and the `\t` example.

## Environment notes

- `codegen.py` needs `xmllint` on PATH, which is not installed system-wide. I used `/home/ubuntu/miniforge3/bin/xmllint` with `.venv/bin` first on PATH for black and isort. Without it the XSD is rewritten unformatted and the run aborts.
- Unit tests need `-p no:postgresql` locally, because the `pytest_postgresql` plugin can't load libpq.
