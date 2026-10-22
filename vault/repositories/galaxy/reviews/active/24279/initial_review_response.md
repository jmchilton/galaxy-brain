(space for John's free style comments - just keep empty)

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Opus 5.5 at medium effort.
- Review profile [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) was run via Opus 5.5 at low effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via Opus 5.5 at low effort.
- Review profile [learning_galaxy](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/learning_galaxy.md) was run via Opus 5.5 at medium effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via Opus 5.5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

Profile gx_risk_assessment, Claude Opus 5.5 at low effort, reviewed commit 890d6f7ab98.

Mostly a two-way door (no API, schema-hash or index-format change), but it lands on `release_26.2` a startup policy change: a cached toolbox with a missing or unloadable read-only store (CVMFS/`external_store_directory`/URL store) now refuses to boot with `ConfigurationError` instead of degrading to eager parsing, and admins will build operational expectations around whichever behavior ships.

<details><summary>Risk Details</summary>

- Hard-fail on boot: a transient CVMFS mount gap or a bundle published with a mismatched schema cohort now takes Galaxy down rather than slowing it. On reload the current toolbox is kept, so the failure surfaces only at the next restart.
- Tool-version visibility changes: storage-only versions that sit beside a configured version are hidden from `get_tool`, `has_tool`, lineages and the version registry. Workflows or job reruns that pinned such a version (and worked by accident on 26.x cached mode) now resolve to the configured default or miss.
- Published indexes are rewritten in memory on load (`select_configured_defaults`), and the composite merge now prefers `in_panel` entries. Read-only bundles therefore get default selection their publisher did not choose. Reversible, but this is a second source of truth for defaults.
- Re-indexing on reload (`_reindex_edited_sources`) checks mtime and md5 per writable-store entry. On large local stores that adds I/O to every `PUT /api/configuration/toolbox`. Edits made only in macro files are not detected, and errors are swallowed with a warning.
- Multi-process reconciliation (`_remove_versions_in_memory`, proxy re-keying on a surviving version) is new, subtle state handling that is only partly exercised: the Postgres queue-worker tests were not run locally.
- Milestone is 27.0 but the base is `release_26.2`; confirm the intended target.

</details>

<details><summary>Risk Review Advice</summary>

The decision that most needs a human is whether refusing to start is the right 26.2 release-branch behavior for a missing read-only store, or whether it should be opt-in or a loud warning with fallback. Usegalaxy-style CVMFS deployments are the ones affected. Check that the error message and `tool_source_storage.rst` give admins a clear recovery path.

Also confirm that hiding storage-only sibling versions matches the eager toolbox for pinned-version workflow and rerun lookups, and look at `_remove_versions_in_memory` and the peer `reload_tool_source_cache` path for races between concurrent reloads.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24279_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

# Review branch [`pr_24279_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24279_review_0)

Based on the reviewed commit `890d6f7ab98`. The main addition is an integration test for the headline bug: a conf naming `Grep1` 1.0.1 must not be served the storage-only bundled 1.0.4. The test fails on the PR's base and passes on the PR. The branch also adds converter-retention and registry-failure tests for default-target populates. It extracts the reindex file selection into a free function `edited_tool_files` with direct tests, including the shed-guid branch. Last, it routes `ToolIndex.remove_version`'s last-version case through `remove_entry`, documents which `ToolIndex` version view lookups should use, and cleans up the tests: a top-level import and a plain store stub in place of a `MagicMock`. 8 commits; 5 files, +205/−72.

- [`87fca2cf356`](https://github.com/jmchilton/galaxy/commit/87fca2cf356) Move md5_hash_file import to module top in test_cached_tool: moves the function-local import (P3 5).
- [`6f54204ba36`](https://github.com/jmchilton/galaxy/commit/6f54204ba36) Extract edited_tool_files selection and test it without a toolbox: adds a module-level `edited_tool_files(stores)`, which `_reindex_edited_tool_files` calls. The test calls it directly and covers the shed-guid mapping and read-only skip. A slim box test still checks that the method passes the selection to `index_tool_files` and re-reads the index (P3 3).
- [`8683872aac8`](https://github.com/jmchilton/galaxy/commit/8683872aac8) Use a plain read-only store stub in the unindexed store refusal test: replaces the dotted-kwargs `MagicMock` with the `_IndexStore` dataclass stub (P3 6).
- [`6111aad4294`](https://github.com/jmchilton/galaxy/commit/6111aad4294) Drop redundant CachedToolBox._reindex_edited_sources class default: `__init__` already sets it before `super().__init__` (P3 7).
- [`2feabd093fe`](https://github.com/jmchilton/galaxy/commit/2feabd093fe) Route ToolIndex.remove_version's last-version case through remove_entry: gives `remove_entry` a `keep_placements` flag and shares `_drop_placements` (P3 4).
- [`bd57dcf2db9`](https://github.com/jmchilton/galaxy/commit/bd57dcf2db9) Document which ToolIndex version view toolbox lookups should use: adds notes on `entries_by_version` and `get()`, plus a comment on the `has_tool` raw read, and corrects two comments that said lineage reads `entries_by_version` (P3 1).
- [`2cac6a2e3fc`](https://github.com/jmchilton/galaxy/commit/2cac6a2e3fc) Test converter retention and registry failure handling for default-target populates: adds `TestDefaultTargetConverters` with a fake one-converter registry (P3 2).
- [`4eff7fffd71`](https://github.com/jmchilton/galaxy/commit/4eff7fffd71) Add integration test: unconfigured newer bundled version isn't served: adds `TestCachedToolBoxKeepsConfiguredVersion` (P2 1).

</details>

</details>

### P2 1: Bug 1 (configured version shadowed by a newer unconfigured one) has no integration test (implementation verified)

The headline #24263 symptom is visible in the API: a conf names one version, a newer bundled file is indexed storage-only, and `GET /api/tools/{id}` served the newer one. Coverage was unit-only (`ToolIndex` ordering, composite merge, `_registry_box` with hand-registered entries), so nothing exercised the real populate → index → toolbox path. Note that an unreferenced XML in a tmp tool dir is never discovered. Storage-only entries come only from the bundled, hidden-lib, data-manager, converter and ad-hoc sweeps, so the test has to use a bundled pair.

<details><summary>Evidence</summary>

The new `TestCachedToolBoxKeepsConfiguredVersion` adds a conf that names only `filters/grep_1.0.1.xml` (`Grep1` 1.0.1). The bundled sweep then indexes `filters/grep.xml` (1.0.4) storage-only, and the test asserts that precondition on the index. On the PR's base (`1ff2ce4cc51`) it fails with `assert '1.0.4' == '1.0.1'`. On the PR head it passes (1 passed, ~24s).

</details>

Add the integration test. The review branch has it in `test/integration/test_tool_source_storage.py`. It asserts `version == "1.0.1"` and `versions == ["1.0.1"]`.

Fixed in [`4eff7fffd71`](https://github.com/jmchilton/galaxy/commit/4eff7fffd71).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 1: Configured vs. raw version view is a per-call-site choice (implementation verified)

`ToolIndex.configured_versions()` / `get_configured()` are the view the toolbox should offer, but `entries_by_version` and `ToolIndex.get()` still return storage-only versions. Nothing at the API tells the next lookup author which one to use. The raw reads that remain in `cached_toolbox.py` are all correct: the reindex sweep, orphan check, data-manager twin stamp, reload reconciliation, proxy re-keying and the `has_tool` no-version branch. So this is about future call sites, and it was lowered from P2 for that reason.

Document the choice where it's made. The review branch notes on `ToolIndex.entries_by_version` and in `get()`'s docstring that offered-version lookups use `configured_versions` / `get_configured`. It also adds a one-line comment on the `has_tool` raw read, and corrects the `_index_versions_for` docstring and a lineage comment that still said lineage reads `entries_by_version`. Renaming the raw accessors belongs to the follow-up refactor issue.

Fixed in [`bd57dcf2db9`](https://github.com/jmchilton/galaxy/commit/bd57dcf2db9).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 2: Converter retention under `--target __default__` is untested (implementation verified)

The PR body lists "`populate_store.py --target __default__` keeps the converters in the default index" as a fix (`include_converters = DEFAULT_STORE_NAME in writable_names`). The only test change was `datatypes_config: []`. That builds an empty registry, so no converter is ever enumerated. Neither branch of the new `try/except` around `_ensure_datatypes_registry` was exercised either: raise on a full/prune rebuild, warn on a partial populate.

<details><summary>Evidence</summary>

The new `TestDefaultTargetConverters` in `test/unit/scripts/tool_source/test_populate_store.py` uses a fake registry with one converter. All 3 tests fail with the base `populator.py` restored and pass on the PR head.

</details>

Add tests for retention across a default-target rebuild and a prune rebuild, and for both failure branches. The review branch has them.

Fixed in [`2cac6a2e3fc`](https://github.com/jmchilton/galaxy/commit/2cac6a2e3fc).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 3: Reindex selection is tested through a monkeypatched toolbox; shed-guid branch untested (implementation verified)

`test_reindex_edited_tool_files_reindexes_only_changed_files` builds a `_seam_box`, monkeypatches `index_tool_files`, and checks the paths it receives. The test cares about the selection logic: the mtime gate, the hash compare and the path → shed guid/`None` mapping. The `is_shed_guid` branch and the skip of read-only stores were never covered.

Extract the selection into a module-level `edited_tool_files(stores) -> dict[str, str | None]`, which `_reindex_edited_tool_files` calls, and test it directly with plain store stubs. The test should cover the shed-guid mapping and the read-only skip. Keep a slim box-level test that the method passes the selection to `index_tool_files`. The review branch does this.

Fixed in [`6f54204ba36`](https://github.com/jmchilton/galaxy/commit/6f54204ba36).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 4: `remove_version(keep_placements=True)` duplicates `remove_entry` (implementation verified)

When the last version goes with `keep_placements`, `ToolIndex.remove_version` hand-deletes `entries_by_version[tool_id]` and `entries[tool_id]` instead of delegating. It also repeats `remove_entry`'s panel-item filter in the other branch. If `remove_entry` grows more state, the two paths drift.

Give `remove_entry` a `keep_placements` flag and share the placement filter as `_drop_placements`. The review branch does this; the source_store, populate and cached-toolbox unit suites pass.

Fixed in [`2feabd093fe`](https://github.com/jmchilton/galaxy/commit/2feabd093fe).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 5: Function-local import in new unit test (implementation verified)

`test_reindex_edited_tool_files_reindexes_only_changed_files` imports `md5_hash_file` inside the test body with no reason given. Move it to the module's top-level imports.

Fixed in [`87fca2cf356`](https://github.com/jmchilton/galaxy/commit/87fca2cf356).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 6: Read-only store in the refusal test is a `MagicMock` with a dotted-kwargs dict (implementation verified)

`test_toolbox_refuses_to_build_without_read_only_store_index` parametrizes `MagicMock(read_only=True, **{"load_index.return_value": None})`. A plain stub (`read_only`, `load_index()`) reads more clearly. It also won't answer attributes the code under test shouldn't be touching. The review branch reuses the `_IndexStore` dataclass stub added for P3 3.

Fixed in [`8683872aac8`](https://github.com/jmchilton/galaxy/commit/8683872aac8).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 7: Redundant `_reindex_edited_sources = False` class attribute (implementation verified)

`CachedToolBox.__init__` sets `self._reindex_edited_sources` before `super().__init__` runs the overridden `_init_tools_from_configs`, so the class-level default never matters. Drop it. With it removed, the `test_cached_tool.py` boxes built via `__new__` and the rest of the unit suites still pass.

Fixed in [`6111aad4294`](https://github.com/jmchilton/galaxy/commit/6111aad4294).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>

<details><summary>Suggested Follow-Up Refactoring for dev</summary>

Here's draft text for a follow-up issue covering refactorings this review recommends that don't fit this PR or its target branch. When creating the issue, feel free to assign John (jmchilton).

````markdown
# Consolidate cached toolbox version views and in-memory reconciliation

Context: galaxy#24279 (26.2) fixed configured-vs-storage-only version selection and in-place edit re-indexing in `CachedToolBox`. The fix was kept minimal for the release branch, with a docstring note on which `ToolIndex` view lookups should use. This issue tracks the structural cleanup for `dev`.

## Plan

1. **One offered-versions API on `ToolIndex`.** Make the configured view the default (`get`, `versions`). Rename raw access to something explicit (e.g. `stored_versions` / `get_stored`) and use it only in store/populator code, path lookup and reload reconciliation. Audit every `entries_by_version` read in `lib/galaxy/tools/cached_toolbox.py` and migrate it.
2. **Index-diff reconciliation.** Replace the ad hoc reload reconciliation with a single `IndexDiff(previous, current)` that yields the added, changed and removed (id, version) pairs. The current pieces to replace are the removed-version loop, `_remove_versions_in_memory`, `_refresh_changed_entry` and the removed-id pop. One toolbox method then applies the diff to registry slots, proxies, the LRU cache and lineages. `IndexDiff` can be unit-tested without a toolbox.
3. **File staleness.** Detect edits made only in imported macro files. `edited_tool_files` currently compares only the tool file's hash. The eager `ToolCache` tracks macro paths, and the index entry could record them too. If both paths end up with the same model, share the check. Also consider recording a fresh mtime when content is unchanged, so a touched-but-identical file isn't re-hashed on every reload.
4. **Begin splitting `cached_toolbox.py`** (~2000 lines) into index-backed lookup/resolution, reload reconciliation, and materialization.

## Tests

The existing `test/unit/app/tools/test_cached_tool.py` and `source_store/test_index_versions.py` tests should pass unchanged. Add `IndexDiff` unit tests red-to-green. `TestCachedToolBoxKeepsConfiguredVersion` and `TestCachedToolBoxReloadAfterLocalEdit` cover the end-to-end behavior.
````

</details>
