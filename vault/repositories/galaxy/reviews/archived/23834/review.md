# galaxy#23834 — Modernize `ToolEntryPoints` with an interactive card based view

- PR: https://github.com/galaxyproject/galaxy/pull/23834 (ahmedhamidawan, base `dev`)
- Head: `019b6d11413` = author commit `5849838f396` + our test-fix commit `019b6d11413` (test router for the GCard RouterLink secondary action; `data-description='entry point button'` selectors; active case asserts hrefs)
- Reviewed: 2026-09-30
- Worktree: `~/projects/worktrees/galaxy/pr/23834`

## Summary

Rewrites `client/src/components/ToolEntryPoints/ToolEntryPoints.vue` from Options API + `infomessagelarge` prose into `<script setup lang="ts">` on `GCard` + `GButton` + `Heading`. Consumers: `Tool/ToolForm.vue:529` and `Tool/ToolSuccess.vue:39`, both `v-for` per job. Using `GCard` is the right call, and nothing is duplicated. The InteractiveTools list page is a table and shares nothing with this view. No Selenium/Playwright selectors reference the old markup (`infolarge` in navigation.yml is unused by tests), so nothing breaks.

States rendered in a scratch mount (0 / 1 inactive / 1 active / 2 mixed) look right, with one regression: the single-active "Open X" button no longer opens a new tab.

**Verdict:** approve (#1 fixed by us in `35dd25e5c33`). Rest are minor cleanups.

Tests: `vitest run src/components/ToolEntryPoints/` passes 2/2. CI still pending at review time.

## Findings

1. **Single active entry point opens in the same tab (regression) — medium.** `ToolEntryPoints.vue:40-47` sets `externalLink: true` on a *primary* action, but `GCard.vue` only maps `externalLink` to `target` for secondary actions/badges/indicators; the primary-action `GButton` (`GCard.vue:~690-705`) has no `:target`. Rendered: `<a href="/it/access/x" title="Open in a new tab">` with no `target`. The old code used `target="_blank"`, and this is the most common case. This is a latent GCard gap: existing `externalLink` users (`ToolOntologyCard`, `CuratedWorkflowCard`, `useWorkflowCardActions`) put it on secondary or extra actions, and this PR is the first to put it on a primary action. Fix it in GCard so `CardAction.externalLink` behaves the same on every action type: add `:target="pa.externalLink ? '_blank' : undefined"` and `:rel="pa.externalLink ? 'noopener' : undefined"` to primary actions, and the same `rel` wherever GCard already sets `target`. Add a single-active test that asserts `target="_blank"`. **Status: fixed by us in `35dd25e5c33` (target only, matching the existing GCard sites; rel not added — modern browsers imply noopener for `_blank`).**

2. **`entryPointsForJob(jobId)` re-evaluated ~10x; loading state keyed off a CSS class — low.** Lines 29-30, 38-39, 63-69, 101-103, 133-134 each re-run the filter. Use one `const jobEntryPoints = computed(() => entryPointsForJob.value(props.jobId))`, plus `activeCount`/`hasInactive` computeds. Line 93 decides the loading background with `currentStatus.class === 'fa-spin'`; use an explicit `isWaiting` computed. `singularJob` (line 39) is an entry point, not a job.

3. **Zero-entry-point copy loses "waiting" meaning — low.** The old text was "Waiting for InteractiveTool result view(s) to become available." This state appears right after submission, before the job registers its entry points. New (line 65): "No Interactive Tool sessions are currently available" with a `faMinus` icon and a "0 active" badge. That reads as final or failed. Keep the waiting wording and use the spinner/loading style here too.

4. **Nonexistent CSS var — low.** Line 160: `--color-green-600-rgb` isn't defined (only `--color-green-600: #25a35b` in `custom_theme_variables.scss`). It works only through the hard-coded fallback. Use `rgb(from var(--color-green-600) r g b / 0.15)`, as galaxy-ui's GButton already does.

5. **Heading repeated per job — low.** Both consumers `v-for` one `ToolEntryPoints` per job. A multi-job submission (e.g. mapped over a collection) now gets N "Interactive Tools" headings with separators. Either move the `Heading` into the parents (outside the `v-for`) or put the tool/job identity in the card title.

6. **Nit: `target`/`rel` on disabled `<button>` — trivial.** Lines 109-110 are passed unconditionally, so inactive entries render `<button ... target="_blank" rel="noopener">`. The `:href="entryPoint.active ? … : undefined"` guard (line 108) is also redundant, since GButton already renders a `button` when `disabled`. Bind `target`/`rel` only when active, or leave it; it's harmless.

### Our test commit (019b6d11413)

Reasonable. `injectTestRouter` is needed because the secondary action is now a RouterLink. The inactive case asserts `BUTTON` + `aria-disabled`, and the active case asserts the hrefs. Gap: no single-entry-point or zero case (see #1).

## Draft review

_This review was posted by Claude (AI assistant) on behalf of jmchilton._

Nice cleanup. Moving to `GCard`/`GButton` fits, and no Selenium selectors reference the old markup. The existing unit test was still selecting the old `li`/`span>a` markup and needed a router for the new RouterLink secondary action. I pushed a commit (019b6d11413) updating `ToolEntryPoints.test.js` to use `data-description='entry point button'` and assert the hrefs.

1. **Single active entry point no longer opened a new tab.** `GCard` only mapped `externalLink` to `target="_blank"` for secondary/extra actions and indicators, and this is the first primary action to use it. I pushed 35dd25e5c33, which adds `:target` for `pa.externalLink` in `GCard` (matching the other action types) and a single-active-entry-point test asserting `target="_blank"`. Other `externalLink` users are on secondary/extra actions, so they're unaffected.
2. `entryPointsForJob(props.jobId)` is re-evaluated about ten times across computeds and the template. A single `jobEntryPoints` computed (plus `activeCount`/`hasInactive`) would simplify this. The loading background is currently keyed off `currentStatus.class === 'fa-spin'`, and an explicit `isWaiting` computed would be clearer.
3. The zero-entry-point state appears right after submission, before entry points register. "No Interactive Tool sessions are currently available" with a minus icon and "0 active" reads as final. Could it keep the old "waiting for … to become available" meaning?
4. `--color-green-600-rgb` doesn't exist; it works only through the fallback. `rgb(from var(--color-green-600) r g b / 0.15)` matches what GButton does.
5. `ToolForm`/`ToolSuccess` render one `ToolEntryPoints` per job, so a multi-job submission shows repeated "Interactive Tools" headings. Consider moving the heading to the parent.
6. Minor: `target`/`rel` end up on the disabled `<button>` for inactive entries; bind them only when active.
