Run via Claude Opus at high effort.

No refactoring of the base branch was performed. This was a report-only run: no history was rewritten. There are two optional hoists, both into parents that are in decision state:

- `note_lines` and `report_dict` → `tool_security_static_findings`'s `classify.py`. This is now a byte-identical move.
- `compat_doc` → `tool_patches`' `unittest_utils/tool_patches.py`, which `test_patch_review.py` would then reuse.

Nothing else in the integration commits (`bd7d4595d4b..HEAD`) can land in either parent first. The earlier draft is in `earlier_drafts/1/baseline_refactor.md`.

## Topology

- HEAD is `tool_security_static_findings` (`d4ae281e442`, the merge-base, still the parent's head), then the rebuilt `tool_patches` commits (ending `bd7d4595d4b`), then the integration commits.
- Neither parent is an ancestor of the other. A hoisted change must land in one parent without needing the other. Code that touches both `security` and `patches` can't move.
- The integration commits touch only `security/__main__.py`, the 2-line `finding_to_dict` rename in `security/report.py`, the new `security/patch_review.py`, the docs and the new test file.

## Candidate 1: `note_lines` + `report_dict` → `tool_security_static_findings` `classify.py` (optional)

- **What.** Both depend only on `Report` and `Classification`, and both pull out code the parent already has:
  - `report_dict` is the inline `{**report.to_dict(), "codes", "uncheckable_locations"}` in the parent's `main`.
  - `note_lines` is the three NOTE loops in the parent's `_print_report`: `report.unanalyzed`, then `classification.unchecked_locations`, then `classification.reasons`.
- **The earlier caveat no longer holds.** The earlier draft said the move was not byte-identical because `note_lines` deduped repeated `unanalyzed` strings. `812703c96b6` made `note_lines` a list that keeps repeats, in the parent's loop order. Moving it into the parent and having the parent's `_print_report` use it prints the same lines, so it is a pure refactor there.
  - This branch's own check confirms it. With no `--tool-patch-path`, the CLI text and JSON over `test/functional/tools` and the spec tools match the parent's, apart from the `identifier_single_fixed.xml` fixture that only this branch has.
- **Where.** `classify.py`, because `classify.py` already imports `report` and both helpers take a `Classification`. Not the parent's `__main__.py`, since `patch_review.py` shouldn't import the CLI module.
- **Cost.**
  - `tool_security_static_findings` is BLOCKED on a PR-shape decision. Taking this reopens it.
  - On rebuild, `b53897840ee` would mostly dissolve, and `812703c96b6` would move to the parent too.
  - The gain is two helpers with one parent caller each. Worth doing only if the parent is reopened for another reason.

## Candidate 2: `compat_doc` → `tool_patches` `unittest_utils/tool_patches.py` (optional)

- **What.** `test_patch_review.py`'s `_compat_patch(ops)` (from `87eab50a554`) builds the same document as `compat_doc(*ops, **fields)` in `test_tool_patches.py`, which is `tool_patches` code. `unittest_utils/tool_patches.py` already holds `security_patch`. `compat_doc` would join it, and this branch would drop `_compat_patch`.
- **Cost.** It's a test-only move in `tool_patches`, which is in decision state. This branch would rebase onto it. It's small, so only do it if `tool_patches` is reopened.

## Not candidates

- **`finding_to_dict` rename (`report.py`).** The parent has no external caller. The only one is `patch_review.py` here.
- **`FailOn` and the CLI plumbing.** These exist only for `--tool-patch-path`:
  - the `mismatch` and `uncleared` fields, `FailOn.patch_met`, `MISMATCH` and `UNCLEARED`. Since `9fc1faf4440`, `FailOn.met` is exactly the parent's;
  - `_finding_line`, which would have only one caller in the parent;
  - `Reviewed.patch_review` and the `_reviews` signature;
  - the `parser = _parser()` / `parse_args` split and `_patch_database`;
  - `--guid` and `_print_patch_review`.
  Splitting them out would leave dead parameters in the parent.
- **`load_collection` in `patches/database.py`.** It is new API, not code pulled out of these commits.
- **Docs and module docstring.** These describe the feature only.
