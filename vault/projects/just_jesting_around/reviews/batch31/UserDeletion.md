# UserDeletion

Selected originator: `client/src/components/User/UserDeletion.test.ts`. Baseline and final: **5 tests**.

It drives a real, mounted GModal (`confirm`, `show`, `:close-on-ok="false"`). Ok goes straight to `emit("ok")` when `closeOnOk` is false, so the old `vm.$emit("ok")` didn't produce a double emission here. Its comment ("jsdom doesn't support `<dialog>.close()`") was stale: the client runs on happy-dom, where the dialog works. The confirm case now clicks the "Delete Account Permanently" footer button through the shared `clickModalButton`. Because the helper refuses a disabled button, that case also proves that typing the matching email enables deletion.

What changed: `mountUserDeletion()` seeds the current user on its own Pinia before mounting and installs it with `withPlugins`. The old mount passed `pinia` as a legacy top-level option, which only Galaxy's VTU adapter (`tests/vitest/__mocks__/vue-test-utils-adapter.ts`) translates, and set the user after mounting. The `as object` cast, the unneeded localization instrumentation (`getLocalVue(true)`, nothing asserts `l()` output) and the `userLogoutClientMock` alias are gone. Selectors are constants, a one-line `enterEmail` names the step, and auto-unmount is added.

Preserved: modal, warning alert and both warning phrases rendered; email input present and delete button `aria-disabled="true"` initially; button enabled when the email matches; mismatch message after blur; logout after a successful delete. Strengthened: the delete case checks that the DELETE request targets the current user's id (`deletedUserIds` equals `[TEST_USER_ID]`), and that logout is called exactly once.

Reuse: `getFakeRegisteredUser`, `getLocalVue`/`withPlugins`, `useServerMock`, `clickModalButton`. The 403 and generic error branches of `handleSubmit` stay untested, as at baseline.

Validation, from `client/`: 5 tests pass shuffled (seed `310101`, `NODE_OPTIONS=--no-webstorage`). ESLint (`--max-warnings 0`), Prettier and `vue-tsc --noEmit` pass.

Guidance: none beyond `clickModalButton.md`.
