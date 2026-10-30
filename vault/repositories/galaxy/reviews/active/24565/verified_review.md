### P2 1: No API test pins `Total_matches` with `show_shared=false` (implementation verified)

The fix depends on the server leaving shared workflows out of the `Total_matches` header when `show_shared=false`. `test_index_show_shared` checks only the returned ids. `test_index_total_matches` checks the count only with the default, which includes shared workflows. Nothing would catch the count drifting away from the page for the My workflows request.

In `test_index_total_matches`, request `workflows?show_shared=false` after the existing request and assert `Total_matches == "3"`, three rows, and that the shared workflow is absent (2 own + 1 imported).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort. The assertion was written on the review branch but not run, because no Galaxy virtualenv was available.

</details>

### P3 1: The client-side owner filter from #23777 is now redundant (implementation verified)

#23777 hid shared workflows on the My tab by filtering on the client (`workflowsLoaded` filters `workflowsFetched` by `userStore.matchesCurrentUsername(w.owner)`). With `show_shared=false` and `show_published` false, `index_query` filters only on `StoredWorkflow.user == trans.user`, so the filter can no longer remove anything. Keeping it leaves two sources of truth for "what is mine". The server fix should replace the workaround rather than sit on top of it.

The wait-for-user `loading` gate should stay, with a new reason. `WorkflowCard.vue` and `useWorkflowCardActions.ts` still decide `shared` from `matchesCurrentUsername(owner)`. Without the gate, own workflows would briefly render as shared cards with the wrong actions. Its comment ("My workflows are filtered by owner") becomes stale once the filter goes.

Make `workflowsLoaded` a plain ref set from the response, and reword the gate comment to say that cards derive ownership from the current user. The existing #23777 test "render own workflows when the user loads after the workflow list" still passes unchanged.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) and [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 2: The two "server default" unit tests repeat each other and only check that a parameter is missing (implementation verified)

The published and Shared with me tests in `WorkflowList.test.ts` only assert that `options.showShared` is `undefined`. They pin an implementation detail, not behavior, and they would fail on a harmless change such as passing `showShared: true` on the Shared with me tab. Shared with me listing is already covered by `lib/galaxy_test/selenium/test_workflow_sharing.py`.

Drop both tests and keep the My tab `showShared: false` test as the client-side guard.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 3: The Shared with me tab still relies on the API's implicit `show_shared` default (implementation verified)

The My tab now passes `showShared` explicitly. The Shared with me tab still relies on the server's computed default (`show_shared = not show_hidden and not show_deleted`), even though the `is:shared_with_me` query it always appends requires `show_shared` to be true. Comparable sibling lists (`Grid/configs/visualizationsShared.ts`, the shared loader in `api/histories.ts`) pass `showShared: true` explicitly. Current behavior is correct.

Pass `showShared: published.value ? undefined : sharedWithMe.value`, so My sends `false`, Shared with me sends `true`, and Published keeps the default. Then turn the My tab test into an `it.each` over both tabs. The workflow list never sends `show_deleted` or `show_hidden`, so an explicit `true` cannot hit the API's `show_shared`/`show_deleted` conflict.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 4: Test the invalid-filter behavior on My workflows rather than the filter config (implementation verified)

The new `filterConversion.test.js` case checks that the `my` filter config rejects `shared_with_me`. The PR description promises a behavior: typing `is:shared_with_me` on My workflows shows the "Invalid filters in query" notice and sends no request. Nothing tests that behavior.

In `WorkflowList.test.ts`, emit `update:filterText` with `is:shared_with_me` from `FilterMenu` (the same approach as `CuratedWorkflowList.test.ts`). Expect `#no-workflow-found-invalid` to mention `shared_with_me` and `loadWorkflows` to receive no new call. Then drop the config-level case.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort. The new test passes on the review branch and fails when `workflowFilters.ts` is restored to its pre-PR version.

</details>
