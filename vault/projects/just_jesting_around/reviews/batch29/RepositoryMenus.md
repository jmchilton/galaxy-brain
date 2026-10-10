# RepositoryMenus

Selected originator: `lib/tool_shed/webapp/frontend/src/components/RepositoryMenus.test.ts`. Baseline and final: **6 tests**.

The local `withRouter()` now builds its router with the new shared `createMemoryRouter()` (see [createMemoryRouter](createMemoryRouter.md)), so the file no longer imports `vue-router`. `withRouter()` still mounts attached to `document.body`, but nothing ever unmounted those wrappers, so attached DOM piled up across cases. `enableAutoUnmount(afterEach)` now cleans up, following the sibling suites `ErrorBanner` and `ResetMetadataTab`. The attachment stays; the tests pass without it, but dropping it would change the mount boundary for no readability gain. A local `menuItem(wrapper, text)` finds a dropdown item by its text and throws with the missing name, following ShedToolbar's `menuLinks`. Before, a missing item turned `find(...)?.trigger("click")` into a no-op, and the failure only showed up as a confusing emit count.

Strengthened:
- The three positional health-pill assertions are now one `toEqual` over the pill texts, with the date pill still matched by `/^Updated .+ ago$/`. This also pins the count at exactly three.
- `emitted("deprecate")` and `emitted("undeprecate")` go from `toHaveLength(1)` to `toEqual([[]])`: one emission, no payload.

Preserved, with identical values: the `health-ok` class on the first pill (was `get(".health-pill")`, now `pills[0]`); `Not downloadable` with `health-problem` and `1 install`; the `Repository settings` toggle label; the absence of `Mark as Deprecated` for a deprecated repository; both explore-menu hrefs; and the five dense-mode button labels plus the Homepage href. Repository fixture and props are unchanged.

Reuse: `createMemoryRouter()` from `src/test-utils.ts`, added in the preceding commit, which ShedToolbar and RepositoriesByCategories also adopt.

Validation, from `lib/tool_shed/webapp/frontend/`: 6 tests pass shuffled (seed `290101`, `NODE_OPTIONS=--no-webstorage`). Scoped ESLint (`--max-warnings 0`) and Prettier pass. Tool Shed `pnpm typecheck` and client `vue-tsc --noEmit` pass.

Guidance: none.
