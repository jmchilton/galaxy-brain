# Rescope review debrief

Acted on (a): eager history resolution was a real regression in all three call sites (custom builds too, not just `services/datasets.py`). Fixed with `HistoryManager.get_converted_dataset`, which resolves a history only when no conversion exists yet. Red→green API tests added. Verified (b) and kept it. Checked (c), no code change, merge-forward notes below. (d) noted only. Head `dacb7d38dd6`.

Not acted on:

- **(b) `encode_id=False` stays on this branch.** Confirmed real: without it the response `id` is 48 hex chars (double-encoded) and unusable. It's the same endpoint the branch fixes, matches the sibling `history_contents.py` pattern, has no client caller (only `schema.ts`), and dev has the same bug. Nothing could rely on the broken ids. Call it out in the PR body. Splitting it out would also drop the `history_id`/`id` assertions from the new test for no gain.
- **(c) Merge-forward notes, no change.** The model hunk matches a3cb32cd95d byte for byte. a3cb32cd95d is on 26.2 but not 26.1. On a 26.0→26.1→26.2 merge, the model hunk will conflict with 261d166f2ab's rewritten loop (take 26.2's). The backported unit test `test_dependency_conversion_receives_target_context` was **removed** on 26.2 by 261d166f2ab. It sits at a different spot in the 26.0 file, so the merge may re-add it silently. The merger should drop it. Put this in the PR notes.
- **(d) tabix first call with deps still 500s.** Not fixed, per the brief.
- **`get_converted_dataset` wrapper has no return annotation.** That matches the untyped model method. `Optional[...]` would need asserts in `users.py` for `len`, which never returns None (no deps).
- **Remaining callers (dbkeys, genomes, registry, model `convert_dataset`).** Still follow-up, per the scope evaluation.
- One possible security-sensitive observation (pre-existing, outside the branch's change) was reported to John separately.

<details><summary>Full review</summary>

**Verdict:** sound after one fix. The expansion is small and coherent. `history_for_conversion` is a decent reusable abstraction, and the remaining sites are reasonably deferred.

**Bug (fixed): history resolved before the existing-conversion check.** All three sites (`add_custom_builds`, `_get_or_create_converted`, `_search_features`) resolved the history, and returned 400 if there was none, before the model checked for an existing conversion. Regressions vs base:
- A key/bearer user with no active history got 400 for an already-converted dataset (base: 200), and 400 for a custom build from an already-converted FASTA (base: 204).
- For an unconvertible target with no history, the error became "A history is required" instead of "Conversion not possible".

Fix: `HistoryManager.get_converted_dataset(trans, dataset, target_ext)` works as follows.
- It resolves a history (or returns 400) only when `target_ext` is convertible and neither `get_metadata_dataset` nor `get_converted_files_by_type` finds an existing conversion.
- It then delegates to the model, which still raises `NoConverterException` first for unconvertible targets.
- It replaces `DatasetsService._conversion_history` and the inline block in `users.py`.
- In `users.py`, linecount's history now resolves from the `len` dataset: it is the same history when the user owns it, and the user's own history when `len` is a pre-existing conversion elsewhere.
- The error message is unified to "A history is required to convert the dataset."

Tests:
- New `test_datasets.py::test_converted_ext_without_history` (admin + new user). A fresh user with no histories gets 200 for an existing `len` with the same id, 400 "Conversion not possible" for `bam`, and 400 "A history is required" for unconverted `fai`. Red on the old head (400 for the existing conversion).
- Extended `test_custom_build_from_unowned_fasta`: a second fresh user with no history gets 204 from the already-converted FASTA. Red with the old `users.py`.

**(b) Double-encoded ids.** Verified by temporarily removing `encode_id=False`: `test_converted_ext_creates_conversion_in_dataset_history` failed with `'eb14…175f' (48 chars) == 'adb5f5c93f827949'`. The serializer encodes, then `AnyHDA`'s `EncodedDatabaseIdField` `BeforeValidator(encode_id)` encodes again. Kept, as a real bug in the same endpoint.

**(c) Cherry-pick 5e777761b18.** It is a faithful backport of a3cb32cd95d: same model hunk, plus the test with a `patch` import added. It is correct on 26.0, where the loop still returns None for pending deps. The merge-forward risks are covered above.

**Nits/other**
- The `users.py` `trans` type change to `ProvidesHistoryContext` is correct.
- `history_for_conversion` unit test coverage is adequate. The new wrapper is covered by the API tests, so no trivial unit test was added.
- Imports are at top level, and comments are minimal.

**Test results (one at a time):**
- `test_datasets.py -k "converted or raw_data_no_converter"`: 3 passed.
- `test_users.py -k custom_build`: 4 passed.
- Unit (`test_HistoryManager.py`, `test_actions.py`): 42 passed.
- ruff/black/isort/mypy clean on the changed files.

</details>
