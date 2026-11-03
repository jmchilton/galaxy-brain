Run via Claude Opus at high effort.

# Phase B: normal review

I reviewed Phase B's API-first rework against [phase_b_api_first.md](phase_b_api_first.md), [api_design.md](../api_design.md) and [REVIEW_FOCUS.md](../../../../../../agents/_shared/REVIEW_FOCUS.md). It is sound. The detached-copy `/request` subtraction behaves correctly against a real SQLAlchemy session, and no plainer design avoids more conflict with #24178. The dev-only lines are right. The conflict prediction checks out exactly. The moves are justified. The typing fixes are narrow.

I acted on one small finding in commit 1, `request_parameters_without_step_parameter_overrides`:

- The local `copy` shadowed the module's own `import copy`. It is renamed to `kept_parameter`.
- The `assert step_overrides` after the guard is now folded into the guard itself.

Behavior is unchanged. The fix is squashed into commit 1 on both branches, and the extraction branch was rebuilt from the new API series. Nothing pushed. No security-sensitive findings.

| Branch | New SHAs (bottom to top) |
|---|---|
| `workflow_step_parameter_overrides` over `46db8f9d5b6` | `7ecb000ea36` (API 1), `6ad285f7797` (API 2), `4f70c613dc3` (API 3), `5bfccb3e62f`, `800068383c9`, `51551ae6eef` |
| `workflow_step_parameter_overrides_api` over `origin/dev` `38dc259318c` | `4d81ed93b88`, `72b72c24954`, `c6a12d8598a` |

- The tree diff to the old heads (`31495d2ca9a` and `729fd71f33e`) is the 11-line fix only.
- `git range-diff` between the two API series shows commit 2 identical. Commit 1 differs only by the dev-only lines and the message paragraph that describes them. Commit 3 differs only in diff context.

## Not acted on

- **Replacing the detached ORM copies with pure-data subtraction.** It would have to change the `STEP_PARAMETERS` branch on both bases. On the stack, that means reworking #24178's `resolve_step_parameters()`. The anticipated conflict would then need new code to resolve, instead of "take #24178's side". The copies are the minimal-conflict design, and they are safe (verified below).
- **Typing `ConditionalWhen.inputs` at the source** (`grouping.py`) instead of the `_case_inputs` annotated-local boundary. That would be the principled fix for the `Any`. But it touches a shared module, likely surfaces mypy errors well outside this branch, and adds conflict surface. Worth a separate typing PR.
- **`_inner_step_parameters` in the API test.** It reads both `/request` formats, so one branch is dead once both the API PR and #24178 land. Whichever lands second can simplify it to the direct `{"1|mode": "careful"}` assertion. Keeping it lets either order land with no test change.
- **The extracted commit 1's message understates the `param_map` fix.** It says child invocations "recorded no step parameters". On `dev`, the child's own run config (`workflow_request_to_run_config(subworkflow_invocation)`) is rebuilt from those rows. So a child scheduled in a later iteration, after the parent's in-memory injected state is gone, could lose its inner step parameters too. I didn't confirm this with a test, so I left the message as is. Worth one sentence in the API PR description.

<details>
<summary>Full review</summary>

## 1. The `/request` rework (detached copies)

**Mechanics.** I checked them empirically against an in-memory SQLite Galaxy model (`mapping.init(..., create_tables=True)`), with `SAWarning` promoted to an error. I persisted a step row `{"a": 1, "b": 2}`, expired the session, reloaded the invocation and called the helper with overrides `{"0": {"a": 1}}`:

- the returned row is a new object, with value `{"b": 2}` and `workflow_invocation` set;
- it is not in the session: `session.new` and `session.dirty` are empty;
- `invocation.input_parameters` still has 1 row;
- after flush and commit, the DB holds 1 row with the original `{"a": 1, "b": 2}`.

There are no accidental flushes and no identity-map entries. The copy is never added and has no primary key.

**Counterfactual.** Plain `WorkflowRequestInputParameter(..., workflow_invocation=inv)` does fire the backref: the invocation's collection grows to 2 in memory. SQLAlchemy 2's disabled backref cascade keeps it out of the DB, but it emits `SAWarning: ... add operation along 'WorkflowInvocation.input_parameters' will not proceed` at flush. Anything later in the request that reads `input_parameters` would also see the copy. So `set_committed_value` is necessary, and the code comment describes exactly why.

**Export/import paths.** `request_parameters_without_step_parameter_overrides` has one caller, the `/request` serializer. Model store export serializes `invocation.input_parameters` directly (`WorkflowInvocation._serialize`), so it never sees a copy and exports the stored rows unchanged. #24176's `recover_step_parameters` reads the stored rows too, and it should: the expanded-form rerun is seeded with every recorded value. On the stack, `resolve_step_parameters()` on a copy walks `copy.workflow_invocation.workflow.steps_by_id`, which is the persistent invocation.

**Stored-form equivalence.** `stored_step_parameter_overrides` relies on `flatten_tool_state` producing the same flat names the walker writes into `param_map`. I traced each shape:

- sections and conditionals give `a|b`;
- repeat instances give `name_i|`, and empty instances give nothing;
- a switched case's filled defaults go through the same walker visit;
- multiple-value lists are leaves on both sides;
- `[]` is a leaf on the flatten side and absent from the rows, so it is a no-op.

JSON round-trips keep `==` equality for ints, floats and booleans. Step rows store values before validation, as sent, so they compare equal.

**Alternatives.**

