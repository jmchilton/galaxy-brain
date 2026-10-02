# galaxy#23865 — Don't list hidden collections in collection tool form select

- Author: mvdbeek. Base `dev`. +69/-83, 6 files. Fixes #22734 (follow-up promised in #22643 review).
- Reviewed at `ee476eb5a3b`. Worktree `~/projects/worktrees/galaxy/pr/23865` (fetched; branch is 114 commits behind `origin/dev`, none touching the changed files).
- CI: all green (API, integration, framework, selenium/playwright, unit, client, CodeQL, db index checks); 2 jobs skipped. No reviews or comments yet.

## Summary

`DataCollectionToolParameter.to_dict` (`/api/tools/{id}/build`) listed hidden HDCAs as direct matches but excluded them from map-over (multirun) entries. Now it lists only active+visible HDCAs, like the data param. A rerun whose selected HDCA is hidden/deleted/foreign-history is carried into `options.hdca` with `keep: true` and a `(hidden) <name>`-style name. `visible_only` flag dropped from `History.paginated_active_dataset_collections` and `_paginated_dataset_collections` (every caller now wants visible). Dead `match_collections`, `match_multirun_collections`, `DatasetCollectionManager.history_dataset_collections` removed.

## Verdict

Approve, with two small suggestions (share the carry helper; drop the property this PR orphans). Simplification is real: `_classify_hdca` loses its hidden special case, the cache key loses a dimension, and the -83 is mostly dead code plus two tests merged into one stronger test.

## Findings

### 1. Minor — `_carry_selected_hdca` copies the data param's HDCA carry branch (reuse)

`lib/galaxy/tools/parameters/basic.py:3033-3049` (new) is the same code as the HDCA branch of `DataToolParameter._carry_unresolved_inputs` at `basic.py:2808-2814`: same `deleted or not visible or history != history` test, same `_carried_state_label`, same `f"({state}) {value.name}"`, same `make_hdca_entry(..., keep=True)`. The only difference is `include_column_definitions=True`. The PR says it "matches the data parameter's handling", but it does that by copying the code, not calling it. The two copies will drift (e.g. if the label format or the not-carryable test changes).

Suggested: one module-level helper next to `_carried_state_label` (`basic.py:1942`), e.g.

```python
def _carry_hdca(builder, hdca, history, *, include_column_definitions=False) -> None:
    if hdca.deleted or not hdca.visible or hdca.history != history:
        builder.options["hdca"].append(
            make_hdca_entry(
                builder.security, hdca, f"({_carried_state_label(hdca)}) {hdca.name}",
                keep=True, include_column_definitions=include_column_definitions,
            )
        )
```

`_carry_unresolved_inputs` calls it for its HDCA branch, and the collection param calls it after an `isinstance` check. It could also go on `DataOptionsBuilder` (`pagination.py`), which already owns entry shape, but the module function fits better next to `_carried_state_label`.

### 2. Minor — `History.active_visible_dataset_collections` now has no callers

`lib/galaxy/model/__init__.py:4161-4176`. Its only caller was the removed `match_multirun_collections` (`git grep` on HEAD finds only the definition; HEAD~1 had the call at `basic.py:2929`). The PR already removes other methods left without callers, so this one should go too.

### 3. Nit — carried path covered only for "hidden"

`lib/galaxy_test/api/test_jobs.py:1127-1147` covers hidden. Deleted and foreign-history HDCAs on a collection param are newly carried (before, neither was listed) but have no test. The data param covers these in fast unit tests (`test/unit/app/tools/test_data_parameters.py:73-91`, `test_field_display_{hidden,deleted}_hdas_only_if_selected`). Optional. If finding 1 lands, the shared helper gets the data param's existing unit coverage for free, which mostly settles this. Reasoned, not run: a deleted HDCA may never reach `to_dict` on rerun, because `from_json` raises "previously selected dataset collection has been deleted" (`basic.py:2960`). In that case the `(deleted)` label is reachable only by the data-param route.

### 4. Info — behaviour change users will notice

Hidden HDCAs (typically unmarked intermediate workflow outputs) no longer show in collection selects. This is the intent of #22734 and matches hidden HDAs in data selects. API/tool-request submissions by id are not filtered by the listing, so scripted use is unaffected (reasoned; `from_json` only rejects deleted, not hidden). Worth a line in release notes.

### Checked, no issue

- Test removal (-20 in `test_tools.py`): `..._hidden_direct_match_included` (pinned the old behaviour, so it has to go) and `..._hidden_multirun_excluded` merged into `test_build_collection_options_hidden_excluded` (`test_tools.py:652`). The new test is stricter: hidden pair *and* hidden list:paired, exact ordered id list, `total_estimate == 2`. Not weakened.
- Other paths: the tool form, workflow run form (`populate_model.py:94/104`) and paginated search all go through `to_dict` → `_page_hdca_matches`. No separate listing path still returns hidden HDCAs. The client only calls `/build` for this (`client/src/api/tools.ts`, `Tool/services.ts`).
- Client: `FormData.vue:234` treats `keep` options as pinned for the current source, so the carried hdca entry is pre-selected without client changes.
- Every caller of `paginated_active_dataset_collections` / `_paginated_dataset_collections` already passed `visible_only=True` except the one being fixed. Removing the flag is safe.
- Imports: no new imports. Comments/docstrings updated, not obvious-restatement. The walrus refactor in `_classify_hdca` (`basic.py:3107`) only changes indentation.
- Carried selection is not re-checked against the type matcher. The PR says so, and the data param works the same way.

## Draft PR comment (unposted)

> *Posted by Claude (AI assistant) on behalf of jmchilton — not written by them personally.*
>
> Thanks, this is a nice simplification. `_classify_hdca` loses its hidden special case and the merged test is stricter than the two it replaces. Two small things:
>
> 1. `_carry_selected_hdca` (basic.py ~3033) repeats the HDCA branch of `DataToolParameter._carry_unresolved_inputs` (~2808): same carry condition, same `_carried_state_label` prefix, same `make_hdca_entry(keep=True)`. The only difference is `include_column_definitions`. Could this be one module-level helper next to `_carried_state_label` that both params call? Then "matches the data parameter's handling" holds by construction, not by copy.
> 2. `History.active_visible_dataset_collections` (model/__init__.py ~4162) has no callers now that `match_multirun_collections` is gone. Probably worth removing with the other dead code here.
>
> Optional: the new rerun test covers the hidden case. Deleted and other-history HDCAs on a collection param are newly carried too. If (1) lands they'd share the data param's existing unit tests (`test_data_parameters.py`), which mostly covers it.
