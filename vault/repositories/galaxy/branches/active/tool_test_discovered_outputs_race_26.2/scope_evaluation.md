# Scope evaluation (second, post-rescope)

**Recommendation: keep as implemented.** The approved modest expansion has landed. `DISCOVERED_OUTPUT_PREFIX`, `discovered_output_name` and `is_discovered_output` are now the only `__new_primary_file_` definitions in `tool_util` and `galaxy_test`, and the race fix goes through them. The remaining candidates are either a cross-layer refactor of Galaxy core, which belongs on `dev`, or API-helper changes with no observed failure. Neither is a modest expansion for `release_26.2`. Note the core follow-up in the PR body, as `subagents/rescope_review.md` suggests.

The branch has about 50 changed lines across 3 files, which is under 100, so there is no decomposition section. The three commits already split cleanly: the extraction refactor, then the shared helpers, then the fix.

## As implemented

The branch has three commits. The first extracts `split_declared_job_outputs`. The second adds the shared discovered-output name helpers and uses them in `verify_output_dataset`, `split_declared_job_outputs` and `galaxy_test/selenium/framework.py`. The third skips discovered datasets when resolving tool request outputs, so `expect_num_outputs` stops counting them during the race.

| Pros | Cons |
|---|---|
| Fixes the reported race, and the earlier eval's expansion is fully absorbed | Galaxy core (`output_collect.py`, `store/discover.py`, `model/__init__.py`) still hard-codes the name format |
| One definition of the naming convention across the test framework | No functional test for the race. It is timing-dependent, so that is acceptable |
| Small and easy to backport | |

## Expand: unify the name format with Galaxy core via `galaxy.util`

This scope would move the helpers to `galaxy.util`, so that `tool_util`, `output_collect.py`, `store/discover.py` and `model/__init__.py` all share one definition.

| Pros | Cons |
|---|---|
| A true single source of truth | Touches the server job-output collection path, which is unrelated to this bug |
| Reviewers like reusable pieces | Not modest. It is a cross-layer refactor, and the earlier eval and the rescope review both put it on `dev` |

## Expand: harden `populators.py` job-output consumers

This scope would use `is_discovered_output` in `DescribeToolExecution.with_output`, where indexing by integer could return a discovered dataset.

| Pros | Cons |
|---|---|
| Removes a similar latent ambiguity | No observed failure. The integer index is used on purpose against completed jobs, and changing it could change what existing tests assert |
| | A different audience (API tests) |

## Server-side: filter discovered outputs from `jobs/{id}/outputs`

| Pros | Cons |
|---|---|
| Fixes the race for every client | Changes an API contract that `verify_primary_datasets` and others rely on. Too risky for a release branch |

## Contract: revert to the original scope (`alts/original_scope.md`)

| Pros | Cons |
|---|---|
| A smaller diff | Undoes an expansion the user approved, and brings back hard-coded strings in three places |
