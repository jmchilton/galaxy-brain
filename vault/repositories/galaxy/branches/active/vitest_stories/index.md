# vitest_stories

Renamed from `storybook_prototype` on 2026-10-09; the worktree directory keeps the old name.

Status: prototype, not in `MY_BRANCHES.md`. No PR intent yet; John is evaluating it.

Worktree: `~/projects/worktrees/galaxy/branch/storybook_prototype` (ghwt). Pushed to `jmchilton/vitest_stories`.

- [Plan: Storybook Vitest addon](../../../../../projects/just_jesting_around/plan_vitest_addon.md), built on [vitest_story_play](../vitest_story_play/index.md)

## Why

John finds the client unit tests hard to hold in context: long files, mostly per-file mount setup (pinia, MSW, router, mocks) before the first `it`. Question: do Storybook stories, now that the client is Vue 3 (`@vue/compat`), help?

## Done

Base: `vitest_readability`. Infra commit `61f27ee52ad` (2026-10-09) now also carries the Vitest browser project from [vitest_story_play](../vitest_story_play/index.md) and per-test unmounting in `useStoryMount`; per-test commits follow (progress in [STORY_LOG](../../../../../projects/just_jesting_around/STORY_LOG.md)). Unmocked `/api/` requests fail stories; `useStoryMount` options are typed (see [infra review](infra_review.md#resolved)). The one rebase conflict (HistoryExportWizard.test.ts) kept the storified test; readability's `getFakeFileSource` adoption moved into its stories. [Infra review](infra_review.md). The sections below describe the original prototype commits.

Original `54d6b535b92`: Storybook 10.6 (`@storybook/vue3-vite`) plus `msw-storybook-addon` 3 on the client, with FormData as the first component.

- `client/.storybook/main.ts` reuses `vite.config.mjs`. It drops the dev-server and build-metadata plugins, as well as Storybook's `vue-template-compilation` plugin, whose alias to plain Vue 3 breaks bootstrap-vue. It forces the `@vue/compat` full build and turns docgen off (`vue-docgen-api` fails on the `BaseComponents` galaxy-ui wrappers).
- `client/.storybook/preview.ts`: `@/compat-config`, pinia, `installAppPlugins`, the app's global CSS (base.scss, theme variables, font, vue-multiselect CSS) and `mswLoader()`.
- `src/api/client/__mocks__/http.ts`: the typed openapi-msw handler builder, split out of the node-only `index.ts`, so stories and the vitest server share handlers.
- `FormData.stories.ts`: 18 scenarios. `FormDataWithModel` plays v-model's parent role, echoing `input` back into `value`. Tests turn the echo off (`vModel: false`) and call `setValue` explicitly, because the old tests echoed by hand in some places and the echo changes emissions.
- `FormData.test.ts` mounts composed stories and was rewritten from 611 to 352 lines (stories: 158). All original assertions are kept; 22 tests pass (the tag test was split into 3 cases).
- `tsconfig.json` has `paths` entries for Storybook and the msw addon's types, needed because `resolvePackageJsonExports: false` hides them; turning that on adds about 100 unrelated errors. It also includes `.storybook/*.ts`. `vue-tsc` is clean.

Original `8f1bf1d6e5e`: FilesDialog and HistoryExportWizard migrated.

- `tests/vitest/stories.ts` `useStoryMount()`: each mount applies the story's `parameters.msw` handlers (any addon form) to the vitest server, creates a fresh testing pinia and mounts. FormData now uses it too.
- `configurationHandler(config)` in `__mocks__/http.ts` answers `/api/configuration`. FilesDialog's `vi.mock("@/composables/config")` was replaced by this handler, so story and test share it.
- FilesDialog: the stories are API scenarios (the mocked remote file tree, with or without file source templates, directory mode), using named `msw.handlers` so a story overrides just `templates`. The `Utils` class and test bodies are unchanged. 15/15 pass; test file 495 → 402 lines, plus 101 lines of stories.
- HistoryExportWizard: the stories are the plugins the API offers (none, posix, Zenodo, user + default Zenodo). Step helpers (`next`, `setUpDestination`) replace repeated blocks. 14/14 pass; test file 469 → 180 lines, plus 69 lines of stories.
  - The old test skipped steps behind `if (x.exists())` guards. The helpers click unconditionally, and two guarded assertions are now unconditional ("My Zenodo" label, file-name input). This is stricter, and still green.
- The preview installs a memory router for router links.
- 24 files / 176 tests pass across the touched dirs plus a sample of other mock-server tests. `vue-tsc` is clean.

## Gotchas

- Calling `setProps` on a composed story remounts it, because `composeStory` builds a new component per render. Change state through the harness instead.
- A stale MSW service worker left "waiting" in the browser hangs stories on the spinner, or makes API calls 404. The cause was `prettier --write .storybook` reformatting `mockServiceWorker.js`, which makes the browser install a new worker. `.storybook/public` is now in `.prettierignore`. If it recurs, unregister the service worker and reload.
- Stories log Vue compat deprecation warnings plus one "compat behavior is disabled" error (COMPONENT_V_MODEL). It's not checked whether the app logs the same.
- Run with the pinned node: `npm_config_use_node_version=22.20.0 pnpm storybook` (port 6006).

## Next

John to review the three migrations. Browser-mode work continues on [vitest_story_play](../vitest_story_play/index.md).
