# Batch 33 review

Range `1e6d8358e8f..c7499806539` on `vitest_readability`, read via `git show` only. Each commit touches exactly one test file, there's no production code, no shared helper commits, and no process comments.

## Improve readability of Masthead tests (366c441c3ba)

Approved.

Mapping (15 → 16):
- simple tab links → "renders the simple tab item links": count 5 with its comment, help text, href.
- palette opens → same, plus a closed-before-click check. The `await import` is now a static import, and the close moved to `afterEach`.
- search label/title, hidden search when disabled → unchanged.
- window manager → "toggles the window manager": svg kept, `_active` false→true becomes `onclick` `toHaveBeenCalledOnce`, and `.nav-note` is absent before the click and present after.
- webhooks → unchanged.
- no destinations, then only the current site (one test) → split into two tests, same assertions.
- exact URLs/order/title/no `<em>` → unchanged, same data.
- `it.each` registered/anonymous/single-user → three tests. Each keeps the switcher-exists check and adds a variant check (menu items or login button).
- unsafe schemes `it.each`, unlabelled/blank → unchanged.

Findings:
- **Vacuous single-user row: confirmed.** `mockConfig.js` does `vi.mock("@/composables/config")`, so the adjacent `__mocks__/config.ts` `vi.fn` is used. `setupMockConfig` then sets its return value to `{ config: { value: configValues }, isConfigLoaded: true }`. `config` is a plain object, not a ref, so `proxyRefs` leaves it alone. The template's `config.single_user` was `undefined`, and the single-user mount rendered the normal two-item menu. The script reads `config.value.subdomain_switcher`, so the switcher rows did work. `isConfigLoaded: true` happened to satisfy `v-if`. The new `["Preferences"]` assertion is the check the row meant to make.
- **Store seeding keeps every scenario.** Real `useConfig` is `computed(() => store.config)`, and its `onMounted` `loadConfig` is stubbed by testing pinia. The old test fed the mock and `useConfigStore().config` the same object, and the palette reads the store directly. One `initialState.configurationStore.config` seed is equivalent. The default `{}` matches the old default (`setupMockConfig({})` plus store `{}`), so `isLoaded`/`paletteEnabled` stay true. The `userStore` key is the real store id, and the variant assertions would catch a wrong key.
- **Window tab.** The old `this._active` flip was only an odd-call-count proxy on the test double, and `toHaveBeenCalledOnce` is stricter. `.nav-note` comes from `MastheadItem`'s `toggle` prop, which is bound to Masthead's own `windowToggle`. That is the user-visible state `_active` stood in for, so the intent is kept and checked on the component, not the double.
- **Location restore drop: confirmed.** `vitest-location-mock`'s `setup-hooks.js` registers `beforeEach(replaceLocation)`.
- The `ECONNREFUSED` follow-up has a lead (unverified). `configurationStore`'s setup calls `loadConfig()` directly, and testing pinia hydrates and stubs only after setup runs. So every new pinia fires a real `GET /api/configuration` with no server mock, which is one per mount. That would also explain why stubbing children gave inconsistent results. Fetch patches may miss it if `GalaxyApi` keeps its own `fetch` reference. This is pre-existing and out of scope.

## Use user factories in ToolSuccess tests (c7f2f2babb1)

Approved.

Mapping: all four `it.each` rows keep their label, flags and assertions. The registered rows keep `id`/`email` through overrides. `null` stays.

Findings: this is a supporting adoption of existing factories, nothing else. The author's follow-up (the user rows are inert) is accurate and correctly left alone.

## Improve readability of QuotaForm tests (64db7104fc7)

Approved.

Mapping (13 → 14):
- "loads all quota fields and titles the form with the saved name" → "loads all quota fields" (the three values, now `toHaveValue`) and "keeps the saved name in the title while the name is edited" (the setValue and title check, plus a redundant `not` check).
- The other 7 edit cases and 4 create cases are 1:1. Every `toEqual`/`toMatchObject` body, the `mockPush` checks, hidden users/groups/source-label, the validation messages with `[]`, and failed load with no submit are unchanged.

