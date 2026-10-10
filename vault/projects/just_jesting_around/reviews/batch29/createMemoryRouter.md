# createMemoryRouter (Tool Shed)

New file `lib/tool_shed/webapp/frontend/src/test-utils.ts` exports `createMemoryRouter()`. It builds a vue-router with in-memory history and one catch-all route (`/:any(.*)*`), so RouterLinks inside galaxy-ui components resolve without touching `window.location`. The name and meaning match the client's `createMemoryRouter` in `client/src/components/BaseComponents/test-utils.ts`; the client's `createTestRouter` is the web-history default that `getLocalVue` installs. The Tool Shed takes no arguments because every consumer used the same single catch-all route.

Consumers:
- `RepositoryMenus.test.ts` (originator): its local `withRouter()` built the router inline; it now calls the helper. 6 → 6 tests.
- `ShedToolbar.test.ts` (supporting): the inline four-line router in `mountToolbar` becomes `createMemoryRouter()` and the `vue-router` import goes. 4 → 4 tests. Nothing else changed.
- `pages/RepositoriesByCategories.test.ts` (supporting): the same inline router is replaced, and the `vue-router` import goes. 1 → 1 test. Nothing else changed.

Not adopted: `galaxyUi.test.ts` has an identical local `makeRouter()`, but the file already carries three ESLint warnings at HEAD: two `vue/one-component-per-file`, one `no-non-null-assertion`. Touching it fails the `--max-warnings 0` gate, and clearing them is outside this change. Follow-up: clear those warnings and adopt `createMemoryRouter()` there. `PaginatedRepositoriesGrid.test.ts` mocks `useRoute`/`useRouter` instead and is unrelated.

Validation, from `lib/tool_shed/webapp/frontend/`: both supporting suites (5 tests) pass shuffled (seed `290101`, `NODE_OPTIONS=--no-webstorage`). Scoped ESLint (`--max-warnings 0`) and Prettier pass. Tool Shed `pnpm typecheck` and client `vue-tsc --noEmit` pass.
