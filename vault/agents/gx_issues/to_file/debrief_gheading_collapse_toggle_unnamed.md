# Debrief: gheading_collapse_toggle_unnamed

## Research

- Source row: BUGS_FOUND "Collapse toggle has no accessible name..." (play lane, InstallationSettings, marked Unconfirmed). Now confirmed.
- dev sha: `20f365a2654751ba0f390733f261199ceb3f272d` (fresh origin/dev).
- Scratch worktree: `/private/tmp/claude-503/-Users-jxc755-projects-repositories-galaxy-brain-vault-agents-gx-issues/8085a6b3-fc13-41f7-b964-fa636a69fe53/scratchpad/B/wt` (left in place).
- Repro: `client/packages/ui/src/components/GHeading.test.ts` (untracked in the worktree). Run with `npm_config_use_node_version=22.20.0 pnpm exec vitest run packages/ui/src/components/GHeading.test.ts`. Both cases (separator and plain) are red on dev: the accessible name is `""`. The name is computed with jest-dom's `toHaveAccessibleName` (dom-accessibility-api), which `tests/vitest/setup.ts` already loads and `GTable.test.ts` uses. This is a real name computation, not just an attribute check.
- Trial fix (`useUid("g-heading-")` id on the heading, plus `aria-labelledby` and `aria-expanded` on the GButton): the repro turns green, and 13 related test files (102 tests) still pass. Reverted afterwards. The patch is saved at `.../scratchpad/B/fix.diff`, which doesn't include the test file. A first try used Vue's `useId`. It was dropped because galaxy-ui's peer dependency is `vue ^3.4` (`useId` needs 3.5) and galaxy-ui already has `composables/uid.ts`.
- Consumers: 7 `collapse=` usages under `client/src`. All use `separator`, and all import `Common/Heading.vue`, which re-exports `GHeading`. The non-separator collapse branch has no in-repo consumer. The Tool Shed frontend uses galaxy-ui but not `GHeading`.
- Clickable heading text: in the separator layout, the `<h*>` sibling has its own `@click="$emit('click')"`. In the plain layout, the button sits inside the `<h*>` and the click bubbles up. The heading has no `tabindex` and no button role, so clicking it is mouse-only.
- Existing disclosure patterns: `AuthoringHelpPanel.vue` (a GButton with icon, text and `aria-expanded`), `ToolPanelLabel.vue` (`role=button` and `aria-expanded` on a div), `ToolSection.vue` (`a role=button` and `aria-expanded`), and `GDropdown`/`GPopover` (`aria-expanded` on the toggle). I considered the single-button model and rejected it: DatasetView's slot holds block divs, which aren't valid inside a button, and the separator grid layout would break.
- Play evidence: on `jmchilton/galaxy@vitest_story_play`, `InstallationSettings.stories.ts` uses `findByRole("heading", { name: "Show advanced settings" })` to open the section.
- Origin: #16983 ("Persistent toggle sections of job info", 2024-04) added the collapse feature (commits 129d3c24a6b and cee7cd83f56) with an icon-only `b-button`. #19990 ("Button replacement batch 2") swapped it for `GButton`, still unnamed. Commit 2dc61a132c9 later folded Common/Heading into galaxy-ui's `GHeading`.
- Duplicates: `gh search issues`/`prs` for "GHeading", "GHeading collapse accessible", "Heading collapse aria-expanded", "collapse toggle accessible name", "icon-only button aria-label", "aria-expanded heading", "accessibility collapsible heading", "accessible name", "screen reader". None found. Related but distinct: #21412 (a vague Tool Shed 2.0 icon accessibility tracker, a different frontend) and #24012 (GCard owner badges not keyboard-operable).
- Unverified: real browser and screen reader output (happy-dom plus dom-accessibility-api only). Whether a consumer passes `id` to a plain-layout heading wasn't checked exhaustively, so the proposal says to use the consumer's id when one is passed.

## Review round (subagent)

- Repro rerun: both layouts still red on dev 20f365a2654. The trial fix (`fix.diff`) turns them green, 28 consumer and `GModal` test files pass, and the fix was reverted.
- Origin PRs verified: #16983 (24.1) shipped an untitled `b-button`; #19990 (25.0) swapped it for `GButton`. The keyboard-impact framing is accurate: the heading text is mouse-only.
- Title changed to say `Heading` (what every consumer writes). Fixed a wrong claim: the Tool Shed frontend does use `GHeading`, but never with `collapse`. The list of passing tests now names only suites that were actually run.

## Leftover

- Overlaps with the GModal proposal, which also passes an `id` to its title `GHeading`. The two don't clash; if both land, one `id` that always targets the `<h*>` could serve both.
- `DatasetView`'s toggle name would include the hid, name and state text. Long, but acceptable.
- Not checked in a real browser or screen reader; evidence is happy-dom plus dom-accessibility-api.
