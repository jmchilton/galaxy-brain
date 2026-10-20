# Scope evaluation (round 2, after re-scope)

**Recommendation: no further scope change. Ship as implemented (Scope A, 4 commits).** Round 1 already took the modest expansion: the `extra_files_path` guard, now `654118f2dd6`. A fresh sweep found no read or display path left in touched code that still 500s for an unlocatable dataset. Every remaining candidate either sits outside the touched code or changes behavior on working paths: the distributed store's typed errors and `search_for_missing` (D/H), the shared metadata loop (E), purged short-circuiting (F). The process doc says to lean toward expansion, but that rule doesn't apply here: the cheap same-root-cause sibling is already in, and the next step would change object-store error semantics. `jobs/__init__.py:1971`/`:2727` already catch `ObjectNotFound`, so turning distributed `KeyError` into `ObjectNotFound` would quietly change job-finish behavior on a release branch. Those candidates should be follow-up issues (listed at the bottom). The test-challenges open item (dropping two direct-helper assertions in the mapping test) is a test-hygiene decision for John, not a scope change.

## Possible Decompositions

The diff is 102 insertions and 12 deletions, all hand-written (about 34 lines of code, the rest tests). Commits, in order: `9d3606f644b` baseline API test → `c2cc018262d` listing refactor → `7b988167e0b` metadata-file fix (+ `global_object_store_for_models` test helper) → `654118f2dd6` `extra_files_path` guard. Options, none recommended:

1. **One PR** (as is). Reads as one rule: "read paths degrade to `None`, write paths fail typed."
2. **a / b+c.** (a) Baseline + listing refactor: fixes the reported `GET /api/folders/{id}/contents` endpoint whatever the real trigger is, with no model change. (b+c) Metadata fix + extra-files guard: the model-level root-cause fix, depending on nothing from (a).
3. **a+b / c.** Original scope (alt `issue_24264_library_metadata_file_name_25.1_alt_original_scope`) first, then the extra-files guard as a small history-API follow-on. The `global_object_store_for_models` helper lands with (b) and (c) reuses it.
4. **a / b / c.** Three tiny PRs. Most review overhead. Only worth it if reviewers balk at the model changes on a release branch.

## A. As implemented (recommended)

Baseline API test. The folder listing reads `ext`/`create_time`/`state` directly instead of calling `LibraryDataset.to_dict()`. `MetadataFile.get_file_name` raises `ObjectNotFound` when nested `get_store_by()` is `None`, and `get_file_name_if_locatable()` is used at the four metadata serialization sites. `Dataset.get_extra_files_path_if_locatable()` is used by `serialize_extra_files_path`.

| Pros | Cons |
|---|---|
| - Covers the reported endpoint twice: the listing no longer touches metadata, and `to_dict` is safe anyway<br>- Every serializer path for an unlocatable dataset now degrades to `None`. Write paths get a typed 404 instead of `TypeError`/`KeyError`<br>- Caller sweep clean (see details)<br>- Small, merges forward with trivial conflicts | - Reporter's exact config is still unconfirmed (by-id legacy store plus `include_deleted=True` suggests a purged dataset with a nested store `search_for_missing` miss; covered by the `store_by is None` guard either way)<br>- Two `_if_locatable` helpers with different shapes, deliberately (thermo review)<br>- No end-to-end test with a misconfigured store (unit tests reproduce the exact errors) |

<details>
<summary>Caller sweep of the new <code>MetadataFile.get_file_name</code> raise and other <code>store_by</code> users</summary>

- `job_execution/setup.py:213` `get_input_dataset_fnames`: stages job inputs. The job can't run with an unlocatable input anyway. A typed error is right.
- `model/__init__.py:5546` `get_metadata_dataset` (fake bai HDA, via `get_converted_dataset`): converting an unlocatable bam can't succeed either way. 404 instead of 500 is fine. Not a read-only serializer.
- `MetadataFile.update_from_file`, `model/store/__init__.py:2098` `push_metadata_files`: write paths. Typed failure is intended.
- `MetadataFile._serialize` (export): doesn't resolve file names, so it's unaffected.
- `model/deferred.py:160`: only compares `store_by == "id"`, with no `getattr(..., store_by)`. Not the crash pattern.
- `metadata/__init__.py:203` passes `dataset.dataset.store_by` into job metadata config. That's job setup for a dataset being written. Out of scope.
- `Dataset.get_file_name` → `exists()` False → `""`. `get_size` → distributed default 0. `extra_files` listing API is guarded by `extra_files_path_exists()`. `set_total_size` is guarded by the `None`-safe `_extra_files_rel_path`. No other read-path 500 found.

</details>

