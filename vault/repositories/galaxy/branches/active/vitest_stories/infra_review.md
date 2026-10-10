# vitest_stories / vitest_story_play: infra review

Reviewed 2026-10-09 by Claude: both infra commits, `e54de305e6e` on `vitest_stories` and `1123c82e1e2` on `vitest_story_play`. Polish was folded into those commits. The test commits are byte-identical: `git range-diff` shows `=` for all four.

## New SHAs

| Branch | Infra | Tip | Backup |
|---|---|---|---|
| `vitest_stories` | `d61a7c26e00` | `289378d7550` | `backup/vitest_stories-pre-polish` (`ccfa4aafdeb`) |
| `vitest_story_play` | `353ca044db7` | `500a326223c` | `backup/vitest_story_play-pre-polish` (`05696d366f2`) |

Nothing was pushed. The fork branches now diverge, so the next push needs `--force-with-lease`.

## Fixed

### In the stories infra commit (`d61a7c26e00`)

- **Bug: `vitest_stories` didn't build on its own.**
  - `tsconfig.json` mapped `msw-storybook-addon/csf3` to the `.d.mts`. `vite.config.mjs:54` sets `resolve.tsconfigPaths`, so vite loaded the declaration file and `storybook build` failed with `MISSING_EXPORT mswLoader`.
  - The fix (the `types/msw-storybook-addon.d.ts` shim) had only landed in the play commit. I moved it down; `build-storybook` now passes on both branches.
- **`mockServiceWorker.js` was the prettier-reformatted copy.** This is the copy the "waiting worker" gotcha warns about.
  - Restored it byte-for-byte from `node_modules/msw/lib/` (msw 2.10.5).
  - Root cause: Galaxy's pre-commit sample runs prettier without reading `.prettierignore`. Added the worker to its `exclude` in `.pre-commit-config.yaml.sample`.
  - Your hook runs the main clone's sample, so committing a worker change still needs `SKIP=prettier` until this lands.
- **One typed `http` instance.**
  - `__mocks__/index.ts` used to build its own `http` with `createApiClientMock()`. It now reuses `http.ts`'s export.
  - `createApiClientMock` is gone; it had no other caller.
