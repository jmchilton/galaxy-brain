# Scope evaluation

**Recommendation: modest expand.** Keep the fix and add a small shared helper for the `__new_primary_file_` naming convention in `interactor.py`, e.g. `discovered_output_prefix(name)` or a constant plus `is_discovered_output(name)`. Route `split_declared_job_outputs` and `verify_primary_datasets` (lines ~461 and ~478, which build the same prefix by hand) through it. This adds about 10 lines, matches the default lean toward a modest expansion, and makes the convention one reusable piece instead of a third hard-coded string. Leave server/API changes and the `populators.py` callers out of scope.

The branch is about 30 lines of non-generated code, so this report has no decomposition section. The two existing commits, baseline refactor then fix, already split cleanly.

No review debrief (`codex_review.md`, `test_challenges_debrief.md`, `baseline_refactor.md`) raised scope.

## As implemented

The fix extracts `split_declared_job_outputs` and makes it skip `__new_primary_file_*` outputs on the tool-request (`use_legacy_api: never`) path. With that, `expect_num_outputs` no longer counts discovered datasets when the job finished before its outputs were listed. A unit test covers it.

| Pros | Cons |
|---|---|
| Tiny, targeted, and easy to backport to `release_26.2` | The prefix string is now hard-coded in three places in one file |
| Red-to-green unit test | No functional test reproduces the race. It is timing-dependent, so that is acceptable |
| Legacy and non-legacy paths now produce the same output map | |

## Modest expand: shared discovered-output helper (recommended)

This scope is the same fix plus one helper or constant for the `__new_primary_file_{name}|{designation}__` convention. The helper is used by `split_declared_job_outputs` and `verify_primary_datasets` (the prefix match and the exact designation match).

| Pros | Cons |
|---|---|
| One definition of the convention for the verify module | Touches `verify_primary_datasets`, which is otherwise not involved in the bug |
| Reviewers favour building the reusable piece over a third literal | Needs a small unit test, or reuse of the existing primary-dataset tests |
| Still small and safe for a release branch | |

<details>
<summary>Details</summary>

The server-side source of the name is `lib/galaxy/model/store/discover.py`. `tool_util` deliberately doesn't import the model layer, so the helper should live in `tool_util/verify` and should not be shared with the server.
</details>

## Wider expand: also harden `populators.py` job-output consumers

This scope also applies the helper to `DescribeToolExecution.with_output` in `lib/galaxy_test/base/populators.py`. Indexing by integer (`outputs[output]`) can return a discovered dataset depending on ordering.

| Pros | Cons |
|---|---|
| Removes a similar latent ambiguity in API test helpers | There is no observed failure. The integer index is also used against completed jobs on purpose, and changing it could alter what existing tests assert |
| | A different module and audience (API tests rather than the tool test framework) |

## Server-side: exclude discovered outputs from `jobs/{id}/outputs`

This scope would change the API so it lists only declared outputs, or add a filter parameter.

| Pros | Cons |
|---|---|
| Fixes the race for every client | Changes API behaviour that `verify_primary_datasets` and others rely on |
| | Too large and risky for `release_26.2`. Not warranted |

## Contract

The only possible contraction is dropping the extraction refactor and inlining the skip. That gains nothing, because the refactor is what makes the fix unit-testable.
