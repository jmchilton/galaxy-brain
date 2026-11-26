Run via Claude Opus at high effort.

No refactoring of the base branch was performed. This was a report-only run: no history was rewritten, HEAD is still `b53897840ee`, and nothing was committed. One optional hoist is possible: move `note_lines` and `report_dict` (from `b53897840ee`) into `tool_security_static_findings`'s `classify.py`. Nothing else in the 6 integration commits (`bd7d4595d4b..HEAD`) can land in either parent first.

## Topology

- Neither parent is an ancestor of the other. `tool_patches` (`1e92a257548`) is not an ancestor of HEAD, and `tool_security_static_findings` (`d4ae281e442`, the merge-base) is not an ancestor of `tool_patches`.
- HEAD is `tool_security_static_findings`, then a rebuilt copy of tool_patches' 25 commits (ending `bd7d4595d4b`), then the integration commits.
- A hoisted change must therefore land in one parent without needing the other. Code that touches both `security` and `patches` can't move.
- The integration commits touch only `security/__main__.py`, `security/report.py`, the new `security/patch_review.py`, the docs and the new test file. They add nothing under `patches/`. `key_from_ids`, `patches_as_dicts` and `load_tool_patch_database` already exist in tool_patches.

## Candidate: `note_lines` + `report_dict` → `tool_security_static_findings` (optional)

- **What.** Both helpers depend only on `Report` and `Classification`, and both pull out code the parent already has:
  - `report_dict` is the inline `{**report.to_dict(), "codes", "uncheckable_locations"}` dict in the parent's `main`.
  - `note_lines` is the three NOTE loops in the parent's `_print_report`.
- **Where.** They belong in `classify.py`:
  - Not the parent's `__main__.py`, because `patch_review.py` shouldn't import the CLI module.
  - Not `report.py`, because `classify.py` already imports `report` and both helpers take a `Classification`.
  - The thermo-nuclear review's "Placement" note points the same way: "could move to `classify.py` if the base is reopened".
- **Not a byte-identical move.** `note_lines` returns a dict keyed on `("unanalyzed", note)`, so it collapses duplicate `report.unanalyzed` strings. The parent's loop printed every entry.
  - Duplicates can happen. `interp.py`'s `block()` appends "too many shell contexts to follow, some dropped" directly, without going through `note()`'s `_noted` dedupe, so one location can get it once per over-limit statement.
  - So text output dedupes and JSON `unanalyzed` does not. This small text change already ships on this branch relative to the parent.
  - The thermo review's byte-identical check only covered the spec tools plus `identifier_single`, so it would not have caught this.
  - Hoisting means either "move + dedupe" (a parent CLI text change, worth one test) or keeping a list in the parent and adding the dedupe here.
- **Cost.**
  - `tool_security_static_findings` is in decision state after re-hardening, so taking the move reopens its hardening.
  - On rebuild, `83ece287280` and `b4bcd37f017` would lose their private copies (`_report_dict`, `unanalyzed_added`), and `b53897840ee` would mostly dissolve.
  - The gain is small: two helpers with one consumer each in the parent today.
  - Recommend doing it only if the parent is reopened for another reason.

## Not candidates

- **`finding_to_dict` rename (`report.py`).** The parent has no caller outside `report.py`. Its only external caller is `patch_review.py` here, so the rename stays with that caller.
- **`load_collection` raising `CollectionError` (tool_patches).** The thermo review suggested it as new API. It isn't code pulled out of these commits, so it's out of scope for a baseline split. It would let `_patch_database` report the real load error instead of using the `len(db.collections) != len(paths)` check.
- **CLI plumbing.**
  - All of these exist only for `--tool-patch-path`: the `FailOn.met(..., review=)` argument and `MISMATCH`, `Reviewed.patch_review`, the new `_reviews` signature, the `parser = _parser()` / `parse_args` split (needed for `parser.error`), `_patch_database`, `--guid` and `_print_patch_review`.
  - Splitting them out would leave dead parameters in the parent.
- **Docs and module docstring.** These describe the feature only.
- **`Report.add` merging capability findings by `(rule, location, expr)`.** The thermo review left this not acted on. Fixing it would be an analyser behavior fix, not a refactor, and it would need its own decision.
