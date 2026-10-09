# storybook_interactions

Status: prototype, stacked on `storybook_prototype`; not in `MY_BRANCHES.md`. No PR intent yet.

Worktree: `~/projects/worktrees/galaxy/branch/storybook_interactions` (`git worktree add` from `storybook_prototype`, not ghwt, since it's stacked). Pushed to `jmchilton/storybook_interactions`.

- [Plan: Storybook Vitest addon](../../../../../projects/just_jesting_around/plan_vitest_addon.md)
- [Pipeline branches](../../../../../projects/just_jesting_around/PIPELINE_BRANCHES.md)

## Done

`1bc00618a5f`: Storybook's Vitest addon plus browser mode.

- `vitest.config.mts` has `test.projects`: `unit`, which is the existing happy-dom config unchanged (`extends: true`), and `./vitest.storybook.config.mts`.
- `vitest.storybook.config.mts` builds on `vite.config.mjs` instead of the unit config: none of the unit config's test-only aliases or mocks apply in the browser. It adds `storybookTest()`, `@vitest/browser-playwright` with headless Chromium, and `.storybook/vitest.setup.ts` (`setProjectAnnotations` of the preview).
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

## Next

- Plan steps 2–5: port 3–4 FormData cases to play functions, compare wall time, decide on compat console errors, and take Interactions-panel screenshots.
- Add a CI job for `test:browser` (open question: blocking or not).
