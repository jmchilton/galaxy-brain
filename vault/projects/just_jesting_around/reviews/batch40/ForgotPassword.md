# ForgotPassword

Selected originator: `lib/tool_shed/webapp/frontend/src/components/pages/ForgotPassword.test.ts`. Baseline **2 tests**, final **3 tests**.

The page mounted without a router, so its footer `<router-link>` never resolved. Every run logged `[Vue warn]: Failed to resolve component: router-link` twice, and the footer rendered as an unknown element. `mountForgotPassword()` now installs the shared `createMemoryRouter()` from `@/test-utils`, as ShedToolbar, RepositoryMenus, RepositoriesByCategories and galaxyUi already do. RouterLink now renders for real and the warnings are gone. A new case, "links back to the login page", checks the resulting `a[href='/login']` and its text. A `SELECTORS` constant and a `submit()` helper (trigger, then flush) name the repeated steps, and `enableAutoUnmount(afterEach)` was added, following ErrorBanner and RepositoryMenus.

Preserved: the `ToolShedApi` POST module mock with `vi.clearAllMocks()`, the exact `/api_internal/reset_password` call with body `{ email: "a@b.com", bear_field: "" }`, the sent confirmation, and the error banner containing the rejection message. Inputs and mocked results are unchanged.

Strengthened:
- On success, the form is gone and no error banner shows, which covers the `v-else` swap.
- On failure, the form is still there and no confirmation shows. The case was renamed to say so.

Reuse: `createMemoryRouter()`. A shared `ToolShedApi` mock was not added, because the sibling ResetPassword and ChangePassword suites mock a different method (`PUT`) alongside their own router mocks.

Validation, from `lib/tool_shed/webapp/frontend/`: 3 tests pass shuffled (seed `400101`, `NODE_OPTIONS=--no-webstorage`) with no Vue warnings. Scoped ESLint (`--max-warnings 0`) and Prettier pass, and so do Tool Shed `pnpm typecheck` and client `vue-tsc --noEmit`.

Guidance: none.
