# Checklist evaluation

Fresh subagent, 2026-10-15, at `d4508fffab5` against `origin/release_26.1`. GENERAL + WORKFLOW_RELATED. The human-read item is left for John.

**Blocker found and fixed:** the guard read `self._workflow_scheduling_manager`, which only exists on `dev` (added by `81f8ab01266`, "Hand queue_invoke the scheduling manager"). After the rebase onto `release_26.1`, any non-empty `scheduler`, `default` included, would have raised `AttributeError` (500). Fixed in `5e768eb6a3b` by reading `trans.app.workflow_scheduling_manager`, the object `queue_invoke` already uses. The same commit drops the now-redundant reassignment of `workflow_scheduler_id` inside the run-config loop. Re-verified on the 26.1 base:
- Red, with the base service file: `None` and `default` pass, `not_a_scheduler` fails with a 200 and an invocation in state `new`.
- Green: 3 passed in 26.21s.
- Merges cleanly into `dev`.

Strengthening later added an `""` case to the test (`56a8ac23045`, 4 passed).

The other items passed. Their answers are in [pr_description.md](pr_description.md) under "John's Checklist".

Other findings:
- **Entry points.** None bypass the guard. `queue_invoke` is only called from `WorkflowsService.invoke_workflow`, which the API, WES, agent operations and landing all use. Subworkflows inherit the parent's scheduler, which has already been checked.
- **Empty string and null.** Both are falsy, skip the guard, and fall back to the default in `queue()`. That matches existing behavior.
- **`workflow_schedulers` vs `active_workflow_schedulers`.** Only active schedulers are polled, so a registered passive scheduler would still hang. Core ships no passive plugin, so checking the full registry is defensible. Not changed.
- **Who hits it.** There is no user report, and #20900 doesn't mention schedulers. The evidence is code reading plus the red test.
- **Alternative.** Validating in `WorkflowSchedulingManager.queue()` would cover every caller. Today the service is its only caller, so this is a style choice.
- **Message.** Could list the valid IDs. Not changed: scheduler IDs come from admin config and aren't otherwise exposed.
