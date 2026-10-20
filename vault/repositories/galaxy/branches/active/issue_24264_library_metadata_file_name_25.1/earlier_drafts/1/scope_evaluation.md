# Scope evaluation

**Recommendation: modest expansion (Scope C).** Keep all three commits and add one small sibling fix with the same root cause: `extra_files_path` serialization (`DatasetSerializer.serialize_extra_files_path`, which the HDA serializer proxies to through `keys=extra_files_path`) still 500s with a `KeyError` from `DistributedObjectStore._construct_path` when the dataset's backend can't be located. I confirmed it with a scratch repro on the branch head: `KeyError: 'removed_backend'` for an invalid id, and `KeyError: None` for an unset id that isn't found. Fix it the same way the branch fixes metadata files: on read paths, degrade to `None` when the store can't locate the dataset, plus one unit test against the existing `distributed_disk.xml` setup. Don't change the distributed store's lookup semantics (Scope D), purged handling (Scope F) or the duplicated metadata loops (Scope E) on this release-branch PR. Those go in follow-up issues.

Branch is ~57 added lines including tests, under the 100-line threshold, so no decomposition section. `baseline_refactor.md` already orders the commits so the listing change and the fix can be split if wanted.

## A. As implemented

Baseline API test, the folder listing stops calling `LibraryDataset.to_dict()`, and `MetadataFile.get_file_name` raises `ObjectNotFound` when nested `get_store_by()` returns `None`. A `get_file_name_if_locatable()` helper is used at the four metadata serialization sites (HDA/LD/LDDA `to_dict`, `serialize_metadata`).

| Pros | Cons |
|---|---|
| - Fixes the reported endpoint twice over: the listing no longer touches metadata at all, and `to_dict` is safe<br>- Typed error on write paths instead of `TypeError`, with no bogus path handed out<br>- Small and easy to merge forward (two trivial conflicts on dev) | - Leaves a sibling 500 for the same unlocatable-dataset condition (`extra_files_path`, see C)<br>- Issue's exact trigger (legacy by-id store; `include_deleted=True` hints at purged/missing files) still unconfirmed |

## B. Contract: listing commit only

Ship the baseline test and `95d68e38ba6`. It removes the folder-listing route to the crash without touching `MetadataFile`.

| Pros | Cons |
|---|---|
| - Smallest diff, no model change<br>- Fixes exactly what bioblend hit | - `GET /api/libraries/datasets/{id}`, LDDA/HDA `to_dict` and `expose_dataset_path` serializers still 500 with the same `TypeError`<br>- Against the reviewer preference for fixing the root cause in touched code |

## C. Modest expansion: also guard `extra_files_path` serialization (recommended)

As implemented, plus `serialize_extra_files_path` returns `None` (or skips) when the dataset can't be located, instead of letting `get_extra_files_path()` hit `self.backends[obj.object_store_id]` and raise `KeyError`. Put the guard on the read path only (serializer or a small `*_if_locatable` style check), not in `get_extra_files_path`, which write paths use.

