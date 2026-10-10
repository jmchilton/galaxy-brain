# Masthead (.test.js)

Selected originator: `client/src/components/Masthead/Masthead.test.js`. Baseline **15 tests** → final **16**. The "no destinations" case is split in two, and the three-row switcher `it.each` becomes three named tests, since each row now checks something different.

What changed:
- One `mountMasthead({ config, user, windowTab })` helper replaces two mount paths. Before, `beforeEach` mounted with `props`/`global`, and `remount()` unmounted that and mounted again with `localVue`/`propsData`. Each test now mounts once, with its config and user in view. The helper seeds `configurationStore` and `userStore` through `initialState` on one testing pinia, installed with `withPlugins(getLocalVue(), pinia)`. Before, the user was assigned after the store was created.
- `setupMockConfig` is gone. The real `useConfig()` is a `computed` over `configurationStore`, and testing pinia stubs its `loadConfig` action. So one seed now drives both the masthead and the command palette, which reads the store directly. Before, the test kept the store and the mock in sync by hand.
- Users come from `getFakeRegisteredUser()` and `getFakeAnonymousUser()`, which closes batch 32's follow-up. The anonymous user loses its hand-written `id: "anonymous"`. This is filler: Masthead only reads `currentUser.username` on the registered branches, and QuotaMeter reads `quota`/`total_disk_usage`/`quota_percent`, which the factory defaults.
- The window tab is a `createWindowTab()` factory with `onclick: vi.fn()`. It replaces a shared object whose `this._active` flag flipped.
- `useCommandPalette` is now imported statically, not with `await import()`. The palette's module-level open state is reset in `afterEach`, not inline.
- `enableAutoUnmount(afterEach)` replaces the manual `wrapper.unmount()`.
- The `originalUrl`/`window.location.href` restore is dropped. `vitest-location-mock`, from `tests/vitest/setup.ts`, puts a fresh `location` in place in its own `beforeEach`. So the restore did nothing, and the shuffled run passes without it (16/16).
- The webhook stub moved into `beforeEach`, with an `EXTENSION_TAB` constant. Selector constants cover the search button, the login button and the user menu.

Vacuous row replaced: the original `single-user` row couldn't fail. `setupMockConfig` returns `config` as a plain `{ value }` object, not a ref. A `<script setup>` template reading `config.single_user` saw `undefined`, so the "single-user" mount rendered the normal registered menu. Asserting the single-user menu under the old mock fails, because it renders `["Preferences", "Sign Out"]`. With the store seed it renders `["Preferences"]`. Production is fine: the real `useConfig` returns a computed ref.

Strengthened:
- Each switcher variant now proves the variant rendered:
  - registered: the user menu is `["Preferences", "Sign Out"]`
  - anonymous: the login button exists. Probe: seeding a registered user in that test fails it.
  - single-user: the user menu is `["Preferences"]`
- The palette test checks the palette is closed before the click.
- The window manager test checks that `onclick` is called once. It also checks that the toggle's check mark (`.nav-note`) appears only after the click.

Preserved:
- The 5-item nav count and its comment, and the help text and href.
- The palette opening, the search label and title, and the hidden search button when the palette is disabled.
- The window manager icon, the toggle, and the webhook tab text.
- Switcher absence, both with no destinations and with only the current site.
- The ordered exact URLs, labels, title and no `<em>`, with the current origin omitted.
- The three unsafe schemes, and the dropped unlabelled and blank labels.

Reuse: `getFakeRegisteredUser`, `getFakeAnonymousUser`, `getLocalVue`, `withPlugins`, `enableAutoUnmount`. No new shared helper.

Validation: 16 tests pass shuffled (seed `330101`, `NODE_OPTIONS=--no-webstorage`). ESLint (`--max-warnings 0`), Prettier and `vue-tsc --noEmit` pass.

Follow-ups:
- `tests/vitest/mockConfig.js`'s `setupMockConfig` hands components `config: { value }` and `isConfigLoaded: true` as plain values. In a template, `config.x` is undefined, and in script, `isConfigLoaded.value` is undefined. Ten other suites use it. Their templates should be audited, or the mock should return `ref`s. Seeding `configurationStore` without the mock, as here, is an alternative.
- Every Masthead mount logs one `ECONNREFUSED 127.0.0.1:80` `AggregateError` after the run (15 before, 16 now). Tests pass. No `fetch`/XHR call or `net.Socket.connect` patch caught the source, and stubbing children gave inconsistent results. It is pre-existing noise, and its cause is not found.
