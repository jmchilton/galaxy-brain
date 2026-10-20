# issue_24176_rerun_full_form_prefill

Fixes [galaxyproject/galaxy#24176](https://github.com/galaxyproject/galaxy/issues/24176): a workflow rerun that opens (or is switched to) the expanded run form ignored the original run and started from the workflow's saved values.

- Branch: `jmchilton/issue_24176_rerun_full_form_prefill`, **stacked on `issue_24178_subworkflow_step_params_export`** ([parent record](../issue_24178_subworkflow_step_params_export/index.md)), which is based on `dev` (88127f42979).
- Worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/issue_24176_rerun_full_form_prefill`
- Origin: spike `workflow_rerun_step_parameters` item 4 ([spike debrief](../workflow_rerun_step_parameters/spike_debrief.md)).
Status: `branches_implemented_needs_ci` (re-scope complete, READY). Head: `ced412c6248`, on final parent `57bf3eebd77`. Original scope kept as `jmchilton/issue_24176_rerun_full_form_prefill_alt_original_scope` (`d10e8cfbf41`).
- [Implementation debrief](implementation_debrief.md) · [Re-scope debrief](implementation_rescope_debrief.md) · [Re-scope normal review](subagents/rescope_normal_review.md) · [Test challenges](test_challenges_debrief.md) · [E2E polish](polish_e2e_tests_debrief.md) · [Codex review](codex_review.md) · [Thermo-nuclear review](thermo_nuclear_review.md) · [Scope evaluation](scope_evaluation.md) · [Screenshots](screenshot_debrief.md) (local `screenshots/`) · [Initial implementation debrief](initial_implementation_debrief.md)
- Pre-re-scope process docs in [earlier_drafts/1](earlier_drafts/1/): [Test challenges](earlier_drafts/1/test_challenges_debrief.md) · [E2E polish](earlier_drafts/1/polish_e2e_tests_debrief.md) · [Codex review](earlier_drafts/1/codex_review.md) · [Thermo-nuclear review](earlier_drafts/1/thermo_nuclear_review.md) · [Scope evaluation](earlier_drafts/1/scope_evaluation.md) · [Screenshots](earlier_drafts/1/screenshot_debrief.md) · [Implementation debrief](earlier_drafts/1/implementation_debrief.md)

## Decisions

- One of four deliberate sibling branches: #24178 (parent), #24175 import re-keying (sibling), #24176 (this), #24177 forced expanded form + simple-form prefill (stacks on this).
- Server seeding (`GET /api/workflows/{id}/download?style=run&invocation_id=…`), per the issue's proposed approach. Client merge of the request export kept as a reviewer question.
- Out of scope: object stores in the expanded form; latent `param_map` keyed-by-id lookup in `workflow_run_config_to_request` (noted, not fixed); forcing the expanded form (#24177); import re-keying (#24175).
- Coordinator: no branch in the stack may regress alone, so the minimal `rerunHasStepParameters` guard lives here (expanded form when the export has tool step params); message/hidden toggle/simple-form prefill stay in #24177.
- Overlap with #24175's `resolve_step_parameters()`: `recover_step_parameters()` shaped to delegate to it; whichever lands second reconciles (see implementation debrief).
- E2E rerun test lives here; #24177's rerun test should extend it, not duplicate.

## Morning refresh — 2026-10-16

Attempted to carry the branch onto its rebased named parent, but the child rebase needed additional reconciliation. Aborted the isolated rebase and left the fork and original development worktree unchanged. Parent integration remains pending.

## Stack/CI repair — 2026-10-16

Base: `issue_24178_subworkflow_step_params_export` at `a171dbed4194a2de0e93b488381129c75a7dad1d`.

Integrated onto the new export-parent head. Preserved `_find_run_input` and reused the identical shared `WORKFLOW_SIMPLE` fixture. Range-diff confirms the other nine child commits are unchanged. Retains server-side seeding and the previously approved sibling split; no restack onto the import sibling and no scope expansion.

Validation: **11 API cases pass** against a fresh self-started Galaxy server, covering seeded inputs, conditional cases, workflow parameters, subworkflows, purged datasets, imported invocations, access checks and inherited malformed-key behavior. The final child run-form suite passes **83 tests in 12 files**, including this branch's client behavior. Isort and diff whitespace checks pass. No design decision was required.

Published `d10e8cfbf414a35f3e3362406f1dc190c049d206` to `jmchilton/issue_24176_rerun_full_form_prefill`. Fresh fork CI is pending. Conflict resolutions or code fixes require a fresh human read; no prior SHA approval is carried forward. No PR was opened.

## Re-scope — 2026-10-16

John approved a modest expansion ([re-scope debrief](implementation_rescope_debrief.md)):
- `recover_step_parameters()` delegates to the parent's `resolve_step_parameters()`.
- A `step_effective_label` run-step field is preferred by `rerunInputValue`. It only matters for legacy input steps from old Galaxy, and it is `null` for duplicated names.
- `withRerunValues` is exported from `model.js` for #24177.
- Imported-invocation seeding assert is deferred to whichever of #24175/#24176 lands second.

Rebased onto parent `b53a5d9fe8b` and pushed `88d38744136`.

Phase 2 reran the after-plan process on final parent `57bf3eebd77`:
- **Codex** found that `/request` collapsed same-named legacy inputs into one key. Fixed: `Workflow.request_input_labels()` is now one policy shared by `recover_inputs()` and the run form.
- **Thermo-nuclear:** `rerunInputValue` looks a step up by index when its `step_effective_label` is null.
- **Second scope evaluation:** keep as implemented.
- **Screenshots** were regenerated.

Head `ced412c6248`. The PR text should call out the `/request` change for legacy duplicate-named inputs. #24177 must restack, because `rerunInputValue` changed after its base.

## TICK — 2026-10-20

Fork CI on current head: Client Unit Testing reds are the inherited controlled-checkbox failures (FormBoolean/FormCheck/FormOptionalText, "Expected input emission"), fixed on dev by #24198 (`form_checkbox_controlled_tests`, merged 2026-10-17), so they clear on the next rebase; unrelated. Playwright, Integration Selenium and startup jobs stopped at Restore client cache, so browser coverage never ran. Full reruns requested for Playwright and Integration Selenium; stays `branches_implemented_needs_ci`.
