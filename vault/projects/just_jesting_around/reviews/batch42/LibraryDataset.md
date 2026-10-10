# LibraryDataset

Selected originator: `client/src/components/Libraries/LibraryFolder/LibraryFolderDataset/LibraryDataset.test.js`. Baseline and final: **9 tests**.

The mount helper loses its `localVue`/`router` parameters for a module-level `getLocalVue()` (its default router serves the breadcrumb and links, replacing the deprecated `injectTestRouter`), takes `{ isAdmin }` as a named option, and mounts with Vue Test Utils v2 options (`props`, `global: withPlugins(localVue, createPinia())`, `global.stubs`) instead of the adapter-translated `propsData`/`pinia`/top-level `stubs`. The two identical hand-built provider stubs become `loadedProviderStub(item)`, keeping the compat note. Selectors move into a `SELECTORS` constant, the ten `toContain` lines on the details table loop over a named `TABLE_FIELDS` list, the `Services` mock drops its unused callback parameters, and cases are renamed after behaviour; the path-style describe becomes `LibraryDataset`.

Removed dead mocks: `vi.mock("app")` and `vi.mock("onload/loadConfig")`. Neither id resolves to a module in the tree (no `app` or `onload/` alias in `vitest.config.mts`; the code imports `@/onload/loadConfig`), so neither ever took effect. Per-file coverage of `LibraryDataset.vue` is identical with and without them (46.93 % statements, 86.53 % branches, 51.51 % functions).

The user is still seeded right after mount, as before; the seed is now `getFakeRegisteredUser({ is_admin })` instead of a bare `{ is_admin }` (the component reads only `currentUser?.is_admin`). Every scenario and assertion is preserved, including the permissions case's explicit non-admin user, the restricted/unrestricted message pair, the ten table fields checked against `.html()`, the peek text, the `v-sanitize-html` call and the before/after-Modify input check. Nothing newly stubbed.

Reuse: `getFakeRegisteredUser` from `@tests/test-data`, `getLocalVue`/`withPlugins` from `@tests/vitest/helpers`; no new shared helper.

Validation: 9 tests pass shuffled (seed `420101`, `NODE_OPTIONS=--no-webstorage`). ESLint, Prettier and full client vue-tsc pass.

Guidance: none.
