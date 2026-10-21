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

## Rebased onto the clean readability — 2026-10-13

Rebased the 109 story commits from old readability `510a2d39a92` onto `7f2db5e5941`, which now sits on `fix_story_a11y` and latest dev. Kept a11y's new checks in the storified tests: InstallationSettings, WorkflowInvocationState, ListCollectionCreator, QuotaForm, RoleForm, ChangePassword, ScrollList, FormOptionalText and ToolCard now mount stories. FormSelect's default-id case mounts FormSelect directly again. Dropped the FormNumberList story commit (component deleted upstream). 108 commits. Type-check passes; unit 586 files / 5231 tests; browser 65 files / 260 tests. Pushed `1c13e48dc19` with lease on `20c515a9661`. [Cascade record](../vitest_readability/subagents/rebase_cascade_2026-10-13.md).

## Next

John to review the three migrations. Browser-mode work continues on [vitest_story_play](../vitest_story_play/index.md).

## Restacked onto cleaned readability — 2026-10-16

Published `4e60254eded0e18ae7737161fec2ce42c16c770f` on `jmchilton/vitest_stories`, based on cleaned readability `e06bbc4c70271aacfe27a88e315c882b5270ecaa`. Replayed only the 159 commits above historical churn-inclusive readability `7f2db5e59415f07c09fec5be75ff4885fbad047e`; all commit messages and trailers preserved. Original head `b1ba6eac0fd36c58256f9e8cdda9061cb7713697` remains at `backup/vitest_stories-before-clean-restack-20261016`. Exact old-head lease used; remote verified.

User clarified churn scores were estimates: preserve story content by default, resolving concrete conflicts, lost assertions or current-dev incompatibilities. No blanket removal across the 25 overlapping paths. [Final implementation and validation](implementation_debrief.md), [review/challenge](subagents/rebase_2026-10-16.md), [conflict resolutions](rebase_resolutions_2026-10-16.md), and [commit mapping](../../../../../projects/just_jesting_around/readability_assessment/story_restack_2026-10-16.json). Prototype status and no-PR intent remain. Play is now published above this head at `fd94d33f277`, with 99 layer commits; see [play record](../vitest_story_play/index.md).

## Dependent rebase — 2026-10-20

Published `fd5fd27f67aaa9d974b2d3cbc693ef8fa0a31864` onto readability `1358d37887996e552e0fac6467c8738865618d9a`. 159 own-layer commit messages/trailers preserved; exact old-head lease and remote SHA verified. READY as a published prototype; no upstream PR intent. See [current implementation and validation](implementation_debrief.md), [test challenge](test_challenges_debrief.md), and [cascade mapping](../../../../../projects/just_jesting_around/readability_assessment/dependent_rebase_2026-10-20.json).


## History organization — 2026-10-20

Published `1a4eb0e275cfaa60b1112c554232d1c4e369dc8c` with the exact preceding-head lease. One shared-infrastructure commit is first, followed by GDropdownItem as the example, then the remaining per-test conversions. 102 own-layer commits; final source tree is identical to the preceding head.

All existing branches remain complete. No smaller review branches or PRs were created. The agreed future extraction is small domain batches (roughly 5–10 tests), when John requests it. Original heads remain in local recovery refs under `refs/archive/test-history-20261020/`. [History reorganization and verification](../../../../../projects/just_jesting_around/history_reorganization/README.md). No source changes or new test runs; existing review/CI/accessibility holds remain.


## Helpers with their consumers — 2026-10-20

Published `bf693b79ac92f3e4df42ccde03137e87a1ee88ef` using the exact preceding-head lease. The opening commit contains 18 framework files. The 41 fixture/helper paths now move with their first consuming tests, including partial module updates where exports have different consumers.

All five final source trees remain identical to their preceding heads. The full experiment remains on the existing branches; no domain branches or new PRs were created. [Helper colocation, verification and current commit links](../../../../../projects/just_jesting_around/history_reorganization/consumer_colocation_2026-10-20/README.md). Existing draft, CI and full-catalog accessibility holds remain.
