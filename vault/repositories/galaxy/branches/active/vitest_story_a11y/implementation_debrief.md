# Implementation debrief

READY as an isolated prototype; retain as reference only, do not PR independently.
Pushed `jmchilton/vitest_story_a11y` at `f43e9950dca7c322cfbb66def9961b301e854345`.
Stacked on the pushed `vitest_story_play` tip `19b6b1a85542397c258748f6b075f4d25f4c8053`.

Added matching `@storybook/addon-a11y@10.6.1` (axe-core 4.14.0), body-scoped
checks including teleports, strict errors by default, and WCAG 2.2 AA alongside
the default A/AA and best-practice rules. Added 1280px desktop, 400px panel,
and 375px mobile viewport presets. Existing built-in measure/outline tools
and the addon's vision simulations and diagnostic highlighting are available.
No production component, conversion branch, ledger, CI, or cloud setup changed.

The initial strict run covered 236 stories: 115 passed, 120 failed axe, and one
refresh assertion failed before its audit. A rerun reached that story's axe
checks and found existing violations too. The final catalog has 121 explicitly
excepted stories, each naming observed rules, and 115 strict stories. New stories
inherit strict checks unless they spread an existing exception. The committed
`client/.storybook/A11Y_AUDIT.md` is the dated story-by-story inventory.

`todo` exceptions audit and display findings in Storybook, but do not output
accessibility diagnostics or fail CLI/CI; new violations in these entire
stories are also nonblocking. This is enablement and a backlog inventory,
not a claim of full accessibility coverage. No rules were disabled to obtain
a green run. Keyboard/focus/name plays and manual review remain necessary.

## Validation

- All 236 Chromium stories pass after annotations and review fixes.
- Affected happy-dom suites: 3 files, 14 tests pass.
- Final client typecheck, changed-file ESLint, Prettier check, diff check pass.
- Static Storybook build passes; existing Vue compat/bundler/font warnings remain.
- Negative controls: named button passes; unnamed button appended to `body`
  fails `button-name`; crowded named controls in a fresh browser run fail
  exactly WCAG 2.2 `target-size`. Disposable probes removed before committing.
- Four actual Storybook screenshots inspected: clean GButton, live
  InstallationSettings diagnostics, viewport menu, and FilesDialog at 400px.
- Vault validation: 122 files, zero errors, 15 advisory warnings.

Independent normal, test-challenge, quality, scope, and screenshot reviews
completed. Reviews caught three source-story MSW parameter overwrites from the
new annotations; fixed by merging inherited parameters. Existing assertions
and fixtures remain intact. Scope recommendation: keep the prototype as built.

## Visual migration case

The project pitch now explains why pre-migration visual baselines can protect
appearance during BootstrapVue replacements and Vue 3 changes: spacing,
wrapping, clipping, icons, and overlays can change while behavior stays green.
It compares Chromatic's hosted review workflow to Vitest's local screenshot
assertions and explains final-play-state capture and stable environments.
No claim that a specific historical Galaxy bug would have been prevented.
No automated pixel comparisons are added. A small deterministic visual pilot
and browser CI are separate rollout work.

The worktree's Storybook is running on http://localhost:6017 for inspection.
The usual script targets port 6006; use another port when the lane's server is
already running. No PR description or PR was created.

Galaxy-brain notes are committed locally. Its existing unrelated outgoing
commits prevent a safe notes-only push, so they are left unpublished.
