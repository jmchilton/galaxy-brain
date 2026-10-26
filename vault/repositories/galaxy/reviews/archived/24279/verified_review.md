### P2 1: Bug 1 (configured version shadowed by a newer unconfigured one) has no integration test (implementation verified)

The headline #24263 symptom is visible in the API: a conf names one version, a newer bundled file is indexed storage-only, and `GET /api/tools/{id}` served the newer one. Coverage was unit-only (`ToolIndex` ordering, composite merge, `_registry_box` with hand-registered entries), so nothing exercised the real populate → index → toolbox path. Note that an unreferenced XML in a tmp tool dir is never discovered. Storage-only entries come only from the bundled, hidden-lib, data-manager, converter and ad-hoc sweeps, so the test has to use a bundled pair.

<details><summary>Evidence</summary>

The new `TestCachedToolBoxKeepsConfiguredVersion` adds a conf that names only `filters/grep_1.0.1.xml` (`Grep1` 1.0.1). The bundled sweep then indexes `filters/grep.xml` (1.0.4) storage-only, and the test asserts that precondition on the index. On the PR's base (`1ff2ce4cc51`) it fails with `assert '1.0.4' == '1.0.1'`. On the PR head it passes (1 passed, ~24s).

</details>

Add the integration test. The review branch has it in `test/integration/test_tool_source_storage.py`. It asserts `version == "1.0.1"` and `versions == ["1.0.1"]`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 1: Configured vs. raw version view is a per-call-site choice (implementation verified)

`ToolIndex.configured_versions()` / `get_configured()` are the view the toolbox should offer, but `entries_by_version` and `ToolIndex.get()` still return storage-only versions. Nothing at the API tells the next lookup author which one to use. The raw reads that remain in `cached_toolbox.py` are all correct: the reindex sweep, orphan check, data-manager twin stamp, reload reconciliation, proxy re-keying and the `has_tool` no-version branch. So this is about future call sites, and it was lowered from P2 for that reason.

Document the choice where it's made. The review branch notes on `ToolIndex.entries_by_version` and in `get()`'s docstring that offered-version lookups use `configured_versions` / `get_configured`. It also adds a one-line comment on the `has_tool` raw read, and corrects the `_index_versions_for` docstring and a lineage comment that still said lineage reads `entries_by_version`. Renaming the raw accessors belongs to the follow-up refactor issue.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 2: Converter retention under `--target __default__` is untested (implementation verified)

The PR body lists "`populate_store.py --target __default__` keeps the converters in the default index" as a fix (`include_converters = DEFAULT_STORE_NAME in writable_names`). The only test change was `datatypes_config: []`. That builds an empty registry, so no converter is ever enumerated. Neither branch of the new `try/except` around `_ensure_datatypes_registry` was exercised either: raise on a full/prune rebuild, warn on a partial populate.

<details><summary>Evidence</summary>

The new `TestDefaultTargetConverters` in `test/unit/scripts/tool_source/test_populate_store.py` uses a fake registry with one converter. All 3 tests fail with the base `populator.py` restored and pass on the PR head.

</details>

Add tests for retention across a default-target rebuild and a prune rebuild, and for both failure branches. The review branch has them.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 3: Reindex selection is tested through a monkeypatched toolbox; shed-guid branch untested (implementation verified)

`test_reindex_edited_tool_files_reindexes_only_changed_files` builds a `_seam_box`, monkeypatches `index_tool_files`, and checks the paths it receives. The test cares about the selection logic: the mtime gate, the hash compare and the path → shed guid/`None` mapping. The `is_shed_guid` branch and the skip of read-only stores were never covered.

Extract the selection into a module-level `edited_tool_files(stores) -> dict[str, str | None]`, which `_reindex_edited_tool_files` calls, and test it directly with plain store stubs. The test should cover the shed-guid mapping and the read-only skip. Keep a slim box-level test that the method passes the selection to `index_tool_files`. The review branch does this.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 4: `remove_version(keep_placements=True)` duplicates `remove_entry` (implementation verified)

When the last version goes with `keep_placements`, `ToolIndex.remove_version` hand-deletes `entries_by_version[tool_id]` and `entries[tool_id]` instead of delegating. It also repeats `remove_entry`'s panel-item filter in the other branch. If `remove_entry` grows more state, the two paths drift.

Give `remove_entry` a `keep_placements` flag and share the placement filter as `_drop_placements`. The review branch does this; the source_store, populate and cached-toolbox unit suites pass.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 5: Function-local import in new unit test (implementation verified)

`test_reindex_edited_tool_files_reindexes_only_changed_files` imports `md5_hash_file` inside the test body with no reason given. Move it to the module's top-level imports.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 6: Read-only store in the refusal test is a `MagicMock` with a dotted-kwargs dict (implementation verified)

`test_toolbox_refuses_to_build_without_read_only_store_index` parametrizes `MagicMock(read_only=True, **{"load_index.return_value": None})`. A plain stub (`read_only`, `load_index()`) reads more clearly. It also won't answer attributes the code under test shouldn't be touching. The review branch reuses the `_IndexStore` dataclass stub added for P3 3.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 7: Redundant `_reindex_edited_sources = False` class attribute (implementation verified)

`CachedToolBox.__init__` sets `self._reindex_edited_sources` before `super().__init__` runs the overridden `_init_tools_from_configs`, so the class-level default never matters. Drop it. With it removed, the `test_cached_tool.py` boxes built via `__new__` and the rest of the unit suites still pass.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>
