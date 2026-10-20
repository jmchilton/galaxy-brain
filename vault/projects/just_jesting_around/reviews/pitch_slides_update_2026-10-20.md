# Pitch and client-testing slides review — October 20, 2026

Independent normal review completed. No blocking findings. The update addresses the stale branch structure and validation results and brings the slides' main review-time arguments into the pitch. No code or test changes were requested by this review.

Not requested: a new performance benchmark, API recapture, cleanup of historical accessibility exceptions, or product fixes. The drafts correctly identify those limitations rather than presenting them as completed work.

<details>
<summary>Review scope and evidence</summary>

Reviewed `STORYBOOK_PITCH.md` and the edited `jmchiltondotnet/src/content/slides/client-testing.mdx` against the current combined branch implementation debrief, consolidation mapping, accessibility findings and selected source files in the `storybook_interactions` worktree.

- The pitch links to the requested `https://jmchilton.net/slides/client-testing/#/4` immediately after its title. Both old and new decks contain 21 top-level sections; section index 4 remains the human-reviewer/cognitive-load slide. No inserted slide shifts the requested anchor.
- Both drafts accurately identify the combined play/accessibility prototype and its four shared commits followed by 96 per-test commits. They do not present the retired accessibility branch as a maintained lane or imply an open upstream Storybook PR.
- The current 100-file/583-story snapshot, strict 432 passing/151 failing full run and 150 known distinct axe-failing stories across the full run and diagnostic reruns are qualified correctly. Failure counts are not called distinct defects or all new regressions. The 121 historical TODO exceptions are explicitly not revalidated. Passing isolated play reruns do not become an all-green full-suite claim.
- The October 12–13 runtime benchmark is explicitly historical, excludes accessibility, covers an earlier smaller conversion range and is not presented as a measurement of the current combined branch or human review time.
- Checked the HistoryExportWizard `PrefersUserZenodo` play snippet against current source: it is exact. That component's remaining unit checks include sanitizer/profile contracts. Checked BroadcastsList's four plays, FormData's two interaction plays, and InstallationSettings' seven retained newer regression tests. Existing migration illustrations remain, with obsolete present-tense claims corrected.
- Major slide arguments now represented in the pitch: human review cost; unit-test complexity as design feedback and the concern that agents can write around the implementation; the CSS/teleport boundary example; and recorded API fixtures as a complementary lane based directly on readability.
- Browser behavioral checks remain distinct from screenshot baselines. Visual regression, a viewport matrix and browser CI are not claimed to exist. The API recording lane is not described as already supplying every Storybook handler.

GitHub merge/status checks and the presentation build are performed by the implementing agent; this review does not independently claim those executions. The original presentation structure and styling are preserved. No broad test run is appropriate for this documentation-only change.

</details>

## Driver verification

Astro production build passes using the website's existing local toolchain. A local headless Chromium check visits all 21 slides with transitions disabled, reports no page errors and no visible content outside the slide bounds, and confirms slide index 4 remains the cognitive-load slide. The changed abstraction, recorded-response, HistoryExportWizard, snapshot, benchmark and accessibility slides were visually inspected at 1280×900. The connected browser runtime had no available browser, so the local check used installed Playwright/Chromium instead. Screenshots and the layout report are temporary QA artifacts, not website assets.

Live GitHub reads confirm PR #24046 merged on October 15, #24141 on October 17, #23995 on October 11 and #23910 on October 6. Issues #24031/#24035/#24036/#24037 remain open; the pitch distinguishes issue workflow state from merged shared-control fixes. Vault validation passes: 124 files, zero errors, 15 existing advisory warnings. No Galaxy source/test changes, fresh runtime benchmark, site deployment or vault push is part of this documentation update.
