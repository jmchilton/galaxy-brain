# GButton

Selected originator: `client/src/components/BaseComponents/GButton.test.ts`. Baseline and final: **23 tests**.

`mountGButton(props, router?)` is now the only mount path. Before, nine cases repeated `mount(GButton as object, { propsData, localVue, router })` by hand. The helper uses `props`/`global` and adds a test's own router through `withPlugins`. `routerWithRoutes` (defined halfway down the file) is replaced by the shared [createMemoryRouter](createMemoryRouter.md). Describes are regrouped by behaviour: titles, disabled, loading, propagation, click per root element, disabled navigation, link targets. The router-link tooltip/title case moves under titles. The three "emits click exactly once from a … root" cases become one `it.each` table with their original props and target element (`a` for the router link and plain anchor, `button` for the plain button). The router-link row now clicks `get("a")` instead of the root wrapper, which also checks it renders an anchor. All `as object` casts are removed, and vue-tsc accepts that.

Preserved: every original case and assertion, with the same props (including `disabledTitle: "Nope"` on disabled rows and the `/start?keep=me` starting route). Two strengthenings: the fallback-title case also asserts `data-title` is `"Click me"`, and the no-navigation case asserts the literal `/start?keep=me` instead of a captured "route before click", so it also proves the push took effect. "emits click when enabled" and "emits click exactly once from a plain button root" overlap but are kept as separate cases. The behaviour comments are kept.

Reuse: `getLocalVue`, `withPlugins`, and the new BaseComponents `createMemoryRouter` (shared with supporting `GLink.test.ts`). `mount` stays because the assertions need the real rendered root (`button`/`a`/RouterLink), spinner icon and click guard.

Validation: 23 tests pass shuffled (seed 250101). ESLint, Prettier and full `vue-tsc --noEmit` are clean.

Guidance: none.
