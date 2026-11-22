# PR #25028 initial review (default profile)

- Profile: default (`_shared/reviewers/default.md`)
- Model: Claude Opus 5.5; effort: medium
- Reviewed commit: `cd5a9c371480edfb1814193e0146f20dca52ec18`
- Base: `release_26.2`

## Verdict

Sound, well-targeted fix. The fallback reproduces the job script's `[ -f src -a -f dest ]` copy semantics on the node, old params without `filename_fallback` keep the old behavior, and the tests are red-to-green (`test_extended_metadata_from_work_dir_output_missing[0|2]` fail against `95981f4a3f7`'s `set_metadata.py`, all 27 `test_metadata.py` tests pass at head). Findings are one coverage gap plus small cleanups. No blockers.

## Findings

### P2 1: the new `except` export path has no test

`set_metadata_portable`'s `except` block now exports an output in `error` state when it raised before any `object_store_update_actions` were queued. None of the new tests reach it: with `fallback_path` set, the two-match case no longer hits `assert len(matches) == 1`, and the zero-file case ends in the purged branch, which sets `ERROR` directly. So the second half of commit `cd5a9c37148` ("whose collection raises before it is exported") is untested, and so is the compatibility path the PR description promises ("Params without the key, written by older Galaxy versions, behave as before"). That is the path a node on new code sees from params written by an older Galaxy, and it's where the `except` export does its work.

Suggested fix: add a unit case that uses the existing helper with no fallback, for example `_run_from_work_dir_output(2, fallback=False)` (pass `fallback_path=None`). Assert that the export state is `error` and that `external_metadata_set_successfully` is False. That covers the old-params path and the new `except` export in one roughly 10-line test.

### P3 1: user-purged outputs now export as `error` in extended metadata

The purged branch (`elif not os.path.exists(dataset_filename_override)`, "purged output ?") was written for outputs the user purged while the job ran. It now also sets `dataset.state = ERROR`. The node can't tell "really missing" from "purged by the user", so a purge during a successful extended-metadata job now leaves the HDA in `error`. Before, it stayed `queued`. On the non-extended path, `finish()` sets it to `ok` (`dataset_assoc.dataset.dataset.state = Dataset.states.OK` when the job isn't in error). The dataset is purged either way, so the impact is cosmetic (it still pauses dependents rather than leaving them waiting). The shared helper `purge_while_job_running` doesn't assert state, so this divergence isn't pinned by any test. If error is the intended state for user-purged outputs too, say so in the comment. Otherwise Galaxy could use its own `purged` flag on import (it already checks it in `handle_dataset_object_edit`) to pick the state.

### P3 2: two glob passes in `set_metadata_portable`

The new fallback block globs `external_filename`, and then the existing `if not os.path.exists(external_filename)` block globs it again for the one-match case. A single pass is easier to follow: glob once, use the match if there's exactly one, else use the fallback if one was sent, else run the existing extra-files and purged handling. As written, the fallback block only works because it leaves the one-match case to the later block, and the later block's `assert len(matches) == 1` is now reachable only for params without a fallback. Optional.

### P3 3: `_get_filename_fallback` duplicates `_get_filename_override`'s lookup

Both helpers in `lib/galaxy/metadata/__init__.py` scan `output_fnames` for `real_path == file_name`. One lookup that returns the matching `DatasetPath` (or None) would serve both values without a second scan and keep the two keys from drifting apart. Nit.

## Notes (not findings)

- `DatasetPath.with_path_for_job` drops `fallback_path`, just as it already drops `dataset_uuid` and `object_store_id`. The Pulsar path uses `copy.copy`, so nothing is lost today.
- The `except`-path guard `not object_store_update_actions` is a correct but implicit "not collected yet" signal. Deferred and `link_data_only` outputs still queue `add_dataset`, so they don't hit it.
- The fallback path is trusted the same way `filename_override` is: Galaxy writes both into `params.json`. The PR adds no new trust surface.
- The new `test_pulsar_embedded_extended_metadata_rewrite_parameters.py` suite adds CI time, but it matches the reported test.galaxyproject.org setup (`rewrite_parameters: true`, copy). That is reasonable for a release-branch fix.