Findings:
- **Shared filter mock matches what the tests use.** The real `FormSelect` imports `@/composables/filter` (the index re-exporting `./filter`). The shared mock replaces that module, and the old one replaced `./filter.js` behind it, so both intercept the same import. The only difference is `filtered`: `ref([])` before, a passthrough `computed` now. In `FormSelect`, `filtered` feeds only `reorderedOptions`, the rendered option list. `initialValue`/`setInitialValue`, `currentValue` and `hasOptions` read `props.options`. So auto-selection and emitted values are the same, and `choose()` emits `input` directly. No assertion reads the rendered options.
- Dropping `setActivePinia(createPinia())` is safe: `getLocalVue()` creates and activates a fresh pinia per mount. The `vue-router` factory mock makes `getLocalVue`'s default router throw, and it is skipped, as before.
- `props: { quotaId: undefined }` for create is the same as the old `{}`.
- Dropping the `FontAwesomeIcon` stub means a leaf renders for real. That removes a stub, not adds one.

## Use shared filter mock in RoleForm tests (7ee3c9f5605)

Approved.

Mapping: 12 → 12, only the mock changes.

Findings: `role-type` is the only `FormSelection`, and it is driven by `$emit("input")`. `openDropdown` and the tags target the direct `vue-multiselect` users/groups, which don't use the filter composable. The same `FormSelect` analysis as QuotaForm applies, and no assertion depends on the change.

## Improve readability of floatingPosition tests (de9a256d5fa)

Approved.

Mapping (6 → 6):
- active from start: x=12 → x=12 plus y/placement/arrow
- once active: unchanged, now via `expectComputedPosition`
- late result discarded: x=0 → x=0 plus y=0 and placement `"bottom"`
- stop on deactivate, stop on dispose: unchanged, plus `not.toHaveBeenCalled()` before the step
- whenPositioned: negative check after a flush, then waitFor and x=12, unchanged

Findings:
- **Timing preserved.** The composable has no timers. `computeAndApply` is pure promise chaining, and the `flush: "post"` watcher is reached through `nextTick`, which the tests still await. `flush-promises` resolves on `setImmediate` (or `setTimeout`), a macrotask boundary like the old `setTimeout(settled)`, so every pending microtask has run by then. The two places that used it, the discard case and the negative check before `release()`, still assert at the same point. `holdComputedPosition`'s `release` resolves with the same `result` object the old manual `resolve(floatingUi.position)` used.
- One inaccuracy in the author's note (no change needed). "Other `packages/ui` tests use it" is wrong: `vModelContract.test.ts` and `publicClasses.test.ts` import `flushPromises` from `@vue/test-utils`. This file is the package's only `flush-promises` import. The VTU export uses the same scheduler, so behavior is the same, and the README's own example imports `flush-promises`. So the choice is supported. Only the rationale is wrong.

## Improve readability of ChangePassword tests (c7499806539)

Approved.

Mapping (2 → 3):
- "basics": card header → case 1. Inputs length 2 and both `password` types, setValue, one request, `password`/`confirm` → case 2 (`toHaveLength(1)`, `toMatchObject` with the same values).
- "props": `token`/`expiredUser` (now at mount, not `setProps`), first input type, `current`, one request, `token`/`id`/`current` → case 3. The `.alert` "message_text" check is still after `await submit(wrapper)`, in the same case.
- New: the alert at render (case 1), and router at `/` after both submits.

Findings:
- **Dead `vi.mock("utils/redirect")`: confirmed.** `vitest.config.mts` has no `utils` alias, only `utils/localization$`, `@`, `@tests` and `config`. The component imports `@/utils/redirect`, so the mock never matched and `mockSafePath` was never used.
- **Uninstalled router: confirmed.** `injectTestRouter` just returns `createTestRouter()`, and the old mount passed `global: localVue`. That used `getLocalVue()`'s own default router, so the pushed router never reached `useRouter()`. One nuance: both routers used `createWebHistory` over the same `window.history`, so "did nothing" is not strictly provable from the code. That's moot, because the new code installs the router it asserts on through `withPlugins`, which drops the default. Pushing `/change-password` before install also prevents a start-location navigation.
- `props` at mount instead of `setProps` matches how the page is entered. `message`/`variant` are read once from props at setup, and `token`/`expiredUser` are reactive either way, so no assertion depends on the timing.
- The specific `/user/change_password` handler is a real tightening. A wrong URL now falls through to the server mock's error path, the request isn't recorded, and the length check fails.
- The author's note mentions a follow-up commit that was later squashed. That only affects the note.
