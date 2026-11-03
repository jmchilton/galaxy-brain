---
upstream_base_branch: dev
---
# Client test readability and Storybook foundation

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:vitest_story_foundation?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/vitest_story_foundation)

## Status

Built and pushed 2026-11-02; head `e27f0e5bdf1`, on dev `38dc259318c`.

No PR yet; John to approve title and description.

Fork CI pending, including the new blocking Storybook browser step.

## Scope

Extracted from the [standing branch](../../../../../agents/gx_standing/standing_branches/vitest_story_play/index.md) so the infrastructure can land ahead of domain batches. The full lanes remain the demo, to be restacked onto this branch. Worktree: `~/projects/worktrees/galaxy/branch/vitest_story_foundation` (`git worktree add`, not ghwt).

1. README readability guidance (`9f0e88c2bd6`).
2. Readability examples: parseBool, UserBeaconSettings, Register, RDMDestinationSelector (adds `fileSources` factory), HistoryExportWizard factory use, GDropdownItem.
3. Storybook infra, stories, plays and a11y in one commit (`a77751a33d0` + `9784684e281`). Monaco `editor.main.js` type dropped (its consumer is the later ToolSource story). Lockfile regenerated against current dev.
4. GDropdownItem story + play. Standalone item stories now render inside `role="menu"`, fixing axe `aria-required-parent` (red in the trial, green after).
5. HistoryExportWizard story + play (`57a5f234753` + `8ff7257aa59`); keeps its existing `a11y: todo` button-name exceptions.
6. `client-unit.yaml` installs Chromium and runs `pnpm test:browser` as a blocking step.

## Decisions

- 2026-11-02 John: story and play infra merge into one commit; browser CI blocking, in its own commit; add HistoryExportWizard; name `vitest_story_foundation`; make this the base of the other lanes.

## Validation — 2026-11-02

Full unit suite at the infra commit: 675 files, 5,485 tests, one skipped. Type-check after infra, GDropdownItem and HistoryExportWizard commits. Browser cold cache at tip: 2 files, 12 tests. `build-storybook` passes. Frozen-lockfile install passes.

## Gotchas

- Local pre-commit configs copied from `.pre-commit-config.yaml.sample` before the infra commit reformat `.storybook/public/mockServiceWorker.js`; commit that file with `SKIP=prettier` or update the local config.
- A warm Storybook vite cache from an earlier, narrower run can fail with `Failed to fetch dynamically imported module … deps/axe-core.js`; rerun or clear `node_modules/.cache/storybook`.
