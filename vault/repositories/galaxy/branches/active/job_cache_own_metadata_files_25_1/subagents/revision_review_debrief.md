Run via Claude Opus (general-purpose subagent).

# Revision review debrief

Reviewed the two commits John asked for on 2026-11-12: the `get_replacement_dataset` purged filter (`be6039aa695`) and the `MetadataFile.update_from_file` cache-sync saving (`bf488cd501c` before amend). The reviewer found nothing that needs changing. I acted on its one low-severity finding: the caching store's `_update_from_file` now creates the cache directory before copying into it, as rucio already does. That change is amended into the performance commit.

Not acted on:
- **Test nit:** `test_copy_from_writes_metadata_files_without_syncing_the_cache` spies on the `sync_cache` kwarg against a disk store, which ignores it. It still fails without the fix and pins the regression, so I kept it.
- **Commit message:** it mentions only in-place materialization, but the filter also covers the not-in-place `copy_from(replacement)` path. That's desirable, and the PR description can say so.

<details>
<summary>Full review</summary>

Top line: nothing needs to change. Both new tests fail when their `lib/` change is reverted (checked in a scratch export).

1. Low, medium confidence. `lib/galaxy/model/__init__.py` `update_from_file` with `lib/galaxy/objectstore/_caching_base.py` `_update_from_file`. The old synced `get_file_name()` pulled the object into the cache, which ran `os.makedirs` on its directory. `_caching_base._update_from_file` copies into the cache path without creating the directory. `get_file_name` creates the directory only when the object doesn't exist yet, so this affects re-setting metadata on an existing metadata file (`FileParameter.from_external_value`, `metadata.py`), on a host whose staging directory lacks that hashed subdirectory. Effect: an OSError is caught and logged as "Trouble copying source file ... to cache". The push still uses the source file, so the remote object is correct. New copies always go through `create`, which makes the directory. Optional fix: `os.makedirs(os.path.dirname(cache_file), exist_ok=True)`, matching rucio. **Applied.**
2. Nit. The new perf test asserts the mechanism (a `sync_cache` kwarg) on a disk store. It's defensible to keep.

Checked, no issue:
- **alt_name basename:** identical with and without sync. This holds for the caching base, rucio, disk, distributed/hierarchical passthrough and pulsar.
- **Callers of `MetadataFile.update_from_file`:** `metadata.py` copy (create runs first), `from_external_value` (finding 1), and `store.push_metadata_files` (source == cache file, so the copy is skipped). None relied on other sync side effects.
- **Purged-only filter:** correct. pgcleanup removes metadata files only for purged HDAs. Deleted-but-unpurged HDAs keep theirs, and the materialized copy owns its rows. This matches Galaxy's idiom and stays consistent with the stricter job cache search.

No security concerns.

</details>
