# Scope evaluation: issue_23977_client_api_fanout_26.1

**Recommendation: keep the scope as implemented. Ship it as one PR to `release_26.1` that says "refs #23977", not "fixes".** Its 7 commits are client-only: 379 added and 170 removed non-test lines across 24 files. Together they deal with all four causes in the issue's cause table: datatypes fan-out, `instance=true` ×4, keyed-cache retry with no backoff, and part of the counts N+1. Every expansion reviewers raised is either a pre-existing bug the branch didn't cause or dev-only API work, and none needs to block this PR. Make the backend workflow-counts N+1 (`followup_workflow_counts_proposal.md`) a separate dev PR; that PR is what lets #23977 close. Splitting this branch is a fallback if reviewers ask for it, not the default: commit 6 depends on the retry gate from commit 4, so the split isn't clean. Don't contract the scope. The minimal fan-out-only cut would leave the lockstep 429 retries, which caused `workflows/{id}?instance=true` ×4, on the servers John wants fixed.

---

## 1. As implemented: one 7-commit client PR on `release_26.1`

Shared in-flight requests (`sharedPromise`) for datatypes, genomes and workflow instances. Datatypes load only for datatype help terms. The 429 middleware gets jittered backoff, and keyed-cache/history/collection retries go through a new `useRetryGate`. Loading replaces blank/"not found" while a retry is pending. Workflow cards fetch `/counts` only when the badge can show.

