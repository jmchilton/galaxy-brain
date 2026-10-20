# Thermo-nuclear code quality review (round 2, post re-scope)

I acted on one finding. The two unknown-backend unit tests had the same try/finally code for swapping the global object store, so I replaced both with a new `global_object_store_for_models` context manager in `galaxy/model/unittest_utils/utils.py`. Round 1 deferred this until a second test needed it, and the re-scope commit added that second test. The change was folded in with fixups to `3a21450` and `0c9e401`. Every assertion is byte-identical, and the final tree's assertions match the pre-rebase tip. Nothing else changed: the remaining findings belong in the object-store layer, on dev, or are nits that aren't worth merge-forward churn on a release branch. No security findings.

New hashes: `9d3606f644b` Baseline (still first, unchanged), `c2cc018262d` listing refactor (unchanged), `7b988167e0b` metadata file fix, `654118f2dd6` extra_files_path guard.

Tests:
- Unit tests (`test_galaxy_mapping.py` + `test_DatasetManager.py`): 29 passed, 16 skipped.
- `test_galaxy_mapping.py` alone at the intermediate commit `7b98816`: 16 passed, 16 skipped.
- black, isort, flake8 and mypy (from `lib/`, on the touched files) are clean.
- I didn't rerun the API test, because the listing commit and the test file haven't changed.

Not acted on:

- **Three separate encodings of "this dataset can't be located".** `Dataset.extra_files_path_name_from` checks for `None`. `MetadataFile.get_file_name` raises `ObjectNotFound`, which `get_file_name_if_locatable` catches. `Dataset.get_extra_files_path_if_locatable` checks up front. So two `_if_locatable` helpers work in two different ways.
  - The code-judo move is in the object-store layer. `DistributedObjectStore._construct_path` / `_resolve_backend` should raise a typed `ObjectNotFound` for an invalid backend id instead of a bare `KeyError`. The `__get_store_id_for` `elif` that skips `search_for_missing` for stale ids should be fixed too. After that, both model helpers become the same small try/except, or disappear.
  - That changes write-path errors and object-store behavior, so it's a dev-scoped follow-up.
  - Checking up front is the right call on the Dataset side for 25.1. Catching `KeyError` would be far too broad. Raising from `get_extra_files_path` would change the `extra_files_path` property for writers. In a hierarchical store, `store_by` is `None` for a dataset with no primary file yet, and that property returns a path today rather than crashing.
- **Use `da.dataset.store_by` in `MetadataFile.get_file_name`.** Round 1 guessed this might break the `type:ignore[unreachable]`. I tested it: mypy is clean with the switch. I still declined. It gains nothing in behavior, and it changes a line that dev has rewritten nearby (`assert object_store is not None`), which adds conflict surface on merge-forward.
- **Duplicate checks and logs in `get_extra_files_path_if_locatable`.**
  - Its `getattr(self, "external_extra_files_path", None)` check is repeated inside `get_extra_files_path`.
  - For a stale distributed id, the object store already logs "backend object store ID ... is invalid", so the helper's warning doubles it.
  - Both are cosmetic. Removing either means restructuring `get_extra_files_path`, which is out of scope.
- **Converting the other hand-rolled object-store swaps to the new helper.** That's `test_model_copy.py`, `test_collect_primary_datasets.py`, `test_metadata.py`, `test_history_imp_exp.py` and `test_model_store.py`, all follow-ups. Changing unrelated tests on a release branch is out of scope.
- **The four-way duplicated metadata-to-dict loop** (`HistoryDatasetAssociation.to_dict`, `LibraryDataset.to_dict`, `LibraryDatasetDatasetAssociation.to_dict`, `serialize_metadata`). It's still the biggest structural debt this branch touches. It's carried over from round 1 as a dev follow-up.
- **The hierarchical-store behavior change in `serialize_extra_files_path`.** I'm flagging it for the PR description, not for code. For a dataset whose primary file isn't in any backend, it now returns `null` where it used to return a bogus path (the dataset's own directory, because `_extra_files_rel_path` was `None`). That's arguably more correct, but reviewers should know.

<details>
<summary>Full review</summary>

## Scope

`origin/release_25.1...HEAD`, 4 commits, 7 files (6 before this round). Round 1 already reviewed commits 1–3, and those are unchanged except for test setup. This round centres on the re-scope commit (`0c9e401`, now `654118f`): `Dataset.get_extra_files_path_if_locatable()` and its use in `DatasetSerializer.serialize_extra_files_path`.

## Structural regressions

None. `model/__init__.py` grows by about 17 lines (12.7k lines already). `managers/datasets.py` stays at 941 lines, under 1k. `library_folder_contents.py` shrinks.

## Code-judo opportunities

1. **Push "unlocatable" down into the object store (not acted on, dev follow-up).**
   - The root cause of #24264 is in `DistributedObjectStore`. For an object whose `object_store_id` isn't a configured backend, `get_store_by` quietly returns `None`, but `_construct_path` indexes `backends[...]` and raises `KeyError`.
   - Both model-level guards on this branch work around that gap from above.
   - If the object store raised `ObjectNotFound` consistently and honored `search_for_missing` for stale ids, then:
     - `MetadataFile.get_file_name` wouldn't need its own `store_by is None` raise.
     - `get_extra_files_path_if_locatable` would become `try: return self.extra_files_path except ObjectNotFound: return None`, which is the same shape as the metadata helper.
   - That's the version that deletes concepts. It changes error types on write paths and touches object-store code that every deployment uses, so it doesn't belong in a 25.1 fix.
2. **The listing refactor (`c2cc018`) is still the right move.** It stops building a whole `to_dict()` per row just to read three fields. Unchanged since round 1.

## Spaghetti and branching

`get_extra_files_path_if_locatable` is a new method next to its sibling, not a branch added to `get_extra_files_path`, so the busy property is untouched. That's the right shape for a release fix.

The asymmetry with the metadata helper is justified, not accidental:
- `MetadataFile.get_file_name` already crashed (`getattr(self, None)` raises `TypeError`) whenever `store_by` was `None`, so making it raise a typed error changes no working path.
- `Dataset.get_extra_files_path` doesn't always crash when `store_by` is `None`. In a hierarchical store it returns a path. So it can't start raising without a write-path behavior change.

## Boundaries and types

- Both helpers return `Optional[str]`, which is an honest contract.
- `serialize_extra_files_path` now returns `None` instead of calling `self.skip()` when the dataset can't be located. That's reasonable: the key is still present, just null, the same as the metadata `None`.
- `Dataset.store_by` is an untyped property. Typing it as `Optional[str]` would be a nice dev cleanup.

## Tests

- **Acted on:** I extracted `global_object_store_for_models(object_store)`. It sets the store through `setup_global_object_store_for_models` and restores the previous `Dataset.object_store` directly, since it's `Optional`, and `setup_...` takes a non-optional store.
- I put it in `galaxy.model.unittest_utils.utils`, next to `random_email`. It isn't in `galaxy.objectstore.unittest_utils`, because that package must not depend on `galaxy.model`.
- No dedicated test for it. Both callers exercise it.
- The positive control in each test (`== dataset.extra_files_path`) means the `None` assertions aren't vacuous.
- The `removed_backend` trick is shared by the two tests, but it's one line each and stays inline. Making it a fixture would be over-fitting.

## Verdict

Approve on code quality for a release-branch fix. The real simplification lives in the distributed object store, on dev. It's recorded above as the follow-up that would delete both model-level guards.

</details>
