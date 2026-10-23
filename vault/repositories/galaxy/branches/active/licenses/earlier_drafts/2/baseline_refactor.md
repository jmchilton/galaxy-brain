# Baseline refactor: licenses

The baseline now has two more pre-feature commits, and the access-contract commit is tightened. One is `Workflow.walk_tool_steps` plus the `get_all_tools` rewrite. The other moves the missing-tools check ahead of `build_workflow_run_configs`. The final tree is identical to `98ed9b8ee36`.

- Old head: `98ed9b8ee36`. New head: `270dafaf60c`. Backup ref: `backup/licenses_pre_baseline_refactor`. Not pushed.
- Base is still `origin/dev` `0073b5e9224`. The branch went from 16 to 18 commits, and "Baseline tests" is still first.
- `git diff 98ed9b8ee36 HEAD` is empty.

## New commit order

1. `28a755a567a` Baseline tests for require_login tool execution (unchanged)
2. `c219a1e005a` Extract tool execution preconditions from DefaultToolAction access check (**changed**)
3. `a2b80ee3472` Add Workflow.walk_tool_steps; use it for get_all_tools (**new**, moved out of the workflow-invocation commit)
4. `cc7b399a749` Check workflow tools are installed before building run configs (**new**, moved out of the workflow-invocation commit)
5. Commits 5 to 18 are the feature phases, and `git range-diff` maps them 1:1. Two of them changed:
   - The trees of commits 5 to 9 carry the moved hunks earlier.
   - The commit messages of 9 (job creation) and 10 (workflow invocations) lost the sentences that moved.

## What moved and why

**Commit 2 evaluation.** It is not a pure refactor, and that is deliberate. It turns the 500 `AssertionError` into a structured 403009 with a new error code and message. All of that is generic access behavior, with no license logic, so it belongs before the feature. Splitting it into "extraction that still asserts" plus "structured error" would be churn: the abstraction exists to produce that error. Two related hunks from the job-creation commit now live in commit 2:
- **`validate_tool_for_running` (POST /api/tools)** now calls `check_preconditions(..., [TOOL_ACCESS_PRECONDITION])` instead of raising `ItemAccessibilityException("Tool not accessible.")`.
  - This is the same access-contract change. The job-creation message flagged it ("Running an inaccessible tool now returns the structured 403009").
  - No test pins the old text. The new 403009 access refusal is covered only indirectly, through license-tool tests added later (`test_anonymous_tool_run_requires_login` in `test_license_acceptance.py`, which posts to `/api/jobs`). No test covers a non-license inaccessible tool.
- **`UnmetPrecondition` is created in `galaxy.schema.schema` from the start.** Before, commit 2 created `schema/tool_preconditions.py` and the job-creation commit deleted it again.
  - At commit 2 the kind is only `Literal["access"]`. The job-creation commit adds `"license_agreement"`.
  - No API model references it at commit 2, so `schema.ts` is unaffected.

**`Workflow.walk_tool_steps` + `get_all_tools`** (commit 3, with `test/unit/workflows/test_walk_tool_steps.py`). This is a standalone improvement, and it changes behavior a little, as the commit message says:
- `get_all_tools` now dedupes across nesting levels. Before, subworkflow results were appended without a check.
- Steps whose subworkflow is `None` are skipped instead of being recursed into.
- Recursive subworkflows terminate.
- The consumers are the invoke missing-tools check, the `missing_tools` list in the `GET /api/workflows?missing_tools=true` index, and the `agents/operations.py` IWC operation (its unit test mocks `get_all_tools`). All of them want a unique list. The index's `missing_tools` no longer repeats an id that a parent workflow and its subworkflow share.

**Missing-tools check before `build_workflow_run_configs`** (commit 4). This is a dev bug fix, not a refactor.
- `build_workflow_run_configs` commits `new_history_name` histories, so a refusal for missing tools left an empty history behind.
- Side effect: when a request has both missing tools and unbatched batch parameters, the missing-tools error now wins.
- Only the "Refuse before build_workflow_run_configs" comment moved here. The license check and its comment stay in the feature commit.
- **Coverage gap:** no test pins "missing tools + `new_history_name` creates no history". It wasn't added, to keep the final tree identical. It is a good red-to-green follow-up: an API test in `test_workflows.py`.

## Not extracted

- `normalize_newlines`, `Tool.parse_license_agreements`: both are introduced by the feature, and there is no base code to refactor.
- `ToolExecutionContext`: every field is license-specific (one-time hashes, authorization cache).
- `UsesApiTestCaseMixin._different_new_user`: only license tests use it. Pre-landing it would add unused infrastructure. The branch's own `test_scripts_pgcleanup.py` builds a random email by hand, but it also needs that email for `_setup_user`, so the helper does not fit there.
- `ToolRequestStateMessage.err_code`/`unmet` and the `jobs.py` state_message change: these are generic, but moving them would need `schema.ts` regenerated in an earlier commit, which is churn.
- `ToolAction.checks_preconditions`, the `__init_subclass__` rule and the per-submission precondition check in `execute.py`: the license work motivates all of them, and they are tied to `ToolExecutionContext`.

## Validation

- Every new commit was checked against its original with `git diff <orig> <new>`:
  - Commit 2 differs from the original commit 2 only in the two moved hunks.
  - Commits 5 to 8 differ only in the moved hunks plus W (walk_tool_steps) and R (the reorder).
  - Commit 9 differs only in W and R.
  - Commits 10 to 18 are byte-identical to the originals.
  - One cherry-pick of the workflow-invocation commit auto-merged wrongly: `build_workflow_run_configs` ended up duplicated. It was resolved by taking the original file, and the tree check confirms the result.
- Ruff 0.17.1 and `py_compile` on the changed .py files at each of commits 2 to 9: clean. Pre-commit hooks (black, ruff, flake8, prettier) ran only on the hand-built or amended commits (2, 3, 4, 9, 10), and passed. Cherry-picked commits got no hooks.
- Import check of `services.workflows` and `services.tools` at each of commits 2 to 9: OK.
- Unit tests (the branch's `test/unit` files present at each commit):

| Commit | Passed |
|---|---|
| 2 | 31 |
| 3 | 34 |
| 4 | 34 |
| 5 | 229 |
| 6 | 243 |
| 7 | 258 |
| 8 | 258 |
| 9 | 260 |

- The final tree is unchanged, so mypy, the API and integration tests, and the client tests were not rerun. The results in `thermo_nuclear_review.md` still apply.
- Dev's existing `lib/galaxy_test/api/test_workflows.py` was not run over commits 3 and 4. They change `get_all_tools` dedupe and error precedence, so CI is the first full check.
- No security issues were found.
