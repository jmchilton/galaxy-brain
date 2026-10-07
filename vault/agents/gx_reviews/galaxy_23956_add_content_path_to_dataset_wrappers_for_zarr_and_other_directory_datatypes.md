# galaxy#23956 — Add `content_path` to dataset wrappers for Zarr and other directory datatypes

- PR: https://github.com/galaxyproject/galaxy/pull/23956 (davelopez, ready for review, base `dev`)
- Head reviewed: `4a81462fae5` (2 commits, +199/-1, 8 files)
- Worktree: `~/projects/worktrees/galaxy/pr/23956`
- Related: [[galaxy_23953_fix_serving_and_downloading_of_directory_backed_datasets]] (#23953, serving/download fixes, base `release_26.1`)
- Status: reviewed locally, review **unposted**.

## Summary

Adds `$input.content_path` for tool templates, replacing the
`#if zarr: $input.extra_files_path/$input.metadata.store_root #else $input` boilerplate.

- New datatype hook `Data.get_content_relpath(dataset) -> str | None` (`data.py:303`): `None` = primary file; `Directory` returns `""` (`data.py:1291`); `ZarrDirectory` returns `store_root or ""` (`data.py:1357`). The Zarr preview reuses it, which also fixes a crash when `store_root` is unset.
- `DatasetFilenameWrapper.content_path` (`wrappers.py:478`): deferred → `str(self)` (the URI); file datatypes → `str(self)`; outputs and `""` → rewritten `extra_files_path`; otherwise `extra_files_path/sanitize_text(relpath)`. Builds on the compute-environment-rewritten `extra_files_path`, so Pulsar/remote path rewriting carries over.
- Documented in `galaxy.xsd` under the `data` param docs, including remote Zarr via `allow_uri_if_protocol`.
- Tests: framework tool `test/functional/tools/content_path.xml` (Zarr store in a subfolder, Zarr output, plain txt), wrapper unit tests, a datatype hook unit test.

Local check: `test_wrappers.py` + `test_data.py` — 33 passed. Framework tool test not run.

## Relation to #23953

- 23953 serves and zips the whole `extra_files_path` and never resolves `store_root`, so the two PRs don't conflict on what "content" means. 23956's hook is the tool-facing definition, and 23953 works at the raw-extra-files level.
- Shared notion: "directory-backed". 23953 uses `isinstance(datatype, Directory)` (and needs the same in dev's `is_archive_download`). 23956's `get_content_relpath() is not None` encodes the same thing. Suggest one datatype-level abstraction backing both; this hook is the natural home. The same hook could also be serialized in the dataset API so visualizations (Vizarr) stop re-deriving `store_root` client-side.
- No textual conflict between the PRs (`git merge-tree` conflicts are only 26.1-vs-dev drift in 23953). Order doesn't matter; 23956 can merge independently on dev.

## Findings (ranked)

1. **Sanitizing `store_root` yields a non-existent path** (`wrappers.py:493`; codified in `test_wrappers.py:326`: `it's.zarr` → `it__sq__s.zarr`). Sanitizing is needed because tools wrap the path in single quotes, but the outcome is a path that silently doesn't exist, so the tool fails with a confusing "no such file". `store_root` comes from a single `os.listdir` entry, so it's whatever folder name the user's archive had. Options: normalize the store folder name at upload/`set_meta` time, or fail clearly when `sanitize_text(relpath) != relpath`. The test asserts the broken outcome as expected behavior; flag it.
2. **New tool-template contract — name and semantics deserve a deliberate decision** (one-way door). Points to settle before merge:
   - Inputs vs outputs differ for Zarr: input → `extra_files_path/store_root`, output → `extra_files_path` (since `store_root` is only known after the job runs). That's sensible but asymmetric, and is documented only in the XSD prose.
   - For deferred datasets `content_path` returns the URI for *every* datatype, not just Zarr — same as `$input`, but the doc only describes Zarr.
   - The tri-state `str | None` hook (`""` ≠ `None`) is subtle. A narrower name or a small typed return (e.g. `None` vs `PurePosixPath`), or a separate `is_directory_backed`, would read better and directly serve 23953's predicate.
   - `multiple="true"` data params (`DatasetListWrapper`) and collection elements: works per element (`DatasetFilenameWrapper`), but the docs don't say so; a one-line note or a test with a collection of Zarr would help.
3. **Reuse / consistency**: `content_path` builds on `self.extra_files_path` via `__getattr__`, so it inherits input/output rewriting. Good reuse. But the relpath bypasses `MetadataWrapper` and hand-calls `sanitize_text`; that's acceptable because the hook is datatype-generic. Worth a short comment there only if the sanitize behavior changes per finding 1.
4. **Tests**: the framework tool test is the right level (real upload of a subfolder store, real output metadata). It doesn't cover `ome_zarr` (subclass) or plain `directory` input end-to-end; unit tests cover those. `test_get_content_relpath` overlaps the wrapper tests heavily. Fine but trimmable. The `test_dataset_content_path_none_dataset` case is reasonable (optional inputs).
5. **Docs**: the XSD text is good. Consider also stating that `content_path` equals `$input` for non-directory datatypes, so tool authors can use it unconditionally (it's implied by the example). Also check whether the planemo/IUC best-practice docs should point to it.
6. Imports at module top; typing OK; comments not obvious-noise.

## Draft GitHub review (UNPOSTED)

> *Posted by Claude (AI assistant) on behalf of jmchilton. Not written by them personally.*
>
> Nice. The `extension == "zarr"` boilerplate has been a trap (it misses `ome_zarr`), and putting the logic on the datatype via `get_content_relpath()` with the wrapper building on the rewritten `extra_files_path` is the right shape. Pulsar/remote rewriting comes for free. The framework tool test with a store in a subfolder is the right level of testing.
>
> Since `$input.content_path` becomes a tool-author contract we can't easily change later, a few questions about semantics:
>
> - **Sanitized `store_root`.** `test_dataset_content_path_zarr` asserts that `it's.zarr` becomes `.../it__sq__s.zarr`, which is a path that doesn't exist, so the tool fails with a confusing error. Could we normalize the store folder name when the store is created or metadata is set, or raise a clear error when sanitizing would change the relpath? I'd prefer not to encode the mangled path as expected behavior in the test.
> - **Input vs output.** For Zarr, inputs resolve to `extra_files_path/store_root` and outputs to `extra_files_path`. That makes sense, but please state it explicitly in the XSD docs, alongside "equals `$input` for regular datatypes" and "for deferred inputs it's the source URI for any datatype".
> - **Hook shape.** The `str | None` return, where `""` and `None` mean different things, is subtle. #23953 needs the same "is this directory-backed?" predicate (it uses `isinstance(datatype, Directory)` in the download and archive paths, and dev's `is_archive_download` needs it too). Could this hook, or a sibling such as `is_directory_backed`, be the one place both PRs use?
> - **Collections / `multiple="true"`.** Each element wrapper gets `content_path`. A short note in the docs, or a collection-of-Zarr case in the test tool, would make that explicit.
>
> Small: the Zarr preview reusing the hook (and no longer crashing on unset `store_root`) is a good side fix.

## Risks

`$input.content_path` becomes a tool-template contract that IUC and other tools will depend on, so its name and per-case semantics (input vs output, deferred URIs, sanitized store roots) are hard to change once released.

<details><summary>Risk Details</summary>

- New wrapper attribute name `content_path` is permanent once tools ship using it. Check it doesn't shadow any dataset attribute or metadata name a datatype could define (wrapper `__getattr__` falls through to the dataset).
- Zarr inputs resolve to the store root but outputs to `extra_files_path`. Tools will hard-code this asymmetry.
- Deferred inputs resolve to the source URI for any datatype. Tools that opt in via `allow_uri_if_protocol` will rely on that.
- Store folder names containing quotes or other mapped characters resolve to a non-existent path. Changing this later (normalize vs error) changes tool-visible behavior.
- `get_content_relpath()` becomes a datatype-level extension point that datatypes outside Galaxy core may override.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should agree on the name and the full semantics table (regular, directory, Zarr input, Zarr output, deferred, collection element) before merge, and make sure the XSD documents all of it. Decide how unusual `store_root` names are handled. Consider aligning the hook with the "directory-backed" predicate #23953 needs on dev, so one datatype abstraction backs serving, archiving, and tool paths.

</details>
