# mockConfig (setupMockConfig)

Helper: `client/tests/vitest/mockConfig.js`, fixed in place. `setupMockConfig(configValues, isConfigLoaded = true)` now has the mocked `useConfig` return `config: ref(configValues)` and `isConfigLoaded: ref(isConfigLoaded)`. It used to return `config: { value: configValues }` and a plain boolean. The real `useConfig` returns two computed refs, so the mock now has the same shape.

What the old shape broke:
- A `<script setup>` template, or an Options API `this.config`, reads `config.x` as undefined, because a plain `{ value }` is not unwrapped.
- A script reading `isConfigLoaded.value` gets `true.value`, which is undefined.
- A script reading `config.value.x` worked. QuotaMeter, GridList (through GridOperations' conditions), StsDownloadButton and useRegistrationTarget only read config that way.

Why fix in place rather than migrate to `@/composables/__mocks__/config`:
- `setMockConfig` merges into defaults that include `allow_local_account_creation: true`. `setupMockConfig` replaces the whole config, and the callers depend on that. useRegistrationTarget's `targetFor({})` row would flip from `undefined` to `/register/start`.
- `__mocks__/config` keeps one ref at module level, so every consumer would need `resetMockConfig()` in `beforeEach`. `setupMockConfig` hands each call fresh refs.
- One consumer, `ToolSelectPreferredObjectStore.test.ts`, belongs to a later lane, and deleting the helper would force an edit to it.
- The two layer cleanly. `vi.mock("@/composables/config")` without a factory resolves to `__mocks__/config.ts`, and `setupMockConfig` overrides that mock's return value.

Consumers. All 11 pass unchanged with the fix (75 tests, shuffled with seed `340101`): QuotaMeter 4, GridList 5, ToolCard 4, useRegistrationTarget 4, StsDownloadButton 3, FormDirectory 6, WorkflowSelectPreferredObjectStore 3, HistoryView 8, MultipleView 6, SelectionOperations 29, ToolSelectPreferredObjectStore 3. Each suite's output, run separately, is identical under the old and new helper apart from timestamps. So no new requests or warnings appear.

Assertions the fix made meaningful (no test edit): SelectionOperations' two "With Celery Disabled" cases, "hide `Change data type`" and "hide `Manage Storage Location`". `isCeleryEnabled` reads `this.config.enable_celery_tasks` through Options API `setup()`, which was always undefined under the old helper.
- Probe: mounting that block with `TASKS_CONFIG` under the old helper still passes both cases (2/2).
- Under the new helper, the same probe fails both. The real config now decides them.

Adopted by `client/src/components/Workflow/List/WorkflowListTabs.test.ts` (9 → 9). It had replaced the helper with a hand-rolled `vi.hoisted` state plus a `vi.mock` factory of computeds, with a comment blaming exactly this bug. `mountTabs` now calls `setupMockConfig({ curated_workflows_source }, configLoaded)` before mounting. No test changes config after mount, so fresh refs per call suffice. Under the old helper, the adopted file fails 6 of 9 cases, because `isConfigLoaded.value` is undefined and the curated tab vanishes. Every case and assertion is unchanged.

Not adopted: ActivityBar, useHistoryGraph and PageEditorView. Each mutates its own config ref after mounting, which `setupMockConfig` doesn't expose. UserPreferencesModel mocks the store, not `useConfig`.

Validation: the 12 affected suites, 84 tests, pass shuffled (seed `340101`, `NODE_OPTIONS=--no-webstorage`). ESLint (`--max-warnings 0`), Prettier and `vue-tsc --noEmit` pass.

Follow-ups:
- SelectionOperations' "With Celery Enabled" block never checks that "Change data type" and "Manage Storage Location" appear. So the disabled cases rest on the probe, not on a positive twin in the suite.
- InstallationSettings keeps its local mock (batch 24), because `setupMockConfig`'s plain object broke its Options API `data()`. That reason may no longer hold (unverified; the file belongs to a later lane).
