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

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>

### P2 2: No end-to-end coverage of the notebook sharing page (implementation verified)

This regression shipped because nothing exercises the page sharing UI against the real API. History and workflow sharing have Selenium tests (`test_history_sharing.py`, `test_workflow_sharing.py`); pages have none. The vitest mocks axios, so it can't catch a URL that the server doesn't serve.

<details><summary>Evidence</summary>

The new test (Playwright backend) passes against a client built from the review branch. Against a client built from base `release_26.2` it fails, timing out waiting for `.make-accessible label`.

</details>

Add `go_to_page_sharing` next to `go_to_workflow_sharing` in `navigates_galaxy.py`, plus a short `test_page_sharing.py`. The test creates a page through the populator, opens `pages/sharing?id=…`, makes the page accessible and publishable, checks the "Published Notebooks" link points at `/pages/list_published`, and asserts `importable`/`published` through the API.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort and [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 1: Vitest carries heavy setup for one prop mapping

The test imports `getRouter` (every analysis route component), mocks `axios`, `@/app` and `@/composables/config`, and pulls route props out with `route.matched.at(-1)!.props.default as (...)` casts. P2 1 moves the URL choice to `modelClass`, and P2 2 covers the real round trip. With both in place, this test could mount `SharingPage` directly with `modelClass: "Page"` and `pluralName: "Notebooks"`, assert the `/api/pages/...` calls and the label, and drop the router import and its mocks.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort.

</details>
