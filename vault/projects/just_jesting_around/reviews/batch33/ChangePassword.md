# ChangePassword

Selected originator: `client/src/components/Login/ChangePassword.test.ts`. Baseline **2 tests** ("basics", "props") → final **3**. The card-header and message rendering is split out of the two submit cases.

What changed:
- **Dead `withPrefix` mock removed.** The component imports `@/utils/redirect`. The test mocked `"utils/redirect"`, which no alias maps to that module. Probe: inside the submit case, the posted URL was `http://localhost/user/change_password` and `mockSafePath` had 0 calls. The real `withPrefix` was always used.
- **Specific endpoint.** The catch-all `http.untyped.post(/.*/)` is now `http.untyped.post("/user/change_password", ...)`, wrapped in `capturePasswordChanges()`. A request to any other URL now falls through to the server mock's 500 fallback, records no body, and fails the length check. The module-level `postRequests` array, which was reset in `beforeEach`, is gone.
- **Unmounted router replaced.** The `injectTestRouter(localVue)` router was never installed. `getLocalVue()` installs its own router, so pushing `/change-password` on the other one did nothing for the component. `mountChangePassword(props)` now creates a `createTestRouter()`, pushes `/change-password`, and mounts with `withPlugins(getLocalVue(), router)`.
- **Props at mount.** The expired-user case passes `token` and `expiredUser` at mount instead of calling `setProps` afterwards.
- **Cleanup.** `getLocalVue(true)` became `getLocalVue()`, since no case reads localization markers. The `MountTarget as object` cast and the shared `let wrapper` are gone.

Preserved: every original assertion.
- The card header text, the two inputs and their `password` types.
- The posted `password`/`confirm`, and the expired user's posted `token`/`id`/`current`.
- One request per submit.
- The alert showing `messageText`. It is checked at render, and again after the expired-user submit, as the original did, which shows that submit didn't hit the error branch. That second check was briefly dropped and was restored in a follow-up commit.

Strengthened: both submit cases assert the router lands on `/` after a successful change. Probe: removing `router.push("/")` from the component fails both (2 failed, 1 passed), and the original suite passes under that mutation. Both probes on the component were reverted.

Reuse: `createTestRouter`, `withPlugins`, `nth`, `useServerMock` (`http.untyped`, because `/user/change_password` is not in the OpenAPI schema). No new shared helper.

Validation: 3 tests pass shuffled (seed `330101`, `NODE_OPTIONS=--no-webstorage`). ESLint (`--max-warnings 0`), Prettier and `vue-tsc --noEmit` pass.

Follow-ups:
- `Login/NewUserConfirmation.test.ts` has the same uninstalled `injectTestRouter` router, pushed "to avoid NavigationDuplicated". The same fix applies.
- `injectTestRouter` is `@deprecated` and still has 16 consumers. Any that push on it, or read its `currentRoute`, without passing it to `mount` are testing a router the component never sees. `ToolCard.test.js` does pass it as `router`, which is fine.
- There is no case for the failure branch, which shows `errorMessageAsString(error, "Password change failed for an unknown reason.")` as a danger alert.
