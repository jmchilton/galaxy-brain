Run via Claude Opus at high effort.

# Test challenges debrief

## What I did

I made three commits on `tool_patches`, on top of `3352b4d571d`:

- `d361b96f16d` **Give the freshness test config stub `tool_patch_paths`.**
  - The branch's `tool_confs_token` now reads `config.tool_patch_paths`, but the hand-rolled `_Cfg` stub in `test/unit/app/tools/source_store/test_freshness.py` doesn't have that attribute.
  - Without the fix, two tests that already existed fail with `AttributeError`: `test_tool_confs_token_stable_until_conf_content_changes` and `test_tool_confs_token_sees_tool_dir_membership_changes`.
  - The earlier test runs missed this, so it was a regression on the branch.
- `9cb6ed89b2b` **Integration tests** (`test/integration/test_tool_patches.py`):
  - **Job-cache reuse.** The tests now assert on `copied_from_job_id`, the pattern `test_jobs.py` already uses. Before, they compared the two outputs' `file_name`. The new check is stricter: the reused job must be the first job.
  - **Tool request path.** It now uses `DatasetPopulator.tool_request_raw`, with a new opt-in `use_cached_jobs` keyword, plus `galaxy_interactor.jobs_for_tool_request`. Before, it posted a raw `jobs` request and diffed the history contents to find the output.
  - **New coverage of the `/api/jobs/search` gate.** The branch had changed this path without any test. I added a `DatasetPopulator.search_jobs` helper and two checks:
    - `test_special_inputs_patch_hides_jobs_from_search`: the search returns `[]`. It runs on both the eager and the cached toolbox.
    - `test_rejects_inputs_patch_reuses_job_cache`: this existing test now also asserts that the search finds the job.
  - `TestToolPatchAlreadyApplied` uses `cls.temp_config_dir` instead of `tempfile.mkdtemp()`.
  - **Dropped `TestToolPatchAppliedCachedToolbox.test_index_entry_carries_patch`.** It was redundant and reached into `_app` internals.
    - The cached-toolbox subclass reruns the API, command and job-cache tests, and those can only pass if the populator stored the patched source and the index entry carries its state.
    - `TestToolPatches.test_stores_patched_source_and_index_entry` already covers `tool_patch_collections`.
- `1b1a6c5deae` **Tidied the unit tests:**
  - **`test_collection_digest_is_computed_from_contents` is now `test_collection_digest_ignores_declared_digest`.** It used to re-derive the sha256 construction. Now it compares against an identical collection that has no `digest:` field, and asserts that the declared value isn't used. `collection.yml` isn't part of the digest, so the twin comparison holds.
  - **`test_builtin_collection_is_empty`** now compares the builtin digest with an empty collection written by `write_collection`, rather than with a hard-coded `sha256(b"\0codes.yml\0")`.
  - **`test_identifier_helper_fixture`** uses an `IdentifierInput` dataclass instead of `SimpleNamespace`.
  - **`test_freshness_token_follows_collections_and_policy`** used to write a `ptest_2` patch whose anchor is `ptest_1`'s text. It now changes the `ptest_1` patch instead.
  - Renamed `test_materialized_tool_carries_entry_patch` to `test_materialised_tool_carries_entry_patch`, to match the spelling of the file's other test names.

## What I didn't act on

- **No E2E, Selenium or Vitest tests.** The branch has no client diff, and the badge and admin UI are out of scope.
- **`test_concurrent_apply_parses_each_file_once` still monkeypatches `parse_patch_yaml`** as a counting spy. It's the narrowest seam for "parsed once under concurrency", and restructuring the code just to count parses isn't worth it.
- **The engine tests call `evaluate_unit` directly.** The engine is the unit under test and its API is small, so this isn't testing the implementation.
- **`test_tool_patch_applies_to_keyed_version_only` (`test_toolbox.py`)** overlaps with the integration API test only for the `patches` field. Its shed-guid key and version selectivity aren't covered anywhere else, so I kept it.
- **`test_identifier_helper_fixture`** isn't duplicated by integration: the integration fixture is a single `replace_text` op, while this test covers a multi-op `#def` helper and how it renders.
- **The large parametrized lint tables in `test_invalid_patch_files_are_rejected` and `test_valid_patch_files_load`** test load-time behaviour, not the implementation. I kept them.
- **I didn't move `test_jobs.py`'s private `_search*` helpers onto the new `search_jobs` populator helper.** That's outside this branch's scope; it would make a good follow-up.

## Red and green checks

**Baseline commit `daeb3750f0c`.** I checked out a temporary detached worktree at that commit and ran its two tests against that commit's `lib`:

- `test_reload_tool_by_id_keeps_shed_identity` and `test_changed_tool_reparsed_while_unchanged_carried_forward` both passed.
- To confirm the old `lib` was the one imported, I ran the branch's unit file there, and it fails to import `galaxy.tool_util.patches`.

**Seam unit tests.** For each check I reverted the code in the worktree, ran the tests, and restored the code. Every test failed at its own assertion:

| Reverted | Tests that fail | Failure |
| --- | --- | --- |
| `apply_tool_patches` call in `get_expanded_tool_source` | `test_tool_patch_applies_to_keyed_version_only`, `test_reload_tool_by_id_keeps_tool_patch` | `assert None is not None` on `.patch` |
| `populator.py` to `origin/dev` | `test_stores_patched_source_and_index_entry`, `test_changed_patch_file_repatches_unchanged_tool` | `entry.patch is None`; `(0, 3) == (1, 2)` |
| `freshness.py` to `origin/dev` | `test_freshness_token_follows_collections_and_policy`, original and revised | `1 == 4` |
| `tool.patch = entry.patch` and the `payload["patches"]` line in `cached_toolbox.py` | the two `test_cached_tool.py` tests | `KeyError: 'patches'`; `None == ToolPatchInfo(...)` |

**Integration.** I reverted three gates at once:

- the `completed_jobs` gate in `tools/__init__.py`
- the `use_cached_jobs=` gate in `services/jobs.py`
- the search gate in `api/jobs.py`

Then I ran the eager `TestToolPatchApplied` job-cache and search tests. All three failed at their assertions:

- `copied_from_job_id` was `'529fd...' == None` on the `run_tool` path and `'2234c...' == None` on the tool request path.
- The search returned `['9d37...'] == []`.

The `rejects_inputs` reuse test can't go red this way, because reuse is the default behaviour. It guards against a gate that is too broad.

**Pure package.** The `galaxy.tool_util.patches` unit tests are new, and the module doesn't exist without the branch, so they can't be red-checked in isolation.

## Test results

- **Integration, run alone:** `test/integration/test_tool_patches.py` gave 12 passed in about 72s. That's 9 before, minus 1 dropped, plus 1 new search test that runs in both the eager and cached classes, plus the search assertion added to the `rejects_inputs` test.
- **Unit:** `test/unit/app/tools`, `test/unit/scripts/tool_source`, `test/unit/tool_util/test_tool_patches.py` and `test/unit/tool_util/toolbox` gave 1404 passed. The one failure is `test_watcher.py::test_watcher`, which fails on clean dev too (environmental, as recorded in the initial debrief).
- **Lint:** ruff, black, isort and pre-commit are clean on every touched file.

## Status

READY. There are no blockers.
