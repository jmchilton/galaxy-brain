# Initial review: galaxyproject/galaxy#24323

- Profile: [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md)
- Model: Claude Opus 5.5, effort low
- Reviewed commit: `306cec00874f1cd79fc2b6217c324bc859b2c88d` (diff vs `git merge-base origin/release_26.1 HEAD`)
- Tests: not run (no `.venv` in worktree); review is by reading.

## Verdict

Approve-able with one small should-fix. The merge revert to full-row dedup is correct and well tested, `get_field` now matches `get_entry` / `get_field_by_name_for_value` first-match semantics, and the post-filter collapse is in the right place for tool form / build. The one gap: the collapse is inlined in `SelectToolParameter.to_dict`, so the workflow parameter-input `restrictOnConnections` path, which calls `get_options` directly, still shows duplicate values again now that duplicate rows survive merging.

## Findings

### P2 1: `restrictOnConnections` single-connection options bypass the new collapse

`InputParameterModule.restrict_options` (`lib/galaxy/workflow/modules.py:1619-1676`) builds runtime select options for a workflow text parameter connected to a tool select by calling `input.get_options(self.trans, context)` directly, not `to_dict`. For a single connection (the common case) it emits every option as is (`modules.py:1653-1657`). With this PR, a table-backed select whose merged table has two `hg38` rows (example B/C in the PR description) yields two `hg38` options on the workflow run form for the parameter input. With #24003 only one row survived, so on `release_26.1` this path regresses. The multi-connection branch (`modules.py:1658-1674`) already collapses by value, but it joins labels, which differs from the tool form's keep-first-label behavior.

The PR description says workflow editor/run payloads get fewer options; that holds for tool steps (via `to_dict`) but not this sibling path.

Suggested fix: move the collapse loop into a `SelectToolParameter.get_display_options(trans, other_values)` method (it needs `self.options.tool_data_table_name` for the guard) and call it from both `to_dict` and `restrict_options`, which already holds the `input` object. That gives the behavior a name instead of an inline block in `to_dict`, and a test in `test_data_table_select_options.py` can target it.

### P3 1: `test_static_dropdown_is_unchanged` pins pre-existing XML parsing behavior

`test/unit/app/tools/test_data_table_select_options.py::test_static_dropdown_is_unchanged` asserts that static `<option>` parsing keeps the last duplicate. That comes from static option parsing, not from this PR's guard (static selects have no `tool_data_table_name`, so the new branch never runs). If it's meant to guard the `tool_data_table_name` condition, a static select with two *distinct* labels sharing a value can't be built through XML, so the test doesn't really exercise the guard. Replace it with a non-table dynamic source that does produce duplicate values (e.g. `from_file` or `dynamic_options`), which would prove the collapse is scoped to tables. If that's impractical, drop it.

### P3 2: Test name now reads oddly

`test_data_manager_reload.py::test_reload_resolves_duplicate_values_like_other_processes` now asserts that both rows are kept. "resolves duplicate values" suggested the #24003 dedup; something like `test_reload_matches_other_processes_with_duplicate_values` would fit the new assertion.

## Notes (not findings)

- Merge cost: `merge_tool_data_table` now hands every incoming row to `add_entries`. With `allow_duplicates=False`, `_add_entry` checks `fields not in self.get_fields()` (`tool_util/data/__init__.py:793`), a linear scan over a fresh copy of `self.data`, and bumps the version on each row. That makes merging O(n·m) at startup and on every reload, where #24003's dict-keyed merge was linear. The behavior is the same as before #24003, so this isn't a blocker, but it's worth a set-based check if large IDC/CVMFS tables are merged.
- `GenomeBuildParameter` (`basic.py:1258`) overrides `to_dict` and reads `__dbkeys__` via `GenomeBuilds.get_genome_build_names`, so merged `__dbkeys__` tables that differ by name/len path will again list a dbkey twice. This matches pre-#24003 behavior and dbkey lists already contain duplicates (builds.txt plus table, see the existing `FIXME` in `managers/dbkeys.py:90`), so it's out of scope. Mentioned only because it's another table-backed dropdown the collapse doesn't reach.
- `dataset_matcher.py:107` reads `param.options.get_options` names as filter values; duplicates there are harmless (a set).
- `get_entry` (`tool_util/data/__init__.py:680`) was already first-match; the `get_field` change makes the field API consistent with it. Good.
- Merge path: dropping the value-keyed dedup also drops the `log.error` for conflicting values. The PR description deliberately keeps only the field-lookup warning; I'm not re-litigating that.
- Collapse keeps dataset-backed (user bundle) options even when they share a value with a table row. That's correct, since they submit an encoded HDA, and it's tested.
