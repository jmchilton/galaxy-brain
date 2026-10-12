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
Status: draft `ci_wait`. [PR #24069](https://github.com/galaxyproject/galaxy/pull/24069), opened 2026-10-12 against `dev`. Pushed commit: `dfc97457e202ff8789a5026c9ab9d1f07f171f0c`.

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
