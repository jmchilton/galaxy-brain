# Thermo-nuclear code quality review

Reviewed `origin/release_26.0...d23bf1d1cf5`. The verdict is no structural regression, and the diff is already small and in the right layer. I acted on one local simplification in `HistoryManager`, committed as `2b86cad3ba8` and force-pushed to `jmchilton`, with no behavior change. Everything else is either already justified or out of proportion for release_26.0.

## Acted on

- **`get_converted_dataset`: dropped the `needs_conversion` flag.** It now returns an existing metadata or implicit conversion directly. It resolves a history only when a converter must run, and still falls through to the model so `NoConverterException` keeps its message. This removes the boolean and the double lookup on the already-converted path.
- **`history_for_conversion` became `_history_for_conversion`.** It has had a single caller since the unit test was dropped.
  - `getattr(dataset, "history", None)` became an explicit `isinstance(dataset, HistoryDatasetAssociation)`.
  - The tuple-with-conditional-None loop became plain precedence `if`s and a module `_is_active(history)` predicate.
  - The order is unchanged: owned dataset history, then current history, then most recent active. I checked this by reading the code, since no test can fail on the `current_history` branch. API-key requests never set `trans.history`.

## Not acted on

- **Return annotation on `get_converted_dataset`.** `Optional[DatasetInstance]` is the honest contract, because the model returns None while a dependency converter is pending. Adding it makes mypy flag `users.py` passing `new_len` into the next call. FASTA→len has no converter deps, so that path is unreachable, and guarding it would add a dead branch. I left it unannotated, matching the untyped model method.
- **Codex's race (no-history requester, conversion finishing between pre-check and model call).** It is narrowed but not removed. The pre-check is what lets already-converted datasets skip history resolution. A model-level resolver callback was already rejected in the scope eval.
- **Placement on `HistoryManager` instead of an HDA/DatasetAssociation manager.** The history-selection policy sits next to `most_recent`. Moving it would only save the `HistoryManager` injection in `users.py`, and would push the code toward `self.app.history_manager`.
- **`is_owner()` instead of the `user_id` compare.** Rejected: `SharableModelManager.is_owner` returns True for admins, and the invariant here is never to write jobs into another user's history. The comment now says so.
- **File size.** `histories.py` grew from 1095 to 1133 lines, `services/datasets.py` is at 1088 and `api/users.py` at 1247. All were already over 1k on base, and none crosses the line because of this PR. Decomposition is out of scope for a release branch.
- **Model dependency hunk and `test_dependency_conversion_receives_target_context`.** Both are backports of `a3cb32cd95d`, kept byte-identical for merge-forward.
- **`encode_id=False` on `converted_ext`.** A separate real fix, already documented.
- **`_get_or_create_converted` discards the result and re-queries `get_converted_files_by_type`.** Pre-existing.
- **Unfixed `genomes`/`dbkeys`/data-provider `registry` `get_converted_dataset` callers.** These were scoped out earlier.
- **Populator helpers.** The grep found no duplicates of `create_custom_build_raw`, `get_custom_builds`, `get_converted_dataset_raw` or `search_dataset_features_raw`, so all four were kept.
- **`DatasetPopulator(self.galaxy_interactor)` in the new `test_users.py` tests.** This matches the file's existing tests. Nit, skipped.

## Validation

- Unit tests `test_actions.py` and `test_HistoryManager.py`: 41 passed.
- API `test_datasets.py -k "converted or search_features or raw_data_no_converter"`: 5 passed.
- API `test_users.py -k custom_build`: 4 passed. The API runs were one at a time.
- ruff, black, isort and mypy are clean on the changed files.

<details><summary>Full review</summary>

1. Structural or code-judo: nothing dramatic is available. The only judo candidate was letting the model resolve the history lazily, through a resolver callback or a `get_existing_converted_dataset` helper. Either would add model hunks next to the backport hunk that already conflicts with `261d166f2ab` on 26.2. The manager wrapper is the smallest correct seam.
2. Spaghetti: the call-site changes are one-line swaps to the manager in `users.py` and `services/datasets.py`. No new conditionals were added to shared flows.
3. Boundaries: the `ProvidesUserContext` → `ProvidesHistoryContext` change on `add_custom_builds` is required because `trans.history` is read. The `getattr` duck typing was replaced with an explicit type check. The Optional return contract is surfaced above.
4. Tests: helpers are reused, red/green was established in the test challenges, and the accepted gap on the `current_history` branch is noted there.

</details>
