Run via Claude Opus at high effort.

**Two behavior-neutral refactor commits now sit on dev ahead of the fix: the public renames, and helpers extracted from `build_workflow_run_configs`.** The final tree is byte-identical to the pre-refactor head `996d48d2e69`. The new head is `9f2d892ad17`, pushed.

History on `7e16f446410`:

1. `fde4e03dd8d`, Baseline tests (unchanged).
2. `cc2099794c5`, "Make sample sheet and claimed landing lookups public":
   - `dereference._validate_sample_sheet_metadata` becomes `validate_sample_sheet_metadata`;
   - `LandingRequestManager._get_claimed_workflow_landing_request` becomes `get_claimed_workflow_landing_request_model`;
   - callers are updated, with no behavior change.
3. `7e670abd636`, "Extract target history and parameter checks from workflow run configs". In dev's `run_request.py`:
   - `_new_history_name` is split out, and `_get_target_history` now returns the existing history or the base name;
   - the resource and replacement parameter checks move into `_validate_resource_params` and `_validate_replacement_params`;
   - call order is the same as dev's.
4. `7848553da11`, "Validate workflow run requests before creating histories": the core fix, so the diff shrinks by the extracted pieces.
5. `9f2d892ad17`, "Check the landing request before invoking a workflow".

Checks at `7e670abd636` (refactors only, no fix):

- `test/unit/app/managers/test_landing.py` plus `test/unit/workflows`: 297 passed, 1 skipped.
- `test_workflows.py`, a selection covering the baseline tests, replacement and resource params, URL, sample sheet and batch: 25 passed.
- `test_landing.py`: 20 passed.

Notes:

- The first subagent run died mid-rewrite on an API error (ENOTFOUND). It left the worktree detached at `7e670abd636`, with the branch ref still at `996d48d2e69`.
- The coordinator checked out the two behavior commits from the pushed head's trees: the validation commit from `005a164cbe9`'s `services/workflows.py` hunk plus `996d48d2e69`'s other files, then the landing commit with the rest. It reused the original messages.
- Nothing else looked worth lifting out. The new validators in `modules.py` and the two-phase loop only exist to serve the fix.
