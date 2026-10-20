# issue_24175_imported_invocation_step_params

Status: re-scoped 2026-10-16; proposed `branches_implemented_needs_ci`. Head: `10eed573535e36265ca50b03e6338b389003caaa`. Fork CI pending.

Fixes [galaxyproject/galaxy#24175](https://github.com/galaxyproject/galaxy/issues/24175): `GET /api/invocations/{id}/request` (the **Rerun** button) returned a 500 for an imported invocation whose run had tool step parameters. Import copied the step parameter rows' raw step ids verbatim.

- Branch: `jmchilton/issue_24175_imported_invocation_step_params`.
- **Stacked on `issue_24178_subworkflow_step_params_export`** @ `b53a5d9fe8b` ([parent record](../issue_24178_subworkflow_step_params_export/index.md)). It reuses that branch's `WorkflowRequestInputParameter.resolve_step_parameters()` and `WorkflowStep.step_parameters_by_index`/`_by_id`. The stack base is `dev`. A `release_26.2` backport is John's call after merge.
- Original (pre-re-scope) scope: `jmchilton/issue_24175_imported_invocation_step_params_alt_original_scope` @ `00f0d68ec9d`.
- Worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/issue_24175_imported_invocation_step_params`
- Origin: item 2 of the `workflow_rerun_step_parameters` spike ([spike debrief](../workflow_rerun_step_parameters/spike_debrief.md)).
- [Implementation debrief](implementation_debrief.md) (final, after re-scope)
- [Re-scope debrief](implementation_rescope_debrief.md)
- [Initial implementation debrief](initial_implementation_debrief.md). Its unit-test and mock details were superseded by the test challenges.
- Reviews:
  - [Normal review](subagents/normal_review.md)
  - [Test challenges](test_challenges_debrief.md)
  - [Codex](codex_review.md)
  - [Thermo-nuclear](thermo_nuclear_review.md)
  - [Scope evaluation](scope_evaluation.md): keep scope as implemented.
  - First-round reviews and the earlier debrief: `earlier_drafts/1/`.

## Decisions

- This is one of four deliberate sibling branches: #24178 (parent), #24175 (this one), #24176 run-form seeding and #24177 client.
- Step rows without `order_index` (archives from older Galaxy, rows the exporter couldn't resolve) are dropped at import with a warning. `/request` still skips stale rows from invocations imported before the fix. Reviewers may prefer a 4xx that tells the user the step parameters were lost. That would also block the rerun.
- The `param_map` keyed-by-id bug was fixed in parent #24178. #24176 stays a sibling on #24178 (John). The "step params lost" notice is out of scope (John).

## Morning refresh — 2026-10-16

Attempted to carry the branch onto its rebased named parent, but the child rebase needed additional reconciliation. Aborted the isolated rebase and left the fork and original development worktree unchanged. Parent integration remains pending.

## Stack/CI repair — 2026-10-16

Base: `issue_24178_subworkflow_step_params_export` at `a171dbed4194a2de0e93b488381129c75a7dad1d`.

Integrated onto the new export-parent head. Preserved the legacy-archive helper and reused the parent's shared `WORKFLOW_SIMPLE` fixture instead of resurrecting the removed local definition. Verified that shared fixture is byte-for-byte identical to the old local fixture. Range-diff confirms all other child commits are unchanged. Archive fallback and rerun behavior remain as previously decided.

Validation: **8 API cases pass** against a fresh self-started Galaxy server, covering tool/subworkflow step parameters, imported archives, legacy-archive re-export and malformed keys. Isort and diff whitespace checks pass. No design decision was required.

Published `00f0d68ec9d2e2d90fbd191f8124ca3d335c4a96` to `jmchilton/issue_24175_imported_invocation_step_params`. Fresh fork CI is pending. Conflict resolutions or code fixes require a fresh human read; no prior SHA approval is carried forward. No PR was opened.

## Re-scope — 2026-10-16

John approved the first scope evaluation's in-branch expansion. Import now drops `type == "step"` rows without `order_index`, and the import test gains a nested subworkflow invocation case. The branch was rebased onto #24178 @ `8f358dbb341`, then `b53a5d9fe8b`, and its own resolver copy was dropped in favour of the parent's.

Reviews were rerun: normal, test challenges, Codex (no findings), thermo, and a second scope evaluation (keep as implemented). See the [re-scope debrief](implementation_rescope_debrief.md) and the [implementation debrief](implementation_debrief.md).

Pushed `301e92ededd` (force-with-lease). No PR was opened.

Coordinator rebased onto #24178 @ `57bf3eebd77` (docs-only expansion D: schema descriptions + `schema.ts`). No conflicts; `git range-diff` shows all 8 commits identical. Pushed `10eed573535` (force-with-lease). Tests not re-run for this docs-only parent change.

## TICK — 2026-10-20

Fork CI on current head: Client Unit Testing reds are the inherited controlled-checkbox failures (FormBoolean/FormCheck/FormOptionalText, "Expected input emission"), fixed on dev by #24198 (`form_checkbox_controlled_tests`, merged 2026-10-17), so they clear on the next rebase; unrelated. Playwright, Integration Selenium and startup jobs stopped at Restore client cache, so browser coverage never ran. Full reruns requested for Playwright and Integration Selenium; stays `branches_implemented_needs_ci`.
