(space for John's free style comments - just keep empty)

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via Claude Opus 5.5 at low effort.
- Review profile [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) was run via Claude Opus 5.5 at medium effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Claude Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

<!-- Profile: gx_risk_assessment; model: Claude Opus 5.5; effort: low; reviewed commit: fc477492afec572160601cd5d60e8d2d0f5b1be6 -->

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). It is client-only: the My workflows tab now passes the existing `show_shared=false` API parameter and drops the `is:shared_with_me` filter from that tab; no API, schema, or workflow-artifact behavior changes.

<details><summary>Risk Details</summary>

- Bookmarked or typed `is:shared_with_me` searches on the My workflows tab now surface as an invalid filter instead of returning results; users must use the Shared with me tab instead.
- The fix relies on the server-side `show_shared` default staying as is for the other tabs, which still pass `undefined`.

</details>

<details><summary>Risk Review Advice</summary>

Confirm that removing `is:shared_with_me` from the My workflows filter menu and help text is the intended UX, given that the Shared with me tab covers that case. Reverting is a two-line client change.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24565_review_1) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

Branch [`pr_24565_review_1`](https://github.com/jmchilton/galaxy/tree/pr_24565_review_1) (from `fc477492afec`) builds on the PR's fix. It adds an API assertion that `Total_matches` excludes shared workflows with `show_shared=false`. It removes the client-side owner filter left over from #23777, but keeps the wait-for-user loading gate (with a corrected comment) because workflow cards still derive ownership from the current user. It makes each tab's `showShared` explicit. It also drops the parameter-only unit tests. The client tests for every edited file pass (`WorkflowList.test.ts`). The API test was written but not run, because no Galaxy virtualenv was available.

- [`9d3e07474fc`](https://github.com/jmchilton/galaxy/commit/9d3e07474fc) Assert Total_matches excludes shared workflows with show_shared=false: extends `test_index_total_matches` with a `show_shared=false` request that expects 3 matches and 3 rows, without the shared workflow (P2 1).
- [`9cf73974989`](https://github.com/jmchilton/galaxy/commit/9cf73974989) Drop the My workflows client owner filter now that the server excludes shared workflows: `workflowsLoaded` becomes a plain ref, and the loading gate's comment now gives the card-ownership reason (P3 1).
- [`516845d7e14`](https://github.com/jmchilton/galaxy/commit/516845d7e14) Drop the WorkflowList tests that only assert showShared is omitted: removes the duplicated published and Shared with me tests (P3 2).
- [`609684d3409`](https://github.com/jmchilton/galaxy/commit/609684d3409) Pass showShared explicitly on the Shared with me workflows tab: sends `published ? undefined : sharedWithMe` and turns the My tab test into an `it.each` over My (`false`) and Shared with me (`true`) (P3 3).

</details>

</details>

### P2 1: No API test pins `Total_matches` with `show_shared=false` (implementation verified)

The fix depends on the server leaving shared workflows out of the `Total_matches` header when `show_shared=false`. `test_index_show_shared` checks only the returned ids. `test_index_total_matches` checks the count only with the default, which includes shared workflows. Nothing would catch the count drifting away from the page for the My workflows request.

In `test_index_total_matches`, request `workflows?show_shared=false` after the existing request and assert `Total_matches == "3"`, three rows, and that the shared workflow is absent (2 own + 1 imported).

Fixed on the review branch in [`9d3e07474fc`](https://github.com/jmchilton/galaxy/commit/9d3e07474fc).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort. The assertion was written on the review branch but not run, because no Galaxy virtualenv was available.

</details>

### P3 1: The client-side owner filter from #23777 is now redundant (implementation verified)

#23777 hid shared workflows on the My tab by filtering on the client (`workflowsLoaded` filters `workflowsFetched` by `userStore.matchesCurrentUsername(w.owner)`). With `show_shared=false` and `show_published` false, `index_query` filters only on `StoredWorkflow.user == trans.user`, so the filter can no longer remove anything. Keeping it leaves two sources of truth for "what is mine". The server fix should replace the workaround rather than sit on top of it.

The wait-for-user `loading` gate should stay, with a new reason. `WorkflowCard.vue` and `useWorkflowCardActions.ts` still decide `shared` from `matchesCurrentUsername(owner)`. Without the gate, own workflows would briefly render as shared cards with the wrong actions. Its comment ("My workflows are filtered by owner") becomes stale once the filter goes.

Make `workflowsLoaded` a plain ref set from the response, and reword the gate comment to say that cards derive ownership from the current user. The existing #23777 test "render own workflows when the user loads after the workflow list" still passes unchanged.

Fixed on the review branch in [`9cf73974989`](https://github.com/jmchilton/galaxy/commit/9cf73974989).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) and [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 2: The two "server default" unit tests repeat each other and only check that a parameter is missing (implementation verified)

The published and Shared with me tests in `WorkflowList.test.ts` only assert that `options.showShared` is `undefined`. They pin an implementation detail, not behavior, and they would fail on a harmless change such as passing `showShared: true` on the Shared with me tab. Shared with me listing is already covered by `lib/galaxy_test/selenium/test_workflow_sharing.py`.

Drop both tests and keep the My tab `showShared: false` test as the client-side guard.

Fixed on the review branch in [`516845d7e14`](https://github.com/jmchilton/galaxy/commit/516845d7e14).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 3: The Shared with me tab still relies on the API's implicit `show_shared` default (implementation verified)

The My tab now passes `showShared` explicitly. The Shared with me tab still relies on the server's computed default (`show_shared = not show_hidden and not show_deleted`), even though the `is:shared_with_me` query it always appends requires `show_shared` to be true. Comparable sibling lists (`Grid/configs/visualizationsShared.ts`, the shared loader in `api/histories.ts`) pass `showShared: true` explicitly. Current behavior is correct.

Pass `showShared: published.value ? undefined : sharedWithMe.value`, so My sends `false`, Shared with me sends `true`, and Published keeps the default. Then turn the My tab test into an `it.each` over both tabs. The workflow list never sends `show_deleted` or `show_hidden`, so an explicit `true` cannot hit the API's `show_shared`/`show_deleted` conflict.

Fixed on the review branch in [`609684d3409`](https://github.com/jmchilton/galaxy/commit/609684d3409).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>
