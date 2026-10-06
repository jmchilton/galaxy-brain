# #22534 — Workflow upgrade feedback: plan

Issue: https://github.com/galaxyproject/galaxy/issues/22534 ("[Request] Feedback on potential Workflow Updates", Sch-Da, assigned jmchilton).

## Problems in the trench coat

- **A. Upgrade never reports version changes.** `_apply_upgrade_tool` (`lib/galaxy/workflow/refactor/execute.py`) overwrites `step.tool_version` with latest *before* re-injecting, so `ToolModule.from_workflow_step`'s `version_changes` (fires only on load-time substitution) sees a match and emits nothing. `tool_version_change` enum exists but upgrades never produce it. Enshrined by `test_tool_version_upgrade_no_state_change` (`messages == 0`). Same gap for subworkflow upgrades.
- **B. Editor gives no feedback.** `RefactorConfirmationModal.vue` `onDryRunResponse` executes straight away when no messages; `Index.vue` `onRefactor` discards execute response. "Nothing to do" ≡ "did stuff". Modal framed as "Potential Issues" even for benign changes.
- **C. No-op upgrade still saves a new workflow version.**
- **D. No way to ask "does this need updating?"** without clicking Upgrade — only per-step "Newer version available" badge (`FormCardSticky.vue`). Once A lands, a dry-run `upgrade_all_steps` is the detection answer.
- **E. (unverified side bug)** `ToolCard.onNewerVersionClick` → `routeToTool()` inside editor step form may navigate away.

## Root abstraction problem

Same facts reach users through three channels, all fed by untyped module-layer strings (`module.version_changes: list[str]` w/ HTML, `step.upgrade_messages: dict`):

| Surface | Field | Shape |
|---|---|---|
| Refactor API | `action_executions[].messages` | typed `RefactorActionExecutionMessage` (sparse union keyed by `message_type`) |
| Editor load (`_workflow_to_dict_editor`) | `upgrade_messages[step]` | untyped dict; version changes joined under module *name* as fake input key |
| Run form (`_workflow_to_dict_run`) | `step_version_changes` + `has_upgrade_messages` | flat `list[str]` w/ HTML |

Decision: **no new `step_changes` field.** Generalize the existing `RefactorActionExecutionMessage` into the single structured step-change record and emit it everywhere.

## Design

- Add optional fields to the message model: `from_tool_id`, `from_tool_version`, `to_tool_id`, `to_tool_version`, `from_content_id`, `to_content_id` (subworkflow). Same sparse-field pattern as `output_label`.
- Add `cause: requested | forced`. Requested = user asked (upgrade actions). Forced = substitution, dropped connection/output, state default. Severity derivable from cause.
- `tool_version_change` covers both upgrade (requested) and load-time substitution (forced).
- Module layer produces structured records; legacy strings rendered from them for compat.

## Branches (linear stack, 3 PRs; finish branch 3 before opening any PR)

1. **`issue_22534_upgrade_changes`** (base `dev`) — backend.
   - Schema: new fields + `cause` enum; default `forced` for existing message types.
   - `_apply_upgrade_tool` / `_apply_upgrade_subworkflow` capture old id/version/content_id, emit `tool_version_change` (`cause=requested`) only when changed.
   - Substitution messages in `_inject` carry structured from/to + `cause=forced`.
   - Regenerate client API schema (`make update-client-api-schema`).
2. **`issue_22534_upgrade_summary`** (base branch 1) — client.
   - Upgrade always dry-runs → result shown: empty → "All tools up to date", no execute (fixes C for editor); changes → grouped per-step table (step, old → new) + forced messages; Proceed.
   - Confirmation rule: any `forced` → warn; requested-only → summary.
   - Retitle modal. Vitest in `RefactorConfirmationModal.test.ts`; maybe Playwright via existing `upgrade_all` selector.
3. **`issue_22534_step_change_unify`** (base branch 2) — editor-load + run-form channels onto shared model.
   - Module layer emits structured records; `_workflow_to_dict_editor` / run dict expose them; `StateUpgradeModal` + run-form version warning render the shared type. Keep legacy fields until consumers migrated.

## Tests (red → green)

Branch 1:
- Integration (`test/integration/test_workflow_refactoring.py`): `test_tool_version_upgrade_no_state_change` → assert exactly one `tool_version_change`, `cause=requested`, 0.1 → 0.2 (replaces `messages == 0`).
- Dry-run `upgrade_all_steps` on already-latest workflow → no messages.
- Extend `test_upgrade_all_steps` (toolshed `compose_text_param`) to assert id+version change; subworkflow content_id change.
- API (`lib/galaxy_test/api/test_workflows.py:~1224`): existing exact-count unpacking filtered by `message_type == tool_state_adjustment` (existing assertions preserved); new assertion on version-change message.

Branch 2: vitest for up-to-date / requested-only / forced paths.
Branch 3: unit/API tests on editor + run payloads for structured records.

Fixtures: reuse `multiple_versions`, `multiple_versions_changes` test tools; no new tools.

## Costs

- More entries in `messages` where there were none → consumers treating any message as a warning see more; `cause` lets them filter.
- Count-based test assertions updated to filter by type (assertions kept, not weakened).

## Unresolved questions

- Rename/alias `RefactorActionExecutionMessage` → e.g. `WorkflowStepChange` in branch 3?
- ~~Backend no-op upgrade skip-save for API callers, or client-only?~~ Client-only here; backend split out to #23762.
- Outdated indicator in workflow list/canvas — follow-up issue?
- Verify E?
