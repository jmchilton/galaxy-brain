# issue_24031_badge_tooltip_html

[PR description](pr_description.md) · [Titles](pr_titles.md) · [Polish debrief](polish_debrief.md)

Issue: [24031 — Storage badge tooltips show administrator messages as literal HTML](https://github.com/galaxyproject/galaxy/issues/24031).

- [Initial implementation](initial_implementation_debrief.md)
- [Normal review](subagents/normal_review.md)
- [Test challenges](test_challenges_debrief.md)
- [Code quality review](thermo_nuclear_review.md)
- [Scope evaluation](scope_evaluation.md)
- [Screenshots](screenshot_debrief.md)
- [Implementation handoff](implementation_debrief.md)

Worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/issue_24031_badge_tooltip_html`.
Branch: `issue_24031_badge_tooltip_html`, based on upstream dev `20f365a2654`.
Status: `merged`.

Back in polish 2026-10-10: John approved three scope additions after the first polish. (1) Sanitize badge messages with the `links` profile. (2) Make admin links clickable again with a popover, as before 25.0. (3) Add a hover check to `test_objectstore_selection.py`. The description and screenshots predate these and need redoing.

Scope additions implemented 2026-10-10 (`a3147d22149`, `ac407009418`, `54f50d01d3a`):
- The badge uses `GPopover` and `ConfigurationMarkdown` (the `links` sanitizing profile).
- The trigger is a focusable button, with a new `interactive` prop that is off in the three dropdown option slots.
- jsdom is dropped: the directive tests stub DOMPurify, and JobInformation's `</br>` became `<br>`. This is how I read John's answer "IF we can drop a dependency … remove the dependency".
- The `test_0_tools_to_default` E2E test hovers the `backed_up` badge and passes locally on both Playwright and Selenium. It saves `objectstore_badge_admin_message.png`.
- The worktree is now bootstrapped (`.venv`, built client).

## Draft PR opened 2026-10-12

John explicitly requested a draft PR. Keep it draft until he asks to mark it ready; CI is not its only blocker. Title: “Fix storage badge messages showing as literal HTML; restore their clickable popover”. Used the current prepared description verbatim, including John's existing human-read checkbox, with only the screenshot URL rewritten.

Rebased all six commits without conflicts onto `dev` at `9ac3cd2eb304f2860c0daf3afea0cc777f9e5cd6`; `git range-diff` confirms identical patches. Force-pushed only to the `jmchilton` fork with an explicit old-head lease. Before the rebase, client lint/unit tests, macOS and first startup, Tool Shed, Integration Selenium and Playwright workflows all passed on `25c077e8323`. New-head PR CI: 43 queued, one in progress, two skipped at creation.

Hosted the E2E screenshot on fork branch `pr-assets-issue_24031_badge_tooltip_html`, commit `b3e7163d8235f9bcb0db14b3f13394196c1d7c8c`. Its immutable raw URL is in the PR body. No images were committed to galaxy-brain.

## GOOD_MORNING — 2026-10-13

Current head `dfc97457e202` is mergeable with settled upstream CI. Client and browser checks pass; the sole failed workflow is package collection importing removed `pulsar.client.build_client_manager`, unrelated to badge rendering. Classified draft-ready. Preserve John’s explicit instruction to keep draft until he asks to mark ready.

## GOOD_MORNING — 2026-10-13

Requested failed-job reruns for diagnosed unrelated failures: [run 38275134221](https://github.com/galaxyproject/galaxy/actions/runs/38275134221). All requests accepted; reruns are pending, not passing coverage.

## Marius review follow-ups — 2026-10-13

[Review](https://github.com/galaxyproject/galaxy/pull/24069#pullrequestreview-5501066796) approved with four optional notes. Addressed in `b21056e70b8` (pushed to the fork; PR still draft):

- **Nested popovers / orphaned badge popover** — fixed. A badge opens a `GPopover` only when `interactive` and it has an admin message. Every other badge uses `v-g-tooltip.hover.html`, which is non-hoverable and closes on `mouseleave`. Inside template-summary and preferred-storage popovers it can no longer outlive the outer popover. Links in non-interactive mode render but are inert (pointer-events none, no Tab stop); the same storage's interactive badge elsewhere is the way to follow them.
- **Message changes after mount** — fixed structurally. The popover is `v-if`'d on that mode, so a change remounts it with fresh ARIA/keyboard wiring. Tested both directions with `setProps` on a mounted badge, which models `ObjectStoreBadges`' index-keyed reuse and `DatasetStorage`'s in-place replacement.
- **Badges without messages** — Tab stop removed (`span role="img"`, no popover). The duplicate spoken sentence remains for every `v-g-tooltip` user (it sets `aria-label` and `aria-describedby` to the same text). **Tabled** as a directive-wide question.
- **Tests** — added Tab from the trigger into the message link, a linked message in non-interactive mode (inert tooltip, closes on leave), the no-message tooltip, and the mode swap. Red-checked: the three new behaviour tests fail with the previous badge. **Tabled:** a unit-level real-sanitizer check, since DOMPurify is unreliable under happy-dom (project-wide mock). The real `ConfigurationMarkdown`/`links` path is exercised by the `test_objectstore_selection.py` E2E (rendered Markdown, link href, no literal `<p>`).
- **Not done here:** `GPopover` still doesn't rewire when its `interactive`/`triggers` props change on the same target. Badges no longer hit it; it's a latent galaxy-ui issue.

Icon layers moved to new `ObjectStoreBadgeIcon.vue`, so the button and span triggers share them without a dynamic-component directive. Client suites (727 tests), eslint, prettier and `vue-tsc` are clean. E2E not rerun locally; the fork push triggers PR CI. `pr_description.md` is updated for the tooltip/popover split. The human-read checkbox is unchecked for the new tests and the GitHub body has not been updated.

## TICK — 2026-10-13 evening

GitHub now reports OPEN, non-draft and mergeable at `b21056e70b8`; this TICK did not change draft status. Fresh CI remains queued/running, with no failures in the snapshot. Reclassified to `ready`; this is not a claim that current-head CI has finished.

## TICK — 2026-10-14

PR #24069 merged at 2026-10-14T06:25:30Z. Archived record under merged and removed from the queue. Clean worktree and zero unpushed commits verified; initial ghwt cleanup failed ENOTEMPTY on regenerated ignored files; retry succeeded, removed the worktree and pruned its registration.
