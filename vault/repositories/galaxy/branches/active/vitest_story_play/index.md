# vitest_story_play

- [PR #24300](https://github.com/galaxyproject/galaxy/pull/24300)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/vitest_story_play)

Renamed from `storybook_interactions` on 2026-10-09; the worktree directory keeps the old name.

## Status

Status: `author_work` — combined play/accessibility RFC with known strict accessibility failures and missing browser CI.

Draft [#24300](https://github.com/galaxyproject/galaxy/pull/24300) targets `dev`, including the readability and story layers; head `3eaa09792d688138b2107ee436f99431f96de0d3`.

CI: no checks reported at creation.

Worktree: `~/projects/worktrees/galaxy/branch/storybook_interactions` (`git worktree add` from `vitest_stories`, not ghwt, since it's stacked). Pushed to `jmchilton/vitest_story_play`.

- [Plan: Storybook Vitest addon](../../../../../projects/just_jesting_around/plan_vitest_addon.md)
- [Pipeline branches](../../../../../projects/just_jesting_around/PIPELINE_BRANCHES.md)

## Consolidated play and accessibility — 2026-10-20

Published head `3eaa09792d688138b2107ee436f99431f96de0d3`; parent `fd5fd27f67aaa9d974b2d3cbc693ef8fa0a31864`.
Four infrastructure/helper commits precede 96 per-test commits. The 26 annotated
stories are folded into their owning tests; original test messages and trailers
are retained. The exact final source tree is unchanged from the former accessibility
tip `b6d4c40d6c42af7eb469bc7b920e69433eddee9c`. The separate accessibility branch tracking was dropped at John’s request;
its [historical notes](../../abandoned/vitest_story_a11y/index.md) are archived. Maintain only this lane. Independent `fix_story_a11y_followups` is unaffected.

[Current implementation](implementation_debrief.md),
[consolidation review](../../../../../projects/just_jesting_around/reviews/combine_play_a11y_2026-10-20/review_debrief.md),
and [commit mapping](../../../../../projects/just_jesting_around/reviews/combine_play_a11y_2026-10-20/commit_mapping.json).

## Done

2026-10-09: the browser-project infra moved down into `vitest_stories`' infra commit, so this lane holds only play commits, one per test (progress in [PLAY_LOG](../../../../../projects/just_jesting_around/PLAY_LOG.md)). Tip `47cb8ba80ae` (HistoryExportWizard, 12 of 14 cases as plays): browser 34/34. [Infra review](../vitest_stories/infra_review.md).

Infra (originally `b4b0c93a433` here, now in `vitest_stories`): Storybook's Vitest addon plus browser mode.

- `vitest.config.mts` has `test.projects`: `unit`, which is the existing happy-dom config unchanged (`extends: true`), and `./vitest.storybook.config.mts`.
- `vitest.storybook.config.mts` builds on `vite.config.mjs` instead of the unit config: none of the unit config's test-only aliases or mocks apply in the browser. It adds `storybookTest()`, `@vitest/browser-playwright` with headless Chromium (the separate `vitest.setup.ts` was removed in the polish).
- `.storybook/viteConfig.ts` `adaptViteConfig()` is the old `viteFinal` body, shared by Storybook and the browser project.
- Scripts: `test`, `test:watch`, `test:ui` and `test:coverage` are pinned to `--project unit`, so CI (`client-unit.yaml` runs `pnpm test`) and the Makefile are unchanged. `test:browser` runs `--project storybook`.
- `addons` includes `@storybook/addon-vitest`, which adds the test panel in the Storybook UI.
- First play function: HistoryExportWizard `ExportsDirectDownload`, using `fn()` for `onOnExport`, role queries and `userEvent`. It went red for the right reason first (wrong destination), then green.
- Results:
  - Browser project: 27/27 (26 render smoke tests plus 1 play).
  - Full unit project: 564 files, 4335 tests pass.
  - `vue-tsc` is clean, and `build-storybook` works.

## Gotchas

- Before the first run, do `pnpm exec playwright install chromium`; the browser version is pinned to the node `playwright` 1.64.
- `resolve.tsconfigPaths: true` in `vite.config.mjs` makes vite follow tsconfig `paths`. The prototype mapped `msw-storybook-addon/csf3` to its `.d.mts`, so vite pre-bundled the declaration file as an empty module ("does not provide an export named 'mswLoader'"). It's replaced by the `types/msw-storybook-addon.d.ts` shim. Any `paths` entry has to point at code, not declarations; the Storybook ones use extensionless `dist/index`, which resolves to `.js`.
- Event listener args are `on` plus the event name, so `onExport` becomes the `onOnExport` arg.
- The browser run warns `Invalid input options ... "define"` (rolldown optimizer); it's harmless, and the cause isn't chased.
- Config loading prints native-config warnings; set `VITE_CONFIG_NATIVE_IGNORE_WARNING=true`.

## Rebased onto the clean stack — 2026-10-13

Rebased the 68 play commits onto the new `vitest_stories`, which now sits on readability, `fix_story_a11y` and latest dev. A11y checks were moved into plays or kept beside them. 27 plays in 9 files broke on a11y's markup and were repaired in their owning commits. Dropped the FormNumberList plays commit. 67 commits. Type-check passes; unit 582 files; browser 67 files / 419 tests. Pushed `b9d034bf9f1` with lease on `8f8725d5bf4`, then `c4941bce373` on stories `1d8c99cd058`. [Cascade record](../vitest_readability/subagents/rebase_cascade_2026-10-13.md).

## Next

- Plan steps 2–5: port 3–4 FormData cases to play functions, compare wall time, decide on compat console errors, and take Interactions-panel screenshots.
- Add a CI job for `test:browser` (open question: blocking or not).

## Restacked onto published stories — 2026-10-16

Published `fd94d33f27719db097932206e99f32d302a3a5a9` on `jmchilton/vitest_story_play`, based on stories `4e60254eded0e18ae7737161fec2ce42c16c770f`. Replayed only the 99 commits above actual old stories cut `f2a726da91a19e070a60d6d42cfa6f946ea06a47`, preserving all messages and trailers. Original play head `5673676726e0ae2430cb0d73f28cf61b60eaae0b` remains at `backup/vitest_story_play-before-clean-restack-20261016`. Exact old-head lease used; remote verified.

Kept play changes by default and retained current dev/story assertions. Adapted current controls, popovers and live job UI without weakening checks. [Implementation and validation](implementation_debrief.md), [normal review and scoped challenge](subagents/rebase_2026-10-16.md), [conflict resolutions](rebase_resolutions_2026-10-16.md), and [commit mapping and dependency audit](../../../../../projects/just_jesting_around/readability_assessment/story_restack_2026-10-16.json). Prototype and no-PR status remain. The separate a11y and real-API branches were audited but not rebased in this core restack.

## Dependent rebase — 2026-10-20

Published `735da91611e343c370e5150d619691ad4407b112` onto parent `fd5fd27f67aaa9d974b2d3cbc693ef8fa0a31864`. All 99 own-layer messages/trailers preserved, exact original remote-head lease and resulting remote SHA verified. Published prototype; no upstream PR intent. [Current validation and decisions](implementation_debrief.md); [scoped challenge](test_challenges_debrief.md).

## RFC publication — 2026-10-20

John explicitly requested opening this branch with title `[RFC][WIP] Adopt Storybook for richer, easier review of client unit tests`, superseding the prior reference-only/do-not-PR instruction. Opened as a draft for discussion, not merge readiness. Preserve draft status until John asks otherwise; known accessibility failures and missing browser CI remain. Published source unchanged; no rebase or new test run. [Description](pr_description.md).