- **Pros**
  - Covers every row of the issue's cause table: three fully, the counts N+1 in part (panel, shared/published, anonymous).
  - Adds two reusable abstractions (`sharedPromise`, `useRetryGate`) that replace three hand-copied retry blocks and two module caches, instead of more inline copies.
  - Client-only, so it fits release-branch rules. Precedent: the 429 middleware itself landed on 25.1 (#21286).
  - Matches John's call ("real problems affecting real servers"). Both retry layers kept as decided.
- **Cons**
  - Medium-sized for a release branch: 44 files with tests, about 1.7k lines of tests.
  - Forward-merge conflicts on dev (Vue 3 `set`/`del` in `retryGate.ts`, `keyedCache.ts`, `workflowStore.ts`).
  - Leaves 2 checklist items open: the counts index field, and a page-size regression check, now that the request-counting E2E is gone.
  - Owned cards on "My workflows" still send up to 24 `/counts` requests.

<details>
<summary>Details</summary>

- **How it maps to the issue checklist:**
  - Upload in-flight promise plus `loadDbKeys`: done (commit 1).
  - helpTermsStore dedupe and lazy datatypes: done (commit 2).
  - Optional lazy HelpPopover mount: declined (§5).
  - Workflow-list counts from the index: partial. Commit 7 gates them; the backend part goes to the dev follow-up (§3).
  - keyedCache backoff and Retry-After: done (commit 4), plus loading states (commit 5).
  - `instance=true` ×4: root cause found in the lockstep middleware retries (commit 3), and failure sharing fixed (commit 6).
  - Regression check: only vitest-level now (`HelpText.test.ts` asserts 0 datatypes for 25 rows; `invocations.test.ts` asserts one history request per id). Leave the checklist box unticked, or explain this in the PR body.
- **PR description must mention:** the user-visible change where Upload shows "Unable to load upload options" after a failed `/api/datatypes`, instead of silently caching `[]` (from review_after_e2e_drop).
- **Dev forward-merge note:** #23510 (dev only) now has Galaxy's own slowapi limiter send `Retry-After` on 429. The keyedCache/gate Retry-After plumbing was called "low value, nginx sends none". It gains a real server-side producer on dev, which is another reason to keep it.

</details>

## 2. Contract: fan-out dedupe only (commits 1, 2, 7, plus the workflowStore part of 6)

Ship only the request-count reductions. Drop the 429 middleware backoff, `useRetryGate`, the store adoptions and the loading-state fixes, or move them to dev.

- **Pros**
  - About half the non-test diff. No new composable on the release branch, and fewer files carry Vue 2/3 forward-merge conflicts.
  - Removes the largest counts in the issue (62 datatypes requests, panel `/counts`).
- **Cons**
  - Leaves the measured root cause of `instance=true` ×4: fixed 1 s lockstep 429 retries re-burst the limiter.
  - Leaves "retry 429 immediately, ×4 per item" in keyed-cache stores, which is a checklist item and the follow-through on #21886/#21920.
  - The commit-5 "Invocation not found." / blank-while-retrying bugs come back once retries are spaced out on dev, so they would have to be redone there.
  - Against John's stated reason for targeting 26.1.

## 3. Expand: include the backend workflow-counts N+1 fix

Add an opt-in `include_invocation_counts` on `GET /api/workflows` with an owned-rows-only grouped count, and seed `invocationStore` from the index, as in `followup_workflow_counts_proposal.md`.

- **Pros**
  - Closes the last checklist item, so this would be the PR that fixes #23977.
  - Removes the remaining up to 24 `/counts` requests per "My workflows" page.
- **Cons**
  - It's an API addition (query param, response field, schema regen), so it's a dev feature that can't go to `release_26.1`.
  - Has unresolved design questions: `include_*` vs `skip_*`; per-user vs all-user counts (`/counts` counts every user's runs, but the badge links to your own); omit vs `null` for unowned rows.
  - Needs API tests on a different branch base.

<details>
<summary>Details</summary>

Recommend a separate dev branch/PR after this one merges. It can say "fixes #23977" if this PR said "refs". The proposal already has a red-to-green API and vitest plan. Its open question "is the 26.1 gating in scope for this branch" is settled: commit 7 is that gating.

</details>

## 4. Expand: fix the `collectionElementsStore` key mismatch here

`fetchCollection` records loading/error/gate state under the HDCA id, but `isLoadingCollectionElements` and `getLoadingCollectionElementsError` look it up by collection key, and element-fetch errors are plain `Error` objects. Align the keys and move element fetches to `rethrowSimpleWithStatus`, so the new gate reaches `CollectionPanel`.

- **Pros**
  - Without it, the branch's loading/finalError getter changes in this store mostly have no effect on `CollectionPanel`.
  - Small, local, and it would use the new gate.
- **Cons**
  - Pre-existing bug, not part of the fan-out. Retry spacing via `canRetry` on the HDCA-id getters already works.
  - Changes collection-panel behavior on a release branch for a problem the issue didn't measure.
  - Better as a dev follow-up with its own test.

## 5. Expand: other review-noted follow-ups

These are lazy `HelpTerm` mount in `HelpPopover`, adopting `sharedPromise` in the hand-rolled dedupes (`userStore`, `quotaUsageStore`, `workflowStore.getFullWorkflowCached`, `datatypeStore.fetchDatatypeDetails`), `WorkflowInvocationState` never starting polling after a failed first fetch, and the server-side `show_in_tool_panel` per-row query in the workflow index.

- **Pros**
  - The `sharedPromise` adoption is exactly the reuse of a new abstraction that John looks for in reviews.
  - Each one is small on its own.
- **Cons**
  - None of them reduce the request counts the issue measured. HelpTerm rows already send 0 requests, and the hand-rolled dedupes already dedupe.
  - The lazy mount needs `Popper.vue` changes and carries positioning risk.
  - The dedupe adoptions are refactors, which don't belong on a release branch.
  - Polling is a pre-existing watch-interplay bug.
  - `show_in_tool_panel` is server-side and invisible to rate limits.

<details>
<summary>Details</summary>

Track these as dev follow-ups, for example in `implementation_debrief.md` → Follow-ups. The `sharedPromise` adoption is the best of them: it makes the new helper the established pattern instead of a one-off.

</details>

## 6. Restructure: split into 2 PRs (fan-out dedupe / 429 backoff)

PR A: commits 1, 2, 7 and the workflowStore part of 6. PR B: commits 3, 4, 5 and the grid gate part of 6. Both on `release_26.1`, possibly stacked.

- **Pros**
  - Smaller reviews. The low-risk PR A could merge first.
  - Lets reviewers argue about the two-retry-layer design without holding up the dedupe.
- **Cons**
  - Commit 6 mixes the two (grids "load histories only via the gate" needs commit 4), so it has to be split by hunk.
  - The two retry layers (3 and 4) and their worst-case budget only make sense reviewed together. PR B is still most of the diff.
  - Twice the CI and forward-merge overhead for a cohesive "page loads trip rate limits" story.

## 7. Retarget: base on `dev` instead of `release_26.1`

- **Pros**
  - No forward-merge conflicts. Vue 3 idioms from the start.
  - Release-branch risk tolerance is no longer a concern.
  - Could be combined with §3 in one PR that fixes the issue.
- **Cons**
  - Servers running 26.1 keep tripping rate limits until 26.2. John chose 26.1 on purpose for that reason.
  - Throws away a branch that's already reviewed and test-challenged.

