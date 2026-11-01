# Implementation debrief

**STATUS: READY.** The branch is hardened twice, with one re-scope. Branch `issue_24474_collection_input_type_26.2`, base `release_26.2` (`0fa4dc4c4fa`), head `069a65d9c3f`. It implements [#24474](https://github.com/galaxyproject/galaxy/issues/24474).

```
created .../differential-review/snapshots/20261101T165127Z-hardening-069a65d9c3f3.json
  hardening @ 069a65d9c3f3 vs origin/release_26.2 (merge-base 0fa4dc4c4fa3)
  since 20261101T163948Z-hardening-97445bc95ecb:
    commits: 16 same, 0 rebased, 0 changed, 1 new, 0 dropped
```

**Remote is stale.** `jmchilton/issue_24474_collection_input_type_26.2` still points at `8f11cea7dc9`, the first push. History was then rewritten locally by the test-challenge and baseline-refactor steps, and the auto-mode classifier denied the force-push (`--force-with-lease`). The hardened head `069a65d9c3f` exists only in the worktree until someone runs `git push --force-with-lease jmchilton issue_24474_collection_input_type_26.2`. The alt branch is pushed and current.

## What the branch does

1. **Tool parameter check (the issue).**
   - `DataCollectionToolParameter.from_json` rejects a bound collection whose type the declared `collection_type` doesn't accept. The bound value can be an HDCA, a DCE's child collection, or an adapter. The check uses the same `HistoryQuery`/`accepts()` rule as the tool form, now with type-string variants `direct_match_type`/`can_map_over_type`.
   - Valid cases stay valid: `sample_sheet` into `list`, `paired` into `paired_or_unpaired`, and untyped inputs.
   - Unexpanded batch wrappers (`values` plus a truthy `batch` or `__class__: Batch`) are skipped, because the tool form names the collection being mapped over there. Each expanded value is still checked, which also catches a bad `map_over_type`.
   - This covers the legacy tool API, the tool request API, form build and rerun, and job preparation.
   - The error reads: "Parameter 'f1': a dataset collection of type 'list' was supplied, but this parameter accepts only 'paired'".
2. **Workflow runtime step parameters** (the legacy run form path). `check_param(..., allow_map_over=True)` also accepts collections the input can be mapped over, because the invocation maps over them.
3. **Sample sheet columns.** A direct match must also have compatible `column_definitions`, as in the dropdown's `_classify_hdca`.
4. **Scheduling-time rejection** (`MapOverPlanner._rejects_incompatible_collection`). A tool step whose collection input gets an HDCA it can neither take nor be mapped over fails the invocation (`workflow_parameter_invalid`) instead of creating a job that fails at preparation. It does not apply to:
   - subworkflow steps;
   - mapped subworkflow structure;
   - DCEs;
   - steps that may be skipped (a `when` expression, or a False outer condition).

## Scope decision

The round 1 scope evaluation recommended expanding (B, C, D); see [re-scope debrief](implementation_rescope_debrief.md).

- D landed, and B landed narrowed to tool steps.
- C, a request-time check of typed workflow inputs, was dropped. Workflow collection inputs take deeper collections (a `list` input accepts a `list:paired`), and the type algebra doesn't model that. Three existing workflow tests broke under C.
- The round 2 [scope evaluation](scope_evaluation.md) recommends **keeping as implemented**. It suggests a `dev` issue to define which collections workflow inputs accept.
- The original scope is kept as `..._alt_original_scope` ([alt](alts/original_scope.md)).

## Decisions for John

- **Behaviour change on a release branch.** Workflows or API calls that feed a collection of the wrong type into a typed tool input now fail. Before, they ran with the wrong structure. The in-tree example is `rename_based_on_input_collection.gxwf-tests.yml`, which fed a `list` with forward/reverse identifiers to `mapper2`'s `paired` input; its test data now uses `paired`. If that is too disruptive for 26.2, retarget to `dev`.
- **Base `release_26.2`.** The fix relies on `accepts()` from 26.1+, and as a validation tightening it fits the newest release best.
- **History is not squashed.** C was added in `0595e98bba3`/`c3f93b1ee0b` and removed in `66e7474a571`. Squash or split per the decompositions in the scope evaluation before opening a PR.

## Hardening

- [Test challenges](test_challenges_debrief.md): round 2 found a production gap. A `[None]` `when_values` exempted every subworkflow step; this is fixed and tested.
- [Codex](codex_review.md): round 1 found a batch-flag bypass, which was fixed. Round 2 found nothing.
- [Thermo-nuclear](thermo_nuclear_review.md): extracted the rejection policy helper.
- [Baseline refactor](baseline_refactor.md): `HistoryQuery` split moved ahead of the fix (round 1); no change in round 2.
- [Scope](scope_evaluation.md): keep.
- Reviews: [review 1](subagents/review_1.md) and [re-scope review](subagents/review_2_rescope.md).
- Round 1 debriefs are in `earlier_drafts/1/`.
- Check-branch: ruff, black and isort are clean on the changed files. mypy is clean for the changed modules after fixing one `union-attr` error (`069a65d9c3f`). One unrelated error remains in `managers/notification.py`.
- E2E, performance and screenshots: not applicable (server-side validation only; no queries or UI).

## Tests run

| Suite | Result |
|---|---|
| Unit: `test_data_collection_parameters.py`, `test/unit/workflows`, `test/unit/app/tools` | Pass |
| `test_workflows.py`, full, at HEAD | 476 passed, 1 failed |
| `test_tool_execute.py` | 151 passed, 1 skipped |
| `test_framework_workflows.py` | 88 passed |
| `test_tools.py`, collection subset (150, before the re-scope) and targeted reruns | Pass |

The `test_workflows.py` failure is `test_run_workflow_use_cached_job_with_sample_sheet`, which failed with "Could not convert toolbox to dictionary". That is cross-test server pollution under xdist, and the test passes in isolation. The same pollution produced the `test_tool_execute.py` errors when it shared a run with `test_workflows.py`.

## Process notes

- The Galaxy `git stash` list is shared across worktrees. My first stash was popped by the issue_24376 workhorse and restored. Both stash entries were my superseded draft and were dropped by SHA. I stopped using stash.
- The session scratchpad is shared by sibling workhorses. One Codex prompt was overwritten by another branch's prompt, and that result was discarded.
- The issue comment draft is in [issue_comment_draft.md](issue_comment_draft.md) and has not been posted.
