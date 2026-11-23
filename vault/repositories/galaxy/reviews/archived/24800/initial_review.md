# Initial review — galaxy#24800 round 0

- Profile: default (`_shared/reviewers/default.md`)
- Model: Claude Opus 5.5
- Effort: low
- Reviewed commit: `21620b47273fc9f76ccf632debccbe02c8badf2e` (base `release_26.2`)

## Summary

The PR adds one `self._invalidate_tool_caches()` call at the end of
`CachedToolBox.invalidate_index_cache` (inside `_toolbox_lock`), plus a
parametrized unit test. The fix is correct and placed well:

- Every mutation that the reload performs bypasses `register_tool`, which is
  the only place (with `remove_tool_by_id`) that dropped `_tool_to_dict_cache` /
  `_tool_to_dict_cache_admin`. That includes `existing.replace_entry(entry)` in
  `_register_new_index_entries_as_stubs`, `_refresh_changed_entry` (via
  `_cached_tool_for_entry` → `replace_entry`), and `_remove_versions_in_memory`,
  which changes the lineage `versions` that `CachedTool.to_panel_entry` renders.
  A single full clear at the end covers all of them, and it also resets
  `_curated_tool_tags` / `_tool_edam_*`, which were stale after new stubs were
  registered from a peer-written index.
- Clearing everything rather than per id is called out explicitly in the PR
  description ("Every stub gets a new entry object on reload anyway"), and
  `CachedTool.to_panel_entry` builds from the index entry without parsing, so the
  rebuild cost is small. The `reload_tool_source_cache` handler already calls
  `app.reindex_tool_search()` on each broadcast, which costs far more than
  rebuilding these payloads.
- Sibling paths checked: `_reload_tool_index` and the `index_tool_files` reload
  swap `self._tool_index` without touching stubs; the stubs they affect are
  later refreshed through `create_tool` → `register_tool`, which invalidates
  per id. No divergence.

Verification: ran `pytest test/unit/app/tools/test_cached_tool.py -k
invalidate_index_cache` (9 passed). With the new line replaced by `pass`, both
parametrizations of `test_invalidate_index_cache_refreshes_cached_panel_entries`
fail, so the test does guard the regression.

## Findings

### P3 1 — Optional: cover the user-visible symptom at the API level

The bug report is about `GET /api/tools` serving stale names, labels, sections,
and versions after a `reload_tool_source_cache` broadcast. The new test drives a
real `CachedToolBox` with a mocked `_store.load_index`, which proves the cache
is cleared but not that the API path picks up the change.
`test/integration/test_tool_source_storage.py` already has a probe-tool fixture
(`TestCachedToolBox…`, `_write_probe`, `test_reload_serves_edited_tool_version`)
that boots with `use_cached_toolbox=True`. A sibling test could prime
`/api/tools?in_panel=true` (or `/api/tool_panels/default`), rewrite the probe
with a new `name`, repopulate the store and call
`toolbox.invalidate_index_cache()` (or send the control message) instead of
`reload_toolbox`, and assert the listing shows the new name. Given this is a
narrow release-branch fix and the unit test is a real regression guard, this is
optional.

## Notes (not findings)

- `get_tool_to_dict` reads and writes the payload caches without the toolbox
  lock, so a request that builds a payload from the old entry just before the
  reload could store it just after the clear. The window is tiny, the same
  race already exists for `register_tool`, and the PR does not change it.
- The test's `_holder` binding is unused but follows the convention of
  neighbouring tests.
