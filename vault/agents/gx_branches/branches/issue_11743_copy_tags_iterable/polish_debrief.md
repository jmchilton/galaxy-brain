# issue_11743_copy_tags_iterable — polish debrief

Polished 2026-10-07. Branch `9c10468c128` → `a030be5e3f7` (amend, force-pushed to `jmchilton`). No PR opened.

## CI

Fork CI on `9c10468c128` was all queued at start, no reds. The amend restarts it; `a030be5e3f7` not yet run.

## Checklist (GENERAL only — not workflow-related)

Subagent: all items pass; human-read item left unchecked. Verified callers (none pass a dict), mixin annotations leave every subclass `__table__` identical (dumped HEAD vs HEAD~1), no duplicate test on dev.

## Strengthening round

Tasks applied:
- Dropped no-op `wait=True` from `create_list_of_pairs_in_history(...)` in the new test (helper only forwards `name`). Test re-run locally: passes. Checklist answers untouched, so no re-run.

Description fixes from the round:
- Table row 2 no longer says "done"; says passed as `.values()` since #10761, still a dict.
- Narrowed "no test checks copied element tags" to "after an HDCA copy" (`test_dataset_collection_create_from_exisiting_datasets_with_new_tags` checks tags on copied elements at collection build).
- Explains why history copy tests can't cover #10761's line: `copy_history` copies HDAs with `copy_tags_from` first, then `minimize_copies` reuses them.
- New bold misreading answer: dict branch came from #11741 (`f360f6498fb`, 2021-03-26) for model-operation tools passing the preserved-tags dict; they switched to `<obj>.tags` in `58ac5ab57a9` (2021-05) and `e45a913eef0` (2021-09). Verified by `git log -S`.
- Cites `test_tag_auto_propagation` as existing coverage for the typed `preserved_tags.values()` path.

## Scope questions for John (not done)

- Drop the unused `tags`/`hdca_tags` kwargs `ModelOperationToolAction._produce_outputs` passes to `tool.produce_outputs` (no `produce_outputs` reads them)? Last way a dict could reach `copy`; touches every `produce_outputs`.
- `_append_tags` (`managers/collections.py`): mutates shared `preserved_tags` in place; returns `None` but `create()` assigns it to `tags`.
- `copy_to_collection` with `minimize_copies` reusing an already-copied HDA doesn't re-copy tags.
- `tag_id: Mapped[int]` vs `nullable=True` on all 10 subclasses.
- `preserved_tags` keyed by `tag.value`, which can be `None` — type says `str`.
- Type `collections_manager.create(tags=...)` as list-or-dict union.
