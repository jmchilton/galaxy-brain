# Initial review: galaxyproject/galaxy#24525

- Profile: default
- Model: Opus 5.5 (claude-opus-5-5)
- Effort: low
- Reviewed commit: e37e3605 (base `origin/release_26.2`)

## Verdict

Correct, minimal fix for a real 26.2 regression. #23576 (70b8dcd) renamed the router's `pluralName` for `pages/sharing` from `"Pages"` to `"Notebooks"`. `SharingPage.vue` builds every API and list URL from `pluralName.toLowerCase()`, so the GET `/api/notebooks/<id>/sharing`, the sharing PUTs, the slug PUT and the "Published Notebooks" link all broke. The page never left `ready = false`. The new `resource` prop puts all four URLs back on `pages`. The vitest resolves the real route, so on base it fails at the `/api/pages/a1/sharing` assertion (red-to-green by inspection; no `client/node_modules` in the worktree, so it wasn't run). The same bug is on `dev`, so the forward merge will pick this up.

No P1s.

## Findings

### P2 1: URL segment still falls back to the display label; diverges from sibling `PublishedItem.vue`

`resource` defaults to `props.pluralName.toLowerCase()`. So the trap that caused this regression is still there for the Workflows and Visualizations routes and for `HistoryAccessibility.vue`: relabel any of them in the UI and its API URLs break without warning. The same rename commit already fixed the same problem in `client/src/components/Common/PublishedItem.vue` in a different way. There, `pluralSlug` is derived from the model class (`History` -> `histories`, otherwise `${modelTitle.toLowerCase()}s`) and kept separate from the display `plural`. This PR adds a second, router-supplied mechanism instead of reusing that one.

Suggested fix: derive the URL segment from `modelClass` inside `SharingPage.vue` and drop both the new prop and the router change. `Page`, `Workflow`, `Visualization` and `History` all map to `pages`, `workflows`, `visualizations` and `histories`. `pluralName` then only feeds the label. A tiny shared helper (model class -> URL plural) could serve both `PublishedItem.vue` and `SharingPage.vue`. If keeping the change minimal for the release branch matters more, this can wait for `dev`.

### P3 1: Unit test pulls in the whole analysis router; page sharing still has no Selenium coverage

The test imports `getRouter` (every analysis route component), mocks `@/app` and `@/composables/config`, and hand-casts the route's `props` function. That's a lot of setup to check one prop mapping. Histories and workflows have Selenium sharing tests (`lib/galaxy_test/selenium/test_history_sharing.py`, `test_workflow_sharing.py`, which wait for `.make-accessible`; it only renders after a successful sharing GET). Pages have none, and that gap is why this regression shipped. A short `test_page_sharing.py` would cover the real API round-trip and catch the next rename: create a page via populator, go to `pages/sharing?id=...` (add a `go_to_page_sharing` helper beside `go_to_workflow_sharing` in `navigates_galaxy.py`), wait for `.make-accessible`, toggle it, assert `importable` via the API. If P2 1 is taken, the vitest can shrink to mounting `SharingPage` with `modelClass: "Page"` and dropping the router import.

## Non-findings / notes

- Pre-existing, not touched here: the visible copy mixes names, e.g. "Make Page publicly available in Published Notebooks" and "Share or Publish Page". `modelClass` also drives embed selection and `UserSharing` text, so changing it needs care. Likely out of scope.
- The `HistoryAccessibility.vue`, Workflows and Visualizations callers behave the same as before (the fallback keeps their URLs).
- No Python changes; no import or typing concerns.
