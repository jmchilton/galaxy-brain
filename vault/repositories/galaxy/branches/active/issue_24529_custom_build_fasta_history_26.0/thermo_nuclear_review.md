# Thermo-nuclear code quality review

Fresh review of `origin/release_26.0...631784c3100`. Verdict: no structural regression; diff small and in the right layer. Acted on one local cleanup in `HistoryManager` (`c60840e7689`, force-pushed to `jmchilton`, no behavior change). Rest already justified or out of proportion for release_26.0.

## Acted on

- **`_history_for_conversion` loop regressed in the Codex fix (`631784c3100`).** It reintroduced the tuple-with-conditional-None loop (`(dataset_history if user_id else None, current_history)`) that the previous thermo round removed; the ternary silently encodes the anonymous rule (all anon histories share `user_id None`, so another anon's dataset history must never match). Rewritten as explicit flow: local `usable()` predicate (owned by `user_id` + not deleted/archived); anonymous handled up front (current history or None); then dataset history → current history → `most_recent` active. Module-level single-use `_is_active` folded into the predicate and deleted. Cases walked by reading: owner gets dataset history; unowned dataset → owned current; admin with another user's current history → skips it (Codex invariant); anon → only own current; archived/deleted → `most_recent` active or None.
- **`target_ext in dataset.get_converter_types()` → `dataset.can_convert_to(target_ext)`.** Existing canonical helper, identical semantics.

## Not acted on

- **Pre-check duplicating the model's converter/metadata/implicit lookups in `get_converted_dataset`.** Needed so already-converted datasets skip history resolution (no-history requesters get 200, not 400). A model-level lazy resolver was rejected earlier: adds model hunks beside a backport that already conflicts with `261d166f2ab` on 26.2.
- **`_get_or_create_converted` discarding the manager result and re-querying `get_converted_files_by_type`.** Pre-existing. Returning the manager result directly would change what is serialized for metadata-backed conversions (`get_metadata_dataset` returns a fake, id-less HDA for `bai`); keeping the re-query preserves behavior.
- **Return annotation on `HistoryManager.get_converted_dataset`.** `Optional[DatasetInstance]` is honest (None while a dependency converter is pending), but it makes mypy demand a dead guard in `users.py` (FASTA→len/linecount have no deps). Left unannotated like the model method.
- **Placement on `HistoryManager`.** History-selection policy sits next to `most_recent`; moving it to an HDA manager only saves one `depends` in `users.py`.
- **File size.** `histories.py` 1095→1129, `services/datasets.py` 1088, `api/users.py` 1247 - all over 1k on base; none crosses because of this PR. Decomposition out of scope for a release branch.
- **Model dependency hunk + `test_dependency_conversion_receives_target_context`.** Byte-identical backport of `a3cb32cd95d` for merge-forward.
- **`encode_id=False` on `converted_ext`, 202 for pending deps.** Separate, documented fixes (rescope 1/2).
- **No unit test for the anonymous branch.** Earlier unit test was dropped in test challenges; anon path behavior unchanged and covered by reading.
- **Populator helpers / `DatasetPopulator(self.galaxy_interactor)` in `test_users.py`.** No duplicates found; matches file convention.

## Validation

- Unit `test_actions.py` + `test_HistoryManager.py`: 41 passed.
- API `test_datasets.py -k "converted or search_features or raw_data_no_converter"`: 6 passed.
- API `test_users.py -k custom_build`: 4 passed. API runs one at a time.
- ruff, black, isort clean on all changed files; mypy clean on changed source files.

<details><summary>Full review</summary>

1. Structural / code-judo: no dramatic move available. The only candidate (model resolves history lazily via callback or `get_existing_converted_dataset`) adds model churn next to a conflicting backport hunk. The manager wrapper is the smallest correct seam.
2. Spaghetti: call sites in `users.py` and `services/datasets.py` are one-line swaps to the manager; `_get_or_create_converted` gains one None→`AcceptedRetryLater` branch, which is the endpoint's contract, not a scattered special case.
3. Magic / legibility: the only finding - the Codex fix's candidate loop hid the anonymous-ownership invariant in a ternary. Fixed above.
4. Boundaries: `ProvidesUserContext` → `ProvidesHistoryContext` on `add_custom_builds` is required (reads `trans.history`). `isinstance(dataset, HistoryDatasetAssociation)` is explicit, not duck-typed. `user_id` compare instead of `is_owner()` is deliberate (admin bypass) and commented.
5. Tests: new populator helpers reused across both test files; API tests assert the history jobs land in, plus that newer histories stay empty.

</details>
