# Thermo review — galaxy#24279

- Profile: [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md)
- Model: Opus 5.5, effort low
- Reviewed commit: `890d6f7ab98` (base `release_26.2`)

## Verdict

Reasonable release-branch fix. Good consolidation already present (`_member_stores()` replaces an inlined composite/default expansion; `_preferred_default` centralizes default selection that was inline in `add_entry`). Main maintainability concern: "configured vs. storage-only" is now a second view over `entries_by_version` that callers must remember to choose, and `cached_toolbox.py` (2042 lines) keeps growing hand-rolled in-memory reconciliation. Collapsed into one follow-up (P3 1). No P1s.

## Findings

### P2 1: Configured-version filtering is opt-in per call site

`ToolIndex.configured_versions()` / `get_configured()` were added and ~8 lookups in `cached_toolbox.py` switched over, but raw `entries_by_version` reads remain (lines ~1215, 1624, 1922, 1969) and `ToolIndex.get()` still returns storage-only versions. Which view is correct is now a per-call-site judgement with no type or naming signal; the next lookup added will likely pick the raw map and reintroduce the "storage-only sibling served" bug this PR fixes. Suggest, within this PR: a one-line comment on each remaining raw access saying why raw is intended (e.g. 1969 `_has_tool` intentionally uses raw only for the `tool_version is None` branch), or rename `get` usage in the toolbox so the configured variant is the default. Longer-term fix is in the follow-up issue.

### P3 1: Follow-up refactor (see `thermo_followup_refactor_issue.md`)

Make the offered-versions view the index's primary API, move in-memory reconciliation (`_remove_versions_in_memory`, the removed-version loop in reload, `_refresh_changed_entry`) behind one index-diff abstraction, and share the mtime+md5 staleness check with the eager `ToolCache`. Too large for a 26.2 bug fix.

### P3 2: `_reindex_edited_tool_files` reimplements eager `ToolCache` staleness logic

The mtime-then-`md5_hash_file` comparison mirrors `lib/galaxy/tools/cache.py` (lines ~84, 155); the comment even says "Like the eager ToolCache". A small shared helper (`file_changed_since(path, indexed_at, recorded_hash)`) would keep the two in lockstep. Also the whole method is wrapped in a broad `except Exception` that logs a warning; acceptable for a reload path but it hides `index_tool_files` failures at the same level as a stat miss.

### P3 3: `remove_version(keep_placements=True)` duplicates half of `remove_entry`

When the last version is removed with `keep_placements`, the method hand-deletes `entries_by_version[tool_id]` and `entries[tool_id]` instead of delegating; if `remove_entry` grows more state (caches, projections), this branch drifts. Consider `remove_entry(tool_id, keep_placements=...)` and calling it from both.

### P3 4: Class attribute `_reindex_edited_sources = False` plus constructor arg

The class-level default exists only because `super().__init__` may run overridden init before the attribute is set; but `__init__` already sets `self._reindex_edited_sources` before `super()` (alongside `_store`). The class attribute looks redundant — drop it or note why it is needed.
