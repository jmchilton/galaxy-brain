# Review branches `pr_268_review_0` (gxformat2) and `pr_192_review_1` (galaxy-tool-util-ts)

These branches carry the cross-language fixes for verified_review P2 1, P2 2 and P3 1. `pr_268_review_0` is based on gxformat2#268 head `0922644` (worktree `~/projects/worktrees/gxformat2/branch/pr_268_review_0`). `pr_192_review_1` is based on `fee94b34` and is separate from `pr_192_review_0`. Each TS commit mirrors a gxformat2 commit, and the synced fixtures and expectations are byte-identical to gxformat2.

The base copies of `lint_native.yml` and `lint_format2.yml` already matched `0922644`, so whole files were copied over. `catalog.yml` isn't synced to TS.

Native lint now recurses into subworkflows with `ctx.child("steps").child(key).child("subworkflow")`. The duplicate-label rule reports at a per-step child context instead of using an absolute string. As a result:
- The nested duplicate points at `/steps/0/subworkflow/steps/1/label`.
- `NativeStepKeyNotInteger` gets the same prefix.
- Other nested native messages now default to the subworkflow's pointer instead of `""`.

The nested pointer assertion went red first in both languages. The Format2 fixtures passed on their first run, because the existing behaviour was already correct. Messages are unchanged.

gxformat2:
- `5a453c6` Point nested duplicate step label lint at subworkflow step: child-context recursion in `lint.py`. Adds an exact `value` and `json_pointer` to `test_lint_native_duplicate_step_label_in_subworkflow` (P2 1, P3 1).
- `9548c45` Cover Format2 default input label and subworkflow label lint: adds three Format2 fixtures with catalog entries and exact-message expectations, and switches `test_lint_duplicate_step_label_list` to an exact `value` (P2 2, P3 1). The fixtures are:
  - `synthetic-lint-duplicate-default-input-label`
  - `synthetic-lint-duplicate-step-label-in-subworkflow`
  - `synthetic-lint-step-label-reused-in-subworkflow`

galaxy-tool-util-ts:
- `ffe56bba` Point nested duplicate step label lint at subworkflow step: the same `lint.ts` change, plus the synced `lint_native.yml`.
- `96f3ec39` Cover Format2 default input label and subworkflow label lint: syncs the three fixtures and `lint_format2.yml`.