- **`tests/vitest/stories.ts`: removed `story as any`.**
  - `mountStory` now takes `ComposedStory` (`FunctionalComponent` plus the story's `parameters`). All three callers type-check unchanged.
  - Un-exported `storyHandlers`, which had no external caller.
- **`.storybook/main.ts`: `core: { disableTelemetry: true }`.**
  - `storybookTest()` loads Storybook presets during vitest runs, so telemetry fired on test runs, including an agent-detection reporter.
  - It's a one-line revert if you want it back.
- **Ignored `client/storybook-static`** (the build output) in `.gitignore` and `.prettierignore`.

### In the play infra commit (`353ca044db7`)

- **Removed `.storybook/vitest.setup.ts` and its `setupFiles` entry.** Since Storybook 10.3, `storybookTest()` applies the project annotations itself. With the file present it skipped that step and printed an info box asking for the file's removal, on every `pnpm test` too. After removal, MSW still intercepts in the browser run and all 27 tests pass.
- **`main.ts` now imports `./viteConfig.ts`.** The extensionless import triggered Storybook's "extensionless imports" warning on every vitest run.
- **`vitest.storybook.config.mts` comments.** One says why `command: "serve"` is there (so galaxy-api-client resolves to source). One says why there's no setup file.

## Findings left for John

1. **`pnpm test` (`--project unit`) still loads the Storybook project config.** `vitest.config.mts:133` lists it in `projects`, and vitest loads every project before filtering, so every CI unit run boots Storybook presets. Also, a bare `vitest FormData` with no `--project` matches `FormData.stories.ts` and starts Chromium.
   - Options: keep this; gate the storybook entry behind an env var; or move browser runs to their own config (`vitest -c vitest.storybook.config.mts`).
2. **Unmocked API calls don't fail stories.**
   - The browser run logs MSW "intercepted a request without a matching handler" for `GET /api/configuration` and `/api/datatypes`, plus many vite module requests (`/src/**/*.vue`).
   - Suggestion: pass `mswLoader()` a setup that starts the worker with an `onUnhandledRequest` that errors on `/api/` and bypasses everything else, mirroring the unit server's `missingHandlerFallback`. Stories would then need complete handlers.
3. **`useStoryMount` options shape** (`tests/vitest/stories.ts:40-44`). This matters before ~250 conversions.
   - A caller's `global` replaces `getLocalVue()` wholesale instead of merging (HistoryExportWizard passes `global: localVue`).
   - `stubActions: false` is hard-coded, while 80 existing tests use the default `true`.
   - Options are `Record<string, unknown>` because callers rely on the VTU adapter's legacy top-level `stubs`, `router` and `pinia`.
   - Decide whether to merge `global` and accept pinia options. Also consider exporting a `StoryOf<typeof stories>` type: all three tests repeat `(typeof stories)[keyof typeof stories]`.
4. **The checked-in worker can go stale.**
   - `msw` is in `pnpm.ignoredBuiltDependencies` (`package.json:57`), so msw's postinstall never refreshes it, and a `msw` bump leaves a version-mismatch warning.
   - Options: keep it committed and add `"msw": {"workerDirectory": ".storybook/public"}` plus a note to rerun `msw init`; or generate it in the `storybook`/`test:browser` scripts and gitignore it.
5. **tsconfig `paths` (`tsconfig.json:20-23`) are load-bearing at runtime.**
   - `resolve.tsconfigPaths` makes vite follow them, bypassing package `exports` conditions. The msw bug above is one instance.
   - They work because they point at `dist/index` JS. Any future entry must point at code, not `.d.ts`. Turning on `resolvePackageJsonExports` would remove them, at the cost of about 100 unrelated errors.
6. **Version pins.**
   - Storybook packages and `msw-storybook-addon` are exact (`package.json:201-242`), while the rest of the file uses `^`. Exact pins keep Storybook's lockstep packages in sync. Keep them, or switch to `^` for consistency.
   - `@storybook/vue3` is a direct dependency only because the tsconfig path needs it at the top of `node_modules`.
7. **Lockfile churn is small.** Besides the additions, there are about 25 removed lines: vitest and coverage-v8 entries re-snapshotted for the new peer set, and optional `is-core-module`, `path-parse`, `supports-preserve-symlinks-flag` and `tagged-tag` entries dropped. Nothing unrelated was bumped.
8. **`configurationHandler`** (`http.ts:44`) uses `response.untyped`. That's intentional, since partial configs don't match the schema type; left as is.
9. **No upstream docs.** The client README's "Client-Side Unit Testing" section doesn't mention stories, `pnpm storybook` or `test:browser`. The conventions live only in the vault.
10. **Open questions in the plan, not touched:** whether browser CI blocks merges, the `.browser.test.ts` suffix versus a directory, and `addon-a11y`. No CI job was added.

## Reuse check

The new code builds on existing pieces:

- `useStoryMount` uses `useServerMock`, `getLocalVue` and the VTU adapter.
- The preview uses `installAppPlugins` and the app's own global styles.
- The Storybook and browser configs adapt `vite.config.mjs` instead of copying it.
- Stories use existing fixtures: `testingData.ts` and `Datatypes/test_fixtures`.

`configurationHandler` is the one new reusable helper. About 28 existing test files hand-roll the same `/api/configuration` handler and could adopt it.

## Validation (pinned node 22.20.0, one suite at a time)

- `vitest_stories` tip:
  - `vue-tsc` is clean.
  - 21 test files pass: the 3 story-backed tests plus sampled mock-server and response-stamping tests.
  - `storybook build` passes (26 stories); before the fix it failed.
- `vitest_story_play` tip:
  - `vue-tsc` is clean.
  - `pnpm test` over every `useServerMock`/`useStoryMount` test: 140 files, 1079 passed, 1 skipped.
  - `test:browser`: 27/27, with no info box and no extensionless warning.
  - `storybook build` passes.
- Prettier is clean and eslint has no errors on the touched files. The warnings are the 2 `any`s in `http.ts`, moved unchanged from `index.ts`.
- The Storybook dev server on :6006 was left running. The worker bytes changed, so a browser tab open on it may hold a "waiting" service worker; unregister it and reload.

## Resolved

2026-10-09, after the rebase onto `vitest_readability`. Infra `6b0a3a4f00c`.

- **Finding 2.**
  - Storybook's worker (`.storybook/msw.ts`) answers an unmocked `/api/` request with the same Galaxy 500 as the unit server, using the shared `missingHandlerResponse`.
  - The preview's `afterEach` fails the story once in-flight requests settle.
  - `appHandlers` (configuration, datatypes) are the named defaults.
  - Stories must name their handlers so they merge with the defaults. FormData and HistoryExportWizard were switched from arrays.
  - Checked by removing the defaults: two stories fail, naming the requests.
- **Finding 3.**
  - `StoryMountOptions` is typed: `props`, `global` (merged), `router` and `pinia` (actions run by default).
  - `useStoryMount` installs `appHandlers` too.
  - Added `StoryOf<>`.
  - Tests moved off legacy top-level `stubs` and HistoryExportWizard's `getLocalVue(true)`.
- **Validation at the play tip:** unit 564 files / 4682 tests, browser 27/27, `vue-tsc` and eslint clean.