- *Pure-data subtraction returning dicts.* The serializer's `STEP_PARAMETERS` branch would have to consume them. On `dev` that is easy. On the stack it means splitting `resolve_step_parameters()` (load, then re-key) so the subtraction can sit between the two steps, which edits #24178's own code. The extracted commit already conflicts with #24178 in that branch because of the `None` guard. That conflict now resolves by taking #24178's side, which I verified (below). With pure data, it would need hand-written merged code.
- *Phase B's rejected options* (in-branch subtraction, post-loop dual-format subtraction) are correctly rejected, for the reasons in its debrief.
- *Not storing override values in step rows at all.* Rejected in the Phase A review: scheduling and #24176's recovery read the rows.

I found nothing simpler and clearly better.

**Small code points.**

- Fixed: `copy` shadowed `import copy` (used by `apply_step_parameter_overrides`), and the post-guard `assert` was folded into the guard.
- A copy is built even when `_without_overrides` removes nothing. Override values are always merged into the row they target, so that case doesn't occur in practice. Not worth a branch.

## 2. The extraction branch's dev-only lines

I recomputed them as `git diff <clean pick of commit 1 onto origin/dev> <extracted commit 1>`. They are exactly the two changes.

- **`param_map.get(step.id)`.** Correct. On `dev`, `_normalize_step_parameters` keys `normalized_param_map[step.id]`, and `WorkflowModuleInjector.inject_all` reads `param_map.get(step.id)`. The `.get(step.order_index)` was a plain bug. The stack head (`46db8f9d5b6`, `run_request.py:616`) has the identical line, so it merges cleanly. The extracted commit message understates the fix (above).
- **The `None` guard.** Correct and minimal. Both bases leave `WorkflowInvocation.input_parameters` as an untyped `relationship(...)`, so the old loop variable was `Any`. The helper's typed return makes mypy flag `int(str | None)` and `json.loads(str | None)`.
  - Before: a `None` name raised `InconsistentDatabase` through the caught `TypeError`, and a `None` value raised an uncaught `TypeError`. Now both raise `InconsistentDatabase` up front.
  - A non-numeric name still raises `ValueError`, as before.

**Anticipated conflict: accurately described.** `git merge-tree` of the extraction branch:

- with `jmchilton/issue_24178_subworkflow_step_params_export` (`57bf3eebd77`) conflicts only in `services/invocations.py`. The hunk is the dev-side guard against #24178's `resolve_step_parameters()` block.
- with the stack head `46db8f9d5b6` conflicts in the same file plus `galaxy_test/base/populators.py`, which is the stack's own drift.

Taking the stack side of the `invocations.py` hunk gives a file byte-identical to the full branch's `HEAD:services/invocations.py`.

## 3. Pure moves

In the final series none of these show up as moves. They are additions placed away from the stack's edited lines.

- The `STEP_PARAMETER_OVERRIDES_*` constants sit after `ReplacementParametersField`.
- The fixtures sit before `WORKFLOW_KEEP_SUCCESSFUL_DATASETS`.
- `_tool_step_run_model` and `_subworkflow_run_steps` sit before `_workflow_resource_parameters`.

Each placement is reasonable on its own merits, so a reader of the PR series sees no churn.

- **`_tool_step_run_model`** is a true extract-method that `_subworkflow_run_steps` reuses.
- **Inner `step.module`** (`assert step.module is not None` in `_subworkflow_run_steps`) is populated: `WorkflowModuleInjector.inject` recurses into subworkflow steps.

## 4. Typing fixes in `step_parameter_overrides.py`

They are narrow, with no `cast` and no `Any` escapes.

- `isinstance(module, ToolModule)` is real narrowing, and it also yields a better error for non-tool modules.
- `assert test_param` narrows `Conditional.test_param: ToolParameter | None`.
- The annotated locals (`case_index: int`, `overrides: StepParameterOverrides`, `inputs: ToolInputsT`) are the standard `warn_return_any` boundary for untyped upstream returns: `get_current_case`, `json.loads`, and the untyped `ConditionalWhen.inputs`. Typing `ConditionalWhen.inputs` at its source is the better long-term fix, deferred (above).

mypy, run from `lib/` with `--config-file ../mypy.ini` (the module is strict and not red-listed), is clean on both branches. The one error is the unrelated `galaxy/managers/notification.py:862`.

## 5. Commit messages and granularity

The series reads well as a PR series:

- three self-contained API commits, each with its API test and its `schema.ts` slice;
- the client feature;
- the "rerun with this changed" action;
- E2E, with selectors in `navigation.yml`.

The messages explain what changed and why, and they mention the shape and the rejections. Commit 1's extracted message has an extra paragraph for the dev-only lines, which is appropriate. A standalone E2E commit is fine for Galaxy.

## REVIEW_FOCUS spot checks

- Imports are at top level. `WorkflowRequestInputParameter` is a runtime import because the helper constructs it, while the other model types are behind `TYPE_CHECKING`. That is justified.
- No weakened tests. `_inner_step_parameters` makes an assertion format-independent and still pins the subtraction: `threshold` is gone from the parent's subworkflow row and `mode` is kept.
- No obvious comments were added.

</details>

## Tests

Both branches were run after the fix.

| Check | `workflow_step_parameter_overrides_api` @ `c6a12d8598a` | `workflow_step_parameter_overrides` @ `51551ae6eef` |
|---|---|---|
| `test_workflow_step_parameter_overrides.py` + `test_jobs.py -k parameters_display` | **13 passed** | **13 passed** |
| Doctest, `step_parameter_overrides.py` | 1 passed | 1 passed |
| mypy from `lib/` (`--config-file ../mypy.ini`) on the changed modules | clean except the unrelated `notification.py:862` | same |
| ruff, black, isort on all changed `.py` files | clean (10 files) | clean (11 files) |

The client is untouched, so vitest and E2E weren't rerun. I didn't rerun the 6 known gxformat2-pin failures on the extraction branch either. The worktree is back on `workflow_step_parameter_overrides`, clean.
