# DetailsLayout

Selected originator: `client/src/components/History/Layout/DetailsLayout.test.js`. Baseline and final: **6 tests**.

The positional `createWrapper(component, localVue, userData, unwritable, propsData)` is replaced by `mountDetailsLayout({ props, user })`. Each case now passes the props it actually needs, and the inverted `unwritable` flag is gone. The helper mounts with a fresh Pinia via `withPlugins(localVue, pinia)`, then seeds `useUserStore(pinia).currentUser`. The summarized-name case used its own `mount` with legacy top-level `localVue`, `pinia` and `propsData`. It now uses the same helper with `user: null`, so it still never seeds a user. The VTU adapter in `tests/vitest/__mocks__` already translated those legacy options to the same global plugins, so what it renders is unchanged. A `SELECTORS` constant and `openEditor()` name the repeated lookups, and `enableAutoUnmount(afterEach)` was added. `.edit-button` is now looked up by its `data-description='editor toggle'`, which a probe confirmed is the same `<button>`.

Seeding timing is kept after mount. Before mount the user is `null`, which is neither registered nor anonymous, so the toggle reads "Edit". The anonymous case's "Log in" title came only from the post-mount seed, which the original's `await createWrapper(...)` microtask let render. The helper now makes that wait explicit with `await nextTick()`. The ad-hoc users `{ id, email }` and `{}` are replaced by `getFakeRegisteredUser()` and `getFakeAnonymousUser()`. Both pairs hit the same `isRegisteredUser`/`isAnonymousUser` branches, since the check is `"email" in user`. A per-file coverage comparison against the original showed no change in any source file. Only the anonymous case actually observes the post-mount seed. The template doesn't tell a registered user apart from a `null` one, so the logged-in case's "Edit" title and enabled toggle match the pre-seed render, and no stronger check exists.

Preserved: the three toggle titles, rename-label presence and absence, the summarized name rendered as escaped text with no `<b>`, the "only edited fields" save after an in-flight tag prop update, and no save when nothing changed.

Strengthened:
- The "Log in" and "Not Editable" `toContain` checks are now exact `toBe`s.
- Each of the three permission cases also asserts the toggle's `aria-disabled` state: absent for a registered writeable user, `"true"` for anonymous and not-writeable.

Reuse: `getFakeRegisteredUser`/`getFakeAnonymousUser` from `@tests/test-data` and `withPlugins` from `@tests/vitest/helpers`. It stays on full `mount`, because the assertions read rendered ClickToEdit, GButton and BForm output.

Validation: 6 tests pass shuffled (seed `400101`, `NODE_OPTIONS=--no-webstorage`). Scoped ESLint (`--max-warnings 0`) and Prettier pass, and so does full client `vue-tsc --noEmit`.

Guidance: none.
