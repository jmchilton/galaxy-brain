Run via Claude Opus at medium effort.

# Thermo-nuclear code quality review

I reviewed `git diff origin/release_25.1...HEAD` at `ff28c6828a9` against `vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md`. This is a fresh pass after the re-scope. `earlier_drafts/1/thermo_nuclear_review.md` was used only as reference. I found no structural regression and no code-judo move worth making on a release branch, so this round has **no code changes**.

The fix does one thing in four places. Each raw `_metadata` assignment that shared `MetadataFile` rows now goes through the canonical `metadata` setter (`make_dict_copy` → `FileParameter.make_copy`), the same path `HDA.copy()` already uses. The re-scope's in-place materialization change (`b20d1d56a4f`) follows that pattern. It swaps one line inside an existing `elif replacement_dataset:` branch and adds no new branch. No file crosses 1k lines: `metadata.py` is 796 and `deferred.py` is 411, and `model/__init__.py` was already far over before this branch.

Not acted on:

- **Metadata handling in `deferred.py` now sits in two branches** (not-in-place `copy_from(include_metadata=attached)` plus the detached `_metadata` share, and the in-place replacement setter). I sketched a single post-branch block that picks a metadata source and then chooses share-or-copy. It needs a computed source (`replacement_dataset or (dataset_instance if not in_place else None)`) and an `attached` switch, so a reader holds more concepts than in the current code, where each branch states its own case. I declined it.
- **The `include_metadata=attached` flag plus the compensating `if not attached:` branch.** The previous round declined this, and the reasoning still holds. Moving the share-or-copy choice into `copy_from` would hide a session-dependent mode inside a shared model method.
- **In-place materialization could route through `copy_from`.** That would also copy `info`, `blurb`, `peek`, `extension` and tags onto the in-place instance, which changes behavior. Declined.
- **The redundant `dataset_id = replacement_dataset.dataset_id` and the "Only attached materialization finds a replacement" comment, which could be an assert.** The assignment predates the branch. The comment documents a local invariant that the code directly above shows (`replacement_dataset` is only set under `if attached:`). Neither is worth churning on a release fix.
- **Attached materialization copies metadata files and then may regenerate them.** This is still wasted I/O. Skipping the copy would change the `has_metadata_files` regeneration decision. It's out of scope, as noted before.
- **`make_copy`'s eager `object_store_id` and flush.** These are intentional, and `test_copy_from_inserts_each_metadata_file_row_once` pins them. The `update_from_file` cache-sync change stays backed out, as instructed.
- **Test nits.** The materialization test uses `os.remove` plus `open()`, while the integration tests use `Path.read_bytes()`. The pgcleanup class still inherits `RunsCachedBamJob` across modules. The style mix is cosmetic. The cross-module mixin is a mild smell, but the alternatives (a shared `galaxy_test` helper module, or a duplicated helper) add more moving parts for two tests.

## Tests

- Unit: `test_model_copy.py`, `test_dataset_materialization.py`, `test_galaxy_mapping.py`: 44 passed, 15 skipped.
- SQLite integration: `test_job_cache_metadata_files.py` and `test_dataset_copy_metadata_files.py`: 6 passed.
- Postgres: `test_scripts_pgcleanup.py`: see the hand-off report.
- isort, black, ruff and mypy are clean on the changed files.

<details>
<summary>Full review</summary>

**Structural / code-judo.** The fix itself is the judo move: it deletes bespoke row sharing in favour of the existing setter, and needs no new helper, flag or layer. The only remaining special case is detached deferred materialization, which has no session to own rows. That case is structural, and its comment says so.

**Spaghetti growth.**
- `copy_from`: the metadata copy moves below `self.dataset = ...`, with no new branch, and the comment explains the ordering. OK.
- `tools/actions/__init__.py`: a one-line setter swap. OK.
- `deferred.py`: the non-in-place path changes one flag value and adds one `if not attached`. The in-place path swaps one line. OK.
- `make_copy`: the flush replaced the commit-and-retry fallback, and that dead fallback was deleted in `789931f7a7d`. The flow is now linear.

**Boundary / type.** There are no new casts, `Any` or optional parameters. The setter needs a session and an existing dataset file. Every caller on the branch satisfies both: the dataset is set before the setter, and the detached path avoids the setter.

**File size.** No threshold is crossed.

**Tests.** The new unit tests share `_deferred_bam_with_replacement` and `_assert_materialized_from_replacement_owns_its_index`, so the in-place and copy cases differ only in the call under test. That's good factoring. Integration helpers are reused between the job cache and pgcleanup tests. The SQL-statement-count test is intentionally brittle, because it pins the performance property.

</details>