## B. Contract: original scope (drop `654118f2dd6`)

What the alt branch holds: baseline, listing, metadata fix.

| Pros | Cons |
|---|---|
| - About 20 fewer lines, one fewer file<br>- Purely library and metadata focused | - Brings back a known same-root-cause 500 (`KeyError` from `serialize_extra_files_path`) that round 1 recommended fixing<br>- Undoes a re-scope that already passed review |

## C. Contract: listing commit only

Baseline + `c2cc018262d`.

| Pros | Cons |
|---|---|
| - Smallest diff, no model change<br>- Fixes exactly what bioblend hit | - `GET /api/libraries/datasets/{id}`, LDDA/HDA `to_dict` and `expose_dataset_path` serializers still 500<br>- Against the reviewer preference for fixing the root cause in touched code |

## D. Expansion: distributed `__get_store_id_for` searches for stale ids

The comment says an invalid `object_store_id` should trigger a search, but the `elif` only searches when the id is `None`. Same code on dev.

| Pros | Cons |
|---|---|
| - Datasets with a renamed or removed backend id become fully usable again, not just non-crashing<br>- Matches the code's own comment | - Object store code not touched by this branch. Changes lookup for every call on every deployment<br>- A successful search rewrites `obj.object_store_id` during reads (silent DB migration), and every access searches all backends<br>- Doesn't help purged or truly missing files, which is the likely trigger |

## H. Expansion: distributed `_resolve_backend`/`_construct_path` raise `ObjectNotFound` instead of `KeyError`

The thermo review's "code-judo" move: push "unlocatable" down into the object store, so both model helpers become the same try/except.

| Pros | Cons |
|---|---|
| - Root-cause layer. Would unify the two helpers' shapes<br>- A few lines | - Not touched code. Changes the exception type for every distributed caller<br>- `jobs/__init__.py:1971` (`except (OSError, ObjectNotFound)`) and `:2727` already catch `ObjectNotFound`, so job-finish paths that crash today with `KeyError` would silently take the except branch: a behavior change, not just a better error<br>- The serializer still needs a `None`-returning wrapper, so the branch gets no smaller<br>- No remaining read-path 500 found that this would fix (see A sweep) |

## E. Expansion: unify the four metadata-to-dict loops

A shared helper for HDA/LD/LDDA `to_dict` and `serialize_metadata`.

| Pros | Cons |
|---|---|
| - Removes real duplication. The fix would have been one line | - The copies differ (expose-path gating, list joins, datatype fallback), so it's a behavior-risk refactor<br>- Heavy churn in `model/__init__.py` on merge-forward. A dev follow-up |

## F. Expansion: purged short-circuit in `get_file_name_if_locatable`

Mirror `Dataset.get_file_name`'s `purged` check.

| Pros | Cons |
|---|---|
| - Consistent across store types for the likely `include_deleted=True` trigger. Avoids re-creating empty metadata files on read | - Changes output on plain disk stores, where purge leaves metadata files behind (`full_delete` TODO)<br>- The crash is already covered. This is a behavior change, not a fix |

## G. Expansion: integration test with a misconfigured distributed store

| Pros | Cons |
|---|---|
| - End-to-end proof on `GET /api/folders/{id}/contents` | - Needs a custom config plus a direct DB write (`update_object_store_id` validates). The unit and serializer tests already reproduce `TypeError`/`KeyError` red to green |

## Other points considered

- **Test-challenges open decision:** drop the two `get_extra_files_path_if_locatable()` assertions in `test_dataset_in_unknown_backend_serialization`, since the new serializer test covers them and they make the base-model red fail for the wrong reason. This is test hygiene that needs John's OK. Not scope.
- **Converting the other hand-rolled object-store swaps in tests to `global_object_store_for_models`:** unrelated tests on a release branch. A follow-up.
- **Hierarchical behavior change** (`extra_files_path` is now `null` instead of a made-up dir): put it in the PR description. No scope change.
- **Use `Dataset.store_by` in `MetadataFile.get_file_name`:** declined twice. It adds merge-forward churn and changes no behavior.

## Suggested follow-up issues

- Distributed object store (dev): honor `search_for_missing` for stale backend ids (the `elif` versus its comment). Raise a typed error instead of `KeyError` from `_resolve_backend`/`_construct_path`, after auditing the `ObjectNotFound` catches in `jobs/__init__.py`. That would let the two model `_if_locatable` helpers become one.
- Shared metadata-to-dict helper for HDA/LD/LDDA/`serialize_metadata` (dev).
- Purge `MetadataFile`s on dataset purge (`full_delete` TODO).
- Optional: move the other hand-rolled test object-store swaps onto `global_object_store_for_models`.
