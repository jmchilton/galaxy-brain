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

## Scope questions

John asked for 1, 2 and 4 in this branch (no tests; cleanups). Done in `5bc71db5779` "Clean up collection tag plumbing":
- `_produce_outputs` stops passing `tags`/`hdca_tags` to `tool.produce_outputs` (none read them). `**kwds` left on the 20 `produce_outputs` signatures — base-class contract, removing is churn.
- `_append_tags` copies the dict (`dict(tags or {})`), annotated `-> None`; `create()` no longer assigns either branch's `None` result. Latent only: no caller passes both a dict and `implicit_inputs` (tool actions pass no implicit inputs; `precreate_dataset_collection_instance` passes `tags=None`).
- `tag_id: Mapped[int | None]` on mixin + 10 subclasses; `PreservedTagsT = dict[str | None, ItemTagAssociation]` alias in `tools/actions/__init__.py`.
- Checks: mypy from `lib/` on touched modules — same 23 pre-existing errors, none in touched files; all `.tag_id` consumers tolerate `None`. Unit (`test_model.py`, `test_galaxy_mapping.py`, `test_TagHandler.py`, `test_actions.py`, `test_HDAManager.py`, `test_model_store.py`, `test_CollectionManager.py`, `test_database_object_names.py`) pass; API `test_tag_auto_propagation` and the new test pass.

`minimize_copies` (not changed): only `History.copy` passes it. It copies every HDA first (hidden element HDAs included) and tags them with `copy_tags_from` — but only `if target_user`. The HDCA copy then reuses those HDAs, so "doesn't re-copy tags" isn't a bug. Real gap: anonymous history copy (`target_user=None`) drops all dataset/element tags, while a direct HDCA copy keeps them. Also: `copy_tags_from` sets the tag's `user` to the target; `copy_tags_to` (`ItemTagAssociation.copy`) leaves `user` unset. Separate follow-ups if wanted.

Still open: type `collections_manager.create(tags=...)` as list-or-dict union.
