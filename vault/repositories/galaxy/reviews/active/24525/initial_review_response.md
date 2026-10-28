(space for John's free style comments - just keep empty)

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via Claude Opus 5.5 at low effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via Claude Opus 5.5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Claude Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

Profile: gx_risk_assessment · Model: claude-opus-5-5 · Effort: low · Reviewed commit: e37e3605

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). It is a client-only fix pointing the notebook sharing page at the existing `/api/pages/...` endpoints via an optional `resource` prop; no API, schema, or workflow/tool behavior changes, and the Visualizations and Workflows sharing routes keep their existing `pluralName`-derived URLs.

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24525_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

[`pr_24525_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24525_review_0) builds on the PR head (e37e3605). It has `SharingPage.vue` derive its API and `list_published` path segment from `modelClass`, the way `PublishedItem.vue` does, so display labels like "Notebooks" no longer drive URLs. That removes the PR's optional `resource` prop and router addition. It also adds the missing Selenium coverage for the notebook sharing page.

- [`d45b27f1388`](https://github.com/jmchilton/galaxy/commit/d45b27f1388) Derive sharing API segment from modelClass, not display label. Replaces the `resource ?? pluralName.toLowerCase()` fallback with `History` -> `histories`, else `${modelClass.toLowerCase()}s`, and removes `resource: "pages"` from the `pages/sharing` route.
- [`44c11ba8024`](https://github.com/jmchilton/galaxy/commit/44c11ba8024) Add Selenium test for publishing a page via sharing page. Adds `go_to_page_sharing` to `navigates_galaxy.py` and `test_page_sharing.py`, which publishes a populator-created page through the UI and asserts the sharing state through the API.

</details>

</details>

### P2 1: API URL segment still derived from the display label (implementation verified)

`resource` falls back to `pluralName.toLowerCase()`. That keeps the coupling behind this regression in place: #23576 renamed `"Pages"` to `"Notebooks"` and broke the API URLs. The Workflows and Visualizations routes and `HistoryAccessibility.vue` still build their API, slug and `list_published` URLs from a UI label, so relabeling any of them breaks it again silently. The same rename commit fixed this problem differently in `client/src/components/Common/PublishedItem.vue`. There, `pluralSlug` comes from the model class (`History` -> `histories`, otherwise `${modelTitle.toLowerCase()}s`) and is kept separate from the display `plural`.

<details><summary>Evidence</summary>

The review branch drops the router change and derives the segment from `modelClass`. The PR's vitest still passes on that branch, and it fails on base with `/api/notebooks/a1/sharing`.

</details>

Derive the segment from `modelClass` inside `SharingPage.vue`. Drop the new `resource` prop and the router line. All four callers (`Page`, `Workflow`, `Visualization`, `History`) map to their existing endpoints, and `pluralName` then only drives the "Published …" label. On `dev`, a small shared model-class -> URL-plural helper could serve both `PublishedItem.vue` and `SharingPage.vue`. Typing `modelClass` as `"Page" | "Workflow" | "Visualization" | "History"` would make the mapping total.

<details><summary>Details</summary>

```ts
const resource = computed(() => (props.modelClass === "History" ? "histories" : `${props.modelClass.toLowerCase()}s`));
```

</details>

Fixed on the review branch in [`d45b27f1388`](https://github.com/jmchilton/galaxy/commit/d45b27f1388).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>

### P2 2: No end-to-end coverage of the notebook sharing page (implementation verified)

This regression shipped because nothing exercises the page sharing UI against the real API. History and workflow sharing have Selenium tests (`test_history_sharing.py`, `test_workflow_sharing.py`); pages have none. The vitest mocks axios, so it can't catch a URL that the server doesn't serve.

<details><summary>Evidence</summary>

The new test (Playwright backend) passes against a client built from the review branch. Against a client built from base `release_26.2` it fails, timing out waiting for `.make-accessible label`.

</details>

Add `go_to_page_sharing` next to `go_to_workflow_sharing` in `navigates_galaxy.py`, plus a short `test_page_sharing.py`. The test creates a page through the populator, opens `pages/sharing?id=…`, makes the page accessible and publishable, checks the "Published Notebooks" link points at `/pages/list_published`, and asserts `importable`/`published` through the API.

Fixed on the review branch in [`44c11ba8024`](https://github.com/jmchilton/galaxy/commit/44c11ba8024).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort and [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 1: Vitest carries heavy setup for one prop mapping

The test imports `getRouter` (every analysis route component), mocks `axios`, `@/app` and `@/composables/config`, and pulls route props out with `route.matched.at(-1)!.props.default as (...)` casts. P2 1 moves the URL choice to `modelClass`, and P2 2 covers the real round trip. With both in place, this test could mount `SharingPage` directly with `modelClass: "Page"` and `pluralName: "Notebooks"`, assert the `/api/pages/...` calls and the label, and drop the router import and its mocks.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort.

</details>
