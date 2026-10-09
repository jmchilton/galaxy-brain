# storybook_prototype

Status: prototype, not in `MY_BRANCHES.md`. No PR intent yet; John is evaluating it.

Worktree: `~/projects/worktrees/galaxy/branch/storybook_prototype` (ghwt). Pushed to `jmchilton/storybook_prototype`.

- [Plan: Storybook Vitest addon (pinned)](plan_vitest_addon.md)

## Why

John finds the client unit tests hard to hold in context: long files, mostly per-file mount setup (pinia, MSW, router, mocks) before the first `it`. Question: do Storybook stories, now that the client is Vue 3 (`@vue/compat`), help?

## Done

`54d6b535b92`: Storybook 10.6 (`@storybook/vue3-vite`) plus `msw-storybook-addon` 3 on the client, with FormData as the first component.

- `client/.storybook/main.ts` reuses `vite.config.mjs`. It drops the dev-server and build-metadata plugins, as well as Storybook's `vue-template-compilation` plugin, whose alias to plain Vue 3 breaks bootstrap-vue. It forces the `@vue/compat` full build and turns docgen off (`vue-docgen-api` fails on the `BaseComponents` galaxy-ui wrappers).
- `client/.storybook/preview.ts`: `@/compat-config`, pinia, `installAppPlugins`, the app's global CSS (base.scss, theme variables, font, vue-multiselect CSS) and `mswLoader()`.
- `src/api/client/__mocks__/http.ts`: the typed openapi-msw handler builder, split out of the node-only `index.ts`, so stories and the vitest server share handlers.
- `FormData.stories.ts`: 18 scenarios. `FormDataWithModel` plays v-model's parent role, echoing `input` back into `value`. Tests turn the echo off (`vModel: false`) and call `setValue` explicitly, because the old tests echoed by hand in some places and the echo changes emissions.
- `FormData.test.ts` mounts composed stories and was rewritten from 611 to 352 lines (stories: 158). All original assertions are kept; 22 tests pass (the tag test was split into 3 cases).
- `tsconfig.json` has `paths` entries for Storybook and the msw addon's types, needed because `resolvePackageJsonExports: false` hides them; turning that on adds about 100 unrelated errors. It also includes `.storybook/*.ts`. `vue-tsc` is clean.

## Gotchas

- Calling `setProps` on a composed story remounts it, because `composeStory` builds a new component per render. Change state through the harness instead.
- A stale MSW service worker left "waiting" in the browser hangs stories on the spinner. Unregister it and reload.
- Stories log Vue compat deprecation warnings plus one "compat behavior is disabled" error (COMPONENT_V_MODEL). It's not checked whether the app logs the same.
- Run with the pinned node: `npm_config_use_node_version=22.20.0 pnpm storybook` (port 6006).

## Next

Migrate `FilesDialog` and `HistoryExportWizard` the same way, then revisit the [Vitest addon plan](plan_vitest_addon.md).
