# ToolCard (.test.js)

Selected originator: `client/src/components/Tool/ToolCard.test.js`. Baseline **4 tests** → final **6**. "shows props" is split into three cases: title/description, options and backdrop. The two "no badge" cases become one two-row `it.each`.

Not vacuous under the old helper, though one template read changed value. ToolOptionsButton's template reads `config.enable_tool_source_display`. That was undefined under the old `{ value }` mock, and is now the configured `false`. Either way the "View Tool source" item shows because the user is an admin. Probe: a non-admin user drops the option count from 5 to 3.

What changed:
- The shared `beforeEach` mount and `let wrapper`/`let userStore` are gone. `mountToolCard({ version, options })` mounts per test and returns `{ wrapper, router }`.
- A fresh `createTestRouter()` per mount, installed with the pinia through `withPlugins(getLocalVue(), …)`, replaces the deprecated `injectTestRouter` and the `router.push("/")` reset between tests.
- The real `createPinia()` is now `createTestingPinia({ initialState: { userStore: { currentUser } } })`. The user is `getFakeRegisteredUser({ is_admin: true })`, seeded before mount. Before, a hand-written `{ id, email, is_admin, preferences }` was assigned after mount.
- The `/api/configuration` handler (`expectConfigurationRequest(http, {})`) stays. Its comment ("some child component must be bypassing useConfig") is replaced with the real reason: `configurationStore`'s setup body calls `loadConfig()` before @pinia/testing's plugin swaps actions for spies, so testing pinia still makes the request. Seeding through `initialState` would not help, because that merge is also a plugin.
  - Probe: without the handler, the store ends with `config: null`, `isLoaded: false` and `loadError` set. With it, `config` is `{}` and `isLoaded` is `true`.
  - The `/api/webhooks` handler stays too, because ToolOptionsButton's `loadWebhooks` calls axios directly.
- The version-badge cases mount with their `version` and `versions` instead of `setProps` after a default mount. The final props are identical.
- `vi.mock("@/api/schema")` is dropped. `src/api/schema` has no `__mocks__`, and the suite passes with clean output without it. The hashed-id local-storage mock stays.
- Selector constants, and `enableAutoUnmount(afterEach)`.

Preserved:
- The `h1` title, the description span, and the "Options" dropdown title.
- Exactly 5 dropdown items, and the backdrop count going from 0 to 1 after `setProps({ disabled: true })`.
- The "Newer version available" badge text, and the click routing to `/?tool_id=identifier&version=latest`.
- No badge for `2.0` of `["1.0", "2.0"]` or for `1.0` of `["1.0"]`.
- Every prop value, including the undeclared `sustainVersion` attr, and `enable_tool_source_display: false`.

Reuse: `setupMockConfig` (fixed in this batch), `getFakeRegisteredUser`, `createTestRouter`, `expectConfigurationRequest`, `withPlugins`, `getLocalVue`, `useServerMock`, `enableAutoUnmount`. No new shared helper.

Validation: 6 tests pass shuffled (seed `340101`, `NODE_OPTIONS=--no-webstorage`). ESLint (`--max-warnings 0`), Prettier and `vue-tsc --noEmit` pass. One cold-cache run printed three Vue compat deprecation warnings. Repeat runs, of both the original and the new file, print none.

Guidance: none new. Follow-up: the "5 options" count is an admin fact. A non-admin case (3 options, no Download or View Tool source) would cover `enable_tool_source_display`.
