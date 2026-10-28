Run via Claude Opus 5.5 at default effort.

The iRODS XML parser switch moved ahead of the fix as a second prep commit. The three iRODS/pithos follow-ups (expansion, soft_shutdown fix, test cleanup) were squashed into one commit. The final tree is byte-identical to the old HEAD.

## New history (on `origin/release_26.2`)
1. `cd7176a6032` Baseline tests for object store cache monitor resolution. Unchanged.
2. `cd3ba1ea621` Harden the in-process cache monitor thread. Prep, unchanged from round 1.
3. `32b5a9841c7` Parse iRODS XML cache config with the shared caching parser. New prep.
   - iRODS `parse_config_xml` now calls `parse_caching_config_dict_from_xml` instead of hand-parsing `<cache>`. The `findall("cache")` / `_config_xml_error` guard stays. `string_as_bool` and the `parse_cache_dirs_from_xml` import are dropped.
   - Neutral on base. The shared parser matches the old iRODS code except that it adds a `monitor` key, which base iRODS never reads. `to_dict` serializes through `_cache_config_to_dict`, not the parsed dict.
   - Brings `test_parse_config_xml_cache_monitor`, verified red (KeyError) against base `irods.py`.
   - The message was reworded as prep: it aligns iRODS with the other caching stores. "Now that iRODS resolves the cache monitor driver" was dropped.
4. `e84f5111dad` Let object_store_cache_monitor_driver decide in-process cache monitoring. The fix (`Fixes #24546`). A clean cherry-pick of `827116eff06`, content unchanged.
5. `6fe63109810` Start the in-process cache monitor for iRODS and pithos stores. This is the re-scope expansion.
   - Squash of `381fb819572`, `5a46ed80bcc` and `0279b1a5ff2`. The soft_shutdown fix and the fixture/fake cleanup were fixups of the unmerged expansion commit, so neither stands alone.
   - The message now also covers stopping the monitor in iRODS `soft_shutdown`.
   - Kept separate from the fix so the re-scope boundary shows in history.

## Why reorder
In the old order, the expansion commit had iRODS running the monitor while still ignoring a per-store `monitor="external"`. The XML fix came later. That gap was only a product of commit order. With the parser first, no commit in the series has that bug.

## Old to new mapping
- `cd7176a6032` and `cd3ba1ea621`: unchanged.
- `315bd644053` (iRODS parser) became `32b5a9841c7`, rebuilt by hand on base `irods.py`.
- `827116eff06` (fix) became `e84f5111dad`.
- `381fb819572`, `5a46ed80bcc` and `0279b1a5ff2` became `6fe63109810`. It was built by checking out the old HEAD's `irods.py`, `pithos.py`, `test_irods.py` and `test_objectstore.py`, which keeps test order identical to the old HEAD.
- The old HEAD `315bd644053` is kept locally as tag `refactor-baseline-backup-2` in WORKING_DIRECTORY, not pushed. The round-1 tag `refactor-baseline-backup` is untouched.

## Validation
- `git diff refactor-baseline-backup-2 HEAD` is empty.
- Tests (`test/unit/objectstore/` plus `test/unit/app/test_tasks.py`), all with 16 skipped:
  - #3: 226 passed.
  - #4: 236 passed.
  - #5: 239 passed.
- Lint passed on #3, #4 and #5: isort, black, ruff and flake8 over `lib/galaxy/objectstore` and `test/unit/objectstore`, plus the pre-commit hooks on commit.
- Pushed with `--force-with-lease` to `jmchilton/issue_24546_cache_monitor_default_26.2` (`6fe63109810`). `issue_24546_cache_monitor_default_26.2_alt_original_scope` was not touched.
