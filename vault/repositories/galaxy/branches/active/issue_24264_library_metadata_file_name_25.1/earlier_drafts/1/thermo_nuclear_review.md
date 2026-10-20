# Thermo-nuclear code quality review

No code changes. The diff is small, direct, and in the right layer. Every structural finding is a pre-existing problem, and fixing it would hurt the release-branch fix and its merge-forward, so I've recorded them as follow-ups. `test/unit/data/test_galaxy_mapping.py` still passes (16 passed, 16 skipped). No security findings.

Not acted on:

- **The four copies of the metadata-to-dict loop** (`HistoryDatasetAssociation.to_dict`, `LibraryDataset.to_dict`, `LibraryDatasetDatasetAssociation.to_dict`, `DatasetAssociationSerializer.serialize_metadata`). This branch had to touch all four to apply one fix, which is the giveaway that a shared helper is missing. The code predates the branch, and the four copies differ in small ways: `expose_dataset_path` gating, joining lists, falling back to the datatype default. Merging them is a dev-targeted follow-up.
- **Using `Dataset.store_by` in `MetadataFile.get_file_name`.** That property is the canonical accessor and `extra_files_path_name_from` already handles a `None` result from it. Switching gains one line and adds churn when merging forward, because dev's `get_file_name` has the `auth=` kwarg. The untyped property may also break the existing `type:ignore[unreachable]`. Left as is.
- **Swapping the object store in the unit test with an inline `try/finally`.** `test_model_copy.py` does the same thing by hand, and this is the first use in this file. A fixture or context manager would only pay off once a second test needs it.
- **Raise-then-catch (`ObjectNotFound` plus `get_file_name_if_locatable`).** I checked whether this was a wrapper that doesn't earn its keep. It does. Write paths (`update_from_file` uses `basename(get_file_name())`, and the model store export) need a hard failure. A `missing_ok` flag on `get_file_name` would be the worse design: a one-off mode on a busy method. Four call sites justify the helper.

<details>
<summary>Full review</summary>

## Scope reviewed

`origin/release_25.1...HEAD`, 3 commits, 5 files, +57/-10:

- `lib/galaxy/model/__init__.py`: a `store_by is None` guard in `MetadataFile.get_file_name`, the new `get_file_name_if_locatable`, and three `to_dict` call sites.
- `lib/galaxy/managers/datasets.py`: one call site in `serialize_metadata`.
- `lib/galaxy/webapps/galaxy/services/library_folder_contents.py`: drops `LibraryDataset.to_dict()` from `_serialize_library_dataset`.
- Tests: `test_folder_contents.py::test_index` (baseline) and `test_galaxy_mapping.py` (red-to-green).

## Structural regressions

None.

## Code-judo opportunities

1. **The listing refactor (commit 3) is the code-judo move, and it's already done.** `_serialize_library_dataset` built a whole `to_dict()` for every row to read three fields. That resolved paths, created metadata files on disk, and hit the object store. Every other field in that constructor already reads `ldda`/`library_dataset` directly. The commit deletes a dependency instead of patching around it, which is the shape this review looks for. I confirmed the values are identical: `LibraryDataset.to_dict` sets `state=ldda.state`, `date_uploaded=ldda.create_time.isoformat()` and `file_ext=ldda.ext`, and the baseline API test pins all three against `GET /libraries/datasets/{id}`.
2. **The missing metadata serialization helper (not acted on, follow-up).** Four sites each run `for name in metadata.spec: val = metadata.get(name); if isinstance(val, MetadataFile): ...`. A shared `metadata_value_for_dict(val)` on the metadata layer (`model/metadata.py` already owns `MetadataFile` value handling in `MetadataElementSpec`/`FileParameter`) would have made this fix a one-line change. The sites differ in small ways (expose-path gating, list joins, datatype defaults), and unifying them on a release branch is out of scope. It belongs on dev.

## Spaghetti and branching

The new `if store_by is None: raise` is not an ad-hoc branch. It enforces an invariant that `getattr(self, store_by)` already assumed, at the exact point where that assumption is made, and it turns an incidental `TypeError` into a typed error. `get_store_by` documents `None` as a legitimate return value ("or None if not yet saved"), and `Dataset.extra_files_path_name_from` already checks for it. `MetadataFile` was the one caller that didn't. The `ObjectNotFound` is not swallowed by the method's `except (AssertionError, AttributeError)` fallback. That's correct: the hashed-path fallback is for a MetadataFile with no association, not for one that can't be located.

## Boundaries and types

- `get_file_name_if_locatable() -> Optional[str]` is an honest contract. Callers in `to_dict` turn `None` into a JSON null, which matches unset metadata. The dataset-level `file_name` uses `""` (`Dataset.get_file_name`) while metadata uses `None`. That inconsistency predates the branch, and the normal review already asked for the PR description to say so.
- An alternative would put the check in `Dataset.store_by` (raise there). That would break `extra_files_path_name_from`, which depends on `None`. Rejected.

## File size

`model/__init__.py` is about 12.7k lines and grows by 11. It was already far past the threshold, and this branch is not the place to split it. `library_folder_contents.py` shrinks.

## Tests

- The unit test follows the existing bam-index pattern at `test_galaxy_mapping.py:133` and uses a real `DistributedObjectStore` example config. The global object store is restored in `finally`, and setup sits inside the `try`, so a failed setup still restores it. It's proportionate.
- The API baseline test compares against the canonical endpoint instead of hardcoding expectations, apart from the `txt`/`ok` literals, which are sensible anchors.

## Verdict

Approve on code quality. The implementation is minimal and the listing change removes complexity. The one real structural debt is the four-way duplicated metadata serialization loop, which predates the branch and should be a dev follow-up.

</details>
