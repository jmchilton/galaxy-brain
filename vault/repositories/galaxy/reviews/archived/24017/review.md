# Initial review — Galaxy #24017

[PR #24017](https://github.com/galaxyproject/galaxy/pull/24017): **[26.1] Share dir_mtime cache directory listings per process**

- Reviewed on 2026-10-10 at `358de494610a2873cf134a697ba248824a7fa231`, against `release_26.1`.
- Local HEAD matched GitHub before review and again after validation. PR remains open and out of draft.
- **Recommendation: approve. No correctness blockers identified.**
- **Delivery: unposted draft.** No GitHub review or comment was submitted.
- Supporting verification: [validation probe](validation_probe.py). Suggested public text: [draft review](draft-review.md).

## Assessment

The `(absolute path, hash function)` key preserves separate v1/v2 parsing while letting explicit and mulled singularity resolvers share their default-v2 directory listing. `_DirMtimeListing` publishes the mtime and list together, rechecks mtime after acquiring its lock, and records the timestamp before listing. This avoids concurrent duplicate builds and ensures a directory change during a build is detected on the next read. Invalidation uses the same lock and reaches every resolver sharing the listing. The weak registry does not itself retain a listing after its last resolver disappears.

The new sorting groups identifiers by the same image-name split used by `identifier_to_cached_target`; cached-image matching only chooses among entries with that image name. Sorting remains newest first within each group, including v1/v2 multi-target builds and single-package versions/builds. Although the helper also changes the uncached path's listing order between unrelated image names, its matching behavior remains consistent. Docker listing behavior is unchanged. Repository consumers of these lists read them rather than mutating the newly shared list.

Imports are at module scope, the abstraction separates shared state from resolver configuration, and typing follows the surrounding module. Existing tests were preserved. The new registry-level test meaningfully checks sharing across independent registries and resolver classes; the new resolution test checks the observable version/build choice.

## Non-blocking test suggestion

At [test_container_resolution.py:192–202](https://github.com/galaxyproject/galaxy/blob/358de494610a2873cf134a697ba248824a7fa231/test/unit/tool_util/test_container_resolution.py#L192-L202), readers execute sequentially and refresh is driven only by an mtime change. The central behavior added at [mulled.py:185–207](https://github.com/galaxyproject/galaxy/blob/358de494610a2873cf134a697ba248824a7fa231/lib/galaxy/tool_util/deps/container_resolvers/mulled.py#L185-L207) also covers simultaneous readers and shared explicit invalidation. Consider retaining deterministic regressions for (1) concurrent callers producing one directory listing and (2) invalidating one resolver, then reading through another while the directory mtime is unchanged. The attached independent probe exercised both successfully; this is a coverage improvement, not a demonstrated implementation defect.

## Validation

On macOS with the existing Galaxy virtualenv (Python 3.13.12):

```sh
PYTHONPATH=/Users/jxc755/projects/worktrees/galaxy/pr/24017/lib \
PYTHONDONTWRITEBYTECODE=1 PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 \
/Users/jxc755/projects/repositories/galaxy/.venv/bin/python -m pytest \
  -p pytest_mock -p pytest_asyncio.plugin -p no:cacheprovider \
  /Users/jxc755/projects/worktrees/galaxy/pr/24017/test/unit/tool_util/test_container_resolution.py \
  /Users/jxc755/projects/worktrees/galaxy/pr/24017/test/unit/tool_util/mulled/test_mulled_util.py \
  -k 'not test_container_registry' -q
```

Run from `/private/tmp`: **29 passed, 1 deselected**. This includes both new tests, existing dir-mtime/uncached resolver coverage, and the existing mulled utility/version-sort tests. The initial unrestricted selection had 29 passes and one failure: the unchanged default-registry test attempts external involucro and Quay downloads, which failed under sandbox network restrictions. An earlier run from the protected worktree hit a sandbox directory-creation error in that same fixture. No product failure was inferred from those environment failures.

The independent [probe](validation_probe.py), executed against the reviewed worktree's `lib`, passed eight checks:

- Eight simultaneous readers obtain one rebuilt listing and the identical returned list.
- Invalidating one resolver refreshes the shared listing through another at an unchanged mtime.
- v1/v2 cache state and parsed image types remain separate.
- A change made during a listing triggers a second rebuild on the next read.
- A symlink alias has a distinct listing.
- Dropping the final cache-directory reference releases its weakly registered listing.
- The explicit resolver with namespace stripping shares the listing and picks the newest matching build.
- Per-image ordering matches the old global ordering within every image name for 1,123 mixed single-package, v1, v2, untagged, latest-tagged, and duplicate identifiers.

GitHub CI at review time was green for completed checks, with two skipped checks; this included Python 3.10 and 3.14 unit tests, Mulled Unit Tests, lint, and integration checks. There were no review comments or submitted reviews. Local validation did not run a Galaxy server, pull actual images, use CVMFS, exercise every supported Python version, or independently reproduce the reported memory/build-time benchmarks. No Galaxy source files were changed.

## Risks

Risks are low: this is a reversible internal cache and sorting change, with no API, persisted-data, or developer-artifact contract change (a two-way door).

The operational surface is container resolution on a shared directory. A stale listing or changed version ordering could select or miss an image, so concurrent refresh, explicit invalidation, and v1/v2 isolation deserve attention. The functional probes passed; production CVMFS memory reduction remains supported by the author's measurements rather than an independent local benchmark.
