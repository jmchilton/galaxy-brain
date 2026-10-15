# Linkable URL for a step in the invocation view

There's no URL that opens an invocation with a particular step selected, so you can't send a colleague "look at step 7 of this run" or link to it from another page.

Add `?step=<order_index>` to `/workflows/invocations/:invocationId`: after the graph loads, that node is active and its step card is open. Clicking a node should update the query (replace, not push) so the address bar is always shareable.

Users want a stable address for every node in an analysis graph — to cite in notes, tickets and reports, and to jump between runs of the same workflow.

## Context

Small and independently useful, but two other drafts depend on it: rows in `step_runs_across_invocations.md` link to "the same step in that run", and `rerun_single_step_from_invocation.md` lands the user on the edited step of the new invocation.

## Proposed Approach

Handle the query in `WorkflowInvocationState.vue` / `InvocationGraph.vue` by setting the scoped `activeNodeId` once the graph is loaded; sync it back on node click. Order index is what the graph already keys on. A Selenium/Playwright assertion that the link opens the right step card.

## Alternative Approaches

Keying by step uuid survives workflow edits better but isn't what the graph uses internally, and an invocation is pinned to one workflow version anyway, so order index is unambiguous here.