| Pros | Cons |
|---|---|
| - Same root cause (nested store can't find the dataset), same layer (dataset serialization), same "read paths degrade, write paths fail typed" rule<br>- About 5 lines plus one unit test reusing the branch's distributed-store setup<br>- Removes the last unlocatable-dataset 500 found in the serializers | - Only reachable through the history/dataset API with an explicit `keys=extra_files_path` (in no default view) and admin or `expose_dataset_path`, so low exposure. It's a history API sibling, not a library one<br>- One more file touched for merge-forward |

<details>
<summary>Trace</summary>

`get_extra_files_path()` → `object_store.exists(..., dir_only=True, extra_dir=None)` returns `False` (distributed `_call_method` default when `__get_store_id_for` is `None`) → `object_store.construct_path(...)` → `DistributedObjectStore._construct_path` → `self._resolve_backend(obj.object_store_id)` → `self.backends[<invalid id or None>]` → `KeyError`. `_extra_files_rel_path` is already `None`-safe through `extra_files_path_name_from`, so the crash is in path construction, not naming. The serializer already short-circuits `purged`. Hierarchical `_construct_path` uses `backends[0]` and doesn't crash.

Verified with a scratchpad script (no worktree edits) on HEAD `5a8081d3034`, using `distributed_disk.xml` and an unpersisted `Dataset`. `object_store_id="removed_backend"` gives `store_by None` and `KeyError 'removed_backend'`. `object_store_id=None` with no file gives `store_by None` and `KeyError None`. Reach: the `extra_files_path` key is mapped only in `DatasetSerializer` and proxied by `_UnflattenedMetadataDatasetAssociationSerializer` (used by `hdas.py`). No library or LDDA route requests it.

Test: one unit test that sets up the distributed store the same way the branch's `test_library_dataset_to_dict_dataset_in_unknown_backend` does. This doesn't reopen the test-challenge decision to skip HDA/LDDA `to_dict` variants, because it covers a different code path (the extra-files path, not metadata).

</details>

## D. Larger expansion: invalid `object_store_id` falls through to `search_for_missing`

In `DistributedObjectStore.__get_store_id_for`, the comment says an invalid store id should trigger a search ("or if the object's store id is invalid, try to locate the object"), but the code uses `elif`, so only `None` ids are searched. The normal review noticed this too. Changing it would make datasets with a stale backend id findable again.

| Pros | Cons |
|---|---|
| - Root-cause fix for the "backend removed or renamed" case. Downloads and everything else would work again, not just stop 500ing<br>- Matches the code's own comment | - A successful search rewrites `obj.object_store_id` as a side effect of reads, which silently migrates DB rows<br>- Changes core object store semantics for every call on a release branch, and searches all backends on every access to such objects<br>- Doesn't help when files are truly gone (purged, hierarchical miss), and the reporter's config is unconfirmed<br>- Still `elif` on dev, so this needs its own discussion |

## E. Expansion: unify the four metadata-to-dict loops

Extract a shared `metadata_value_for_dict(...)` helper for HDA/LD/LDDA `to_dict` and `serialize_metadata` (from the thermo review).

| Pros | Cons |
|---|---|
| - This fix would have been one line<br>- Removes real duplication | - The four copies differ (expose-path gating, list joins, datatype fallback), so it's a refactor with behavior risk<br>- Heavy merge-forward churn in `model/__init__.py`. Belongs on dev as a follow-up |

## F. Expansion: short-circuit purged datasets in the metadata read helper

Mirror `Dataset.get_file_name`'s `purged` check in `get_file_name_if_locatable()` so purged datasets never resolve or create metadata files.

| Pros | Cons |
|---|---|
| - Consistent across store types for the likely `include_deleted=True` trigger<br>- Avoids re-creating empty metadata files on read | - Changes output for plain disk stores, where purge leaves metadata files in place (`full_delete` has "TODO: purge metadata files")<br>- The `store_by is None` guard already covers the crash, so this is a behavior change, not a fix |

## G. Expansion: integration test with a distributed store config

Reproduce the 500 end to end via `GET /api/folders/{id}/contents` with a misconfigured backend.

| Pros | Cons |
|---|---|
| - End-to-end proof | - Needs a custom object store config plus a direct DB edit. The unit test already reproduces the exact `TypeError` red-to-green (see `test_challenges_debrief.md`) |

## Other review points considered

- **Thermo: use `Dataset.store_by` in `MetadataFile.get_file_name`.** Not in this PR. It saves one line but adds merge-forward churn (dev's `auth=` kwarg, the existing `type:ignore`). No scope change.
- **Initial debrief: return `""` like `Dataset.get_file_name` instead of raising.** Rejected. `update_from_file` passes `basename(get_file_name())` as `alt_name`, so a blank result would write to the wrong place. Raising on write and degrading on read stays.
- **Normal review: dataset `file_name: ""` vs metadata `None`.** Pre-existing inconsistency. Call it out in the PR description. No scope change.
- **Normal review: duplicate warning logs in the distributed case.** Kept as is. The hierarchical case logs nothing otherwise.
- **Test challenges: no HDA/LDDA `to_dict` test variants.** Still right. They share the helper. C adds a test only for its own new path.

## Suggested follow-up issues

- D: distributed `__get_store_id_for` `elif` versus its comment (stale backend ids never searched).
- E: shared metadata serialization helper (dev).
- `MetadataFile` purge, per the `full_delete` TODO.
