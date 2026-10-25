# Re-scope debrief

[Scope evaluation](earlier_drafts/1/scope_evaluation.md) recommended **expand** with three items. I took two and deferred one to John. Original scope is kept as alt `issue_24441_tool_shed_upload_dry_run_alt_original_scope` at `6a0913cf62a` ([alts/original_scope.md](alts/original_scope.md)).

## Done (head `e9b8286b563`, two commits on top of the original feature)

1. **`Isolate sample files when resetting tool shed metadata`** (`40bd905ab69`). Tool shed reset mode had three problems:
   - It staged de-suffixed sample copies inside the clone it was scanning, so a tool shipped only as `*.xml.sample` became a tool.
   - Those copies leaked into later revisions, because `hg update` leaves untracked files.
   - It read samples from the real repo's working copy (tip) instead of the revision being reset.

   Metadata generation now stages samples in `ValidationContext`'s temp tool data dir, which is removed in `finally`, so there is no leak when generation raises. Reset reads samples from the revision. Galaxy never enables reset mode, so the dry run's `isolate_files_dir` flag and the prefer-working-copy branch are deleted. Red-to-green: `test_reset_ignores_tools_shipped_only_as_samples` and `test_reset_reads_sample_files_from_each_revision` in `test_repository_metadata_manager.py`.
2. **`Report whether a tool shed upload dry run's revision is installable`** (`e9b8286b563`).
   - New `installable` field: whether the row the new tip gets would be downloadable. It reuses the rule for whichever branch the real upload takes: `is_downloadable` on overwrite, `create_or_update_repository_metadata_with_details(dry_run=True)` on create.
   - `creates_new_installable_revision` now requires it.
   - Tests:
     - sample-only first upload: not installable, matching the real row
     - overwrite that is no longer installable
     - parity `installable is tip_row.downloadable`
     - API `installable` assert
   - Shed `schema.ts` regenerated.

## Deferred to John

- `new_data_manager_required` compares the wrong metadata key, so data manager changes never force a new installable revision. Not taken:
  - It changes real-upload behaviour on production sheds.
  - It flips an existing `dev` assertion (`test_reset_dm_with_uninstallable_revisions`).
  - The bug is on `release_25.1`/`26.0` too, so it belongs on its own release-targeted branch.
- The dry run mirrors today's behaviour. Recorded in `index.md` Decisions.

## Reviews and checks

- [Normal review 2](subagents/normal_review_2.md): both should-fixes and the dead-flag nit acted on.
- Unit `test/unit/tool_shed/`: 139 passed.
- `test_shed_repositories.py`: 47/47.
- `test_0300_reset_all_metadata.py`: 21 passed. Its `test_0110` XPASS also happens with the pre-rescope generator, so it isn't caused by this branch.
- mypy clean on touched files.

## Production behaviour change (PR body)

Reset now agrees with upload:
- A non-`.sample` `.loc` committed at the repo root no longer satisfies a data table during reset.
- Sample-only tools drop out.
- Old revisions read their own samples.
- No stray copies carry over across `hg update`.

Some repositories may get different metadata rows after an admin reset.
