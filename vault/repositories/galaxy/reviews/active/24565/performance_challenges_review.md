# Performance challenges review: PR #24565

- Profile: [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md)
- Model: Claude Opus 5.5 (`claude-opus-5-5`)
- Effort: medium
- Reviewed commit: `fc477492afec572160601cd5d60e8d2d0f5b1be6`
- Debrief: [performance_challenges_debrief.md](performance_challenges_debrief.md)

## Summary

From a performance point of view, this PR is an improvement. On the My workflows tab, `show_shared=false` removes the `OR` against the share table, the `galaxy_user` join, and the `stored_workflow_user_share_connection` outer join from both the page query and the `Total_matches` count query. It also stops sending shared rows that the client would only discard. It adds no requests, polling, or per-row work. This analysis comes from reading `index_query`. It was not measured; the debrief has a measurement plan.

No P1 or P2 findings.

## Findings

### P3 1: My-tab client owner filter and user-loaded gate are now redundant

`client/src/components/Workflow/List/WorkflowList.vue` still filters `workflowsFetched` by `userStore.matchesCurrentUsername(w.owner)` on the My tab (`workflowsLoaded`). It also holds `loading` true until `userStore.currentUser` is set. Both were added in #23777 to hide shared rows the API used to return. With `show_shared=false` (and `show_published` false), `index_query` filters only on `StoredWorkflow.user == trans.user`, so the server already guarantees ownership. The cost is small: an O(page) filter, plus a display gate while the user store loads. This is mainly a simplification. Either remove both, or add a comment explaining why they remain as a guard.
