Run via Claude Opus at medium effort.

# Thermo-nuclear code quality review

Reviewed `git diff origin/release_25.1...HEAD` at `7f71b59b32f` against `vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md`. The design is small and lives in the right places, so I found no structural regression. The fix moves three raw `_metadata` assignments onto the existing `metadata` setter, which is the copy path `HDA.copy()` already uses. No file crosses 1k lines: `metadata.py` is 796, `deferred.py` is 409, and `model/__init__.py` was already far over. I acted on two findings and declined the rest.

Acted on:

- **`789931f7a7d`: dropped `make_copy`'s dead `except AssertionError` fallback.** The branch's `session.flush()` gives the new `MetadataFile` an id before `update_from_file`, so the id assertion in `get_file_name()` can no longer fire. The fallback was what the flush replaced: commit to get an id, then retry. It could never have worked anyway, because `session(target_context.parent)` calls a Session object with an argument and raises `TypeError`. Removing it leaves a straight flush-then-write flow in the function this branch already changed. Earlier reviews declined this because the code predates the branch. That's no longer a good reason, since the branch is what made it unreachable.
- **`da18684880d`: dropped the `_read()` helper in `test_scripts_pgcleanup.py`.** It returned `b""` for a missing file, a silent fallback that the baseline test needed but the fixed test doesn't. A missing index now fails the read itself. I also collapsed the two `open()` blocks in `_check_owns_copied_metadata_file` into one `Path.read_bytes()` comparison. Both are test-only changes, so the "Baseline tests" commit is untouched and still first.

Not acted on:

- **`deferred.py` uses a mode flag plus a compensating branch** (`include_metadata=attached`, then `if not attached: _metadata = ...`). I considered two alternatives. One was to have `copy_from` choose between sharing and copying based on `object_session(self)`. That hides a mode inside a shared model method, which is worse. The other was an explicit if/else after `copy_from(include_metadata=False)`, which duplicates `copy_from`'s ordering knowledge for no real gain. The current form is the most direct of the three, and its comment states the invariant: detached instances are never persisted.
- **Attached materialization copies metadata files and then regenerates them** (`init_meta()` when `has_metadata_files`). The copy is wasted I/O. But `has_metadata_files` reads the copied metadata, so skipping the copy changes the regeneration decision. That's out of scope for a release fix. Previously noted by the normal review.
- **`make_copy` sets `object_store_id` eagerly,** which duplicates `get_file_name()`'s lazy default. It's kept on purpose: it makes the flush insert the complete row, and `test_copy_from_inserts_each_metadata_file_row_once` pins that. A constructor argument would be cleaner, but it widens `MetadataFile.__init__` on a release branch for one caller.
- **`test_scripts_pgcleanup.py` inherits `RunsCachedBamJob` from another test module,** and that turns on `framework_tool_and_types` for the whole pgcleanup class. Cross-module test inheritance is a mild smell. The alternatives are a new shared helper module in `galaxy_test`, or duplicating the cached-run helper. Both are more moving parts for two tests. The existing pgcleanup tests still pass with the framework tools enabled.
- **The SQL-statement-counting unit test is brittle by nature.** It's intentional, because it pins the performance property from the trim commit.
- **The shared `MetadataFile.update_from_file` cache-sync change** stays backed out, as instructed.

## Tests

- Unit: `test_model_copy.py`, `test_galaxy_mapping.py`, `test_dataset_materialization.py`: 42 passed, 15 skipped.
- SQLite integration: `test_job_cache_metadata_files.py` and `test_dataset_copy_metadata_files.py`: 6 passed.
- Postgres: `test_scripts_pgcleanup.py`: 9 passed, none skipped.
- isort, black, ruff and mypy are clean on the changed files.

<details>
<summary>Full review</summary>

**Structural / code-judo.** No dramatic simplification is available. The fix is already the code-judo move: it deletes the bespoke "share the rows" assignments and routes through the canonical setter (`make_dict_copy` → `FileParameter.make_copy`). The one remaining special case is detached deferred materialization, and that case is structural, because there's no session to own rows.

**Spaghetti growth.**
- `copy_from`: moving `self.metadata = other_hda.metadata` below `self.dataset = ...` adds no branch. The comment says why the order matters. OK.
- `tools/actions/__init__.py`: a one-line setter swap. OK.
- `deferred.py`: one flag value change plus one `if not attached` branch. Acceptable, as discussed above.
- `make_copy`: added `object_store_id` and `flush()`. The flush made the existing `try/except AssertionError` retry dead, and that retry was also broken (`session(...)` raises `TypeError`). **Fixed by deletion.**

**Boundary / type.** No new casts or optionality. `make_copy` still assumes a session when `value.id` is set, which was already the case. Detached callers avoid it by not using the setter.

**File size.** No file crosses 1000 lines because of this branch.

**Tests.**
- `_read()` silently mapped a missing file to `b""`, so an absent index compared as empty. That was needed only for the baseline's "bytes are gone" assertion. **Fixed.**
- The two-`open` byte comparison was verbose. **Fixed.**
- The cross-module mixin import, and `RunsCachedBamJob.setUp` duplicating `BaseScriptsIntegrationTestCase.setUp`'s populator creation, are harmless. Left as is.

</details>
