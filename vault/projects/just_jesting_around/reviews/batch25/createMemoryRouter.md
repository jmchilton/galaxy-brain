# createMemoryRouter

New file `client/src/components/BaseComponents/test-utils.ts` exports `createMemoryRouter({ paths, base })`. It builds a vue-router with in-memory history. Each path (by default `/` and `/pages/create`) gets a render-nothing route stub, and the router is served under `base` when one is given. Link components can then resolve hrefs (including Galaxy's URL prefix) and push routes without touching `window.location`.

Consumers:
- `GLink.test.ts` (supporting): four identical inline `createRouter({ history: createMemoryHistory(...), routes: [...].map(...) })` blocks and the local `RouteStub` are replaced by `createMemoryRouter()` / `createMemoryRouter({ base: "/galaxypf/" })`. 10 → 10 tests. Paths, base and every assertion are unchanged.
- `GToast.test.ts` (supporting): its one inline memory router with `/` and `/histories/view` template-stub routes becomes `createMemoryRouter({ paths: ["/", "/histories/view"] })`, and the `vue-router` import goes. The route components were never rendered; the test only checks `currentRoute.value.path`, so the render-nothing stub doesn't change what it exercises. 10 → 10 tests. Nothing else in the file changed.
- `GButton.test.ts` (originator): replaces its local `routerWithRoutes(paths, base)`. The no-navigation case passes `paths: ["/start", "/pages/create"]` as before.

Why not `createTestRouter` in `tests/vitest/helpers.js`: `getLocalVue()` installs it as every suite's default router, it uses web history (shared `window.location`), and it has a catch-all route. Base-URL hrefs and "did not navigate" checks need an isolated memory history and explicit paths. The name is distinct so the two aren't confused.

Not adopted: other `createMemoryHistory` users (`HistoryImport`, `DatasetView`, `UserOidcProfile`, `UserPreferences`) pass `routes: []` in a one-liner and don't resolve links.

Validation: GLink 10 and GToast 10 tests pass shuffled (seed 250101). ESLint, Prettier and full `vue-tsc --noEmit` are clean.
