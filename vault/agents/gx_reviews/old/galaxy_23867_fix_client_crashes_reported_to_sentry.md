# galaxy#23867 — [26.1] Fix client crashes reported to Sentry

https://github.com/galaxyproject/galaxy/pull/23867 · mvdbeek · head `837524c1ab0` · base `release_26.1` · reviewed 2026-10-02

## Summary

17 files, +314/-29, 9 commits, one fix per commit, each naming its Sentry group. This follows #23844 (see `old/galaxy_23844_*`). That PR fixed unhandled request rejections. This one fixes plain client crashes:

- `pairing.ts`: an invalid user filter regex now compiles to `MATCH_NOTHING` (`/(?!)/`) instead of throwing. `PairingFilterInputGroup` marks the input invalid.
- `UploadSelect.vue`: `:allow-empty="false"` plus a `null` guard in the setter. Backspace or clicking the selected option no longer emits `null.id`.
- `GCard.vue` (5 sites): `@click.stop="x.handler"` becomes `x.handler && x.handler()`. The PR body's explanation is right: in Vue 2, a member-expression handler with a modifier compiles to `x.handler.apply(...)`.
- `GModal.vue`: skip `showModal()` when the dialog is already open.
- `import-dataset.js`: Import is re-enabled only when creating the new history fails.
- `FilesInput.vue`: `defineExpose({ selectFile })`. `<script setup>` is closed in Vue 2.7, so `HistoryImport`'s `this.$refs.filesInput.selectFile()` threw. The selenium test had been clicking the dialog open by hand, which hid the bug. That manual click is now removed, because selecting the radio opens the dialog.
- `logout.js`: a failed `/user/logout` shows a toast. A failed OIDC `/authnz/logout` is logged with `console.warn` and the redirect continues.
- GTN webhook: return early when `contentDocument` is null (cross-origin page).

State:
- No reviews or comments yet.
- CI: 60 checks passed, 1 skipped.
- The base has moved 9 commits since the branch point. None of them touch these files.

## Verdict

Approve. The fixes are small, local, and right for a release branch. Every behaviour change except the GTN guard has a test that would fail without it (from reading the tests; I didn't run them). The findings below are merge-forward heads-ups and optional nits.

## Findings

1. **Minor (merge forward): `logout.js` conflicts with dev, and dev still has the unhandled rejection.**
   - Where: `client/src/utils/logout.js:23-50`.
   - On dev, `userLogout` is reworked: `userLogoutUrl`/`authnzLogoutUrl` helpers, the OIDC `/authnz/logout` call comes first, and the function returns the promise. Dev has no `.catch` either, so a refused logout is still an unhandled rejection there.
   - The IdP-failure half of this fix doesn't carry over unchanged. On dev the authnz call runs before the Galaxy logout, so "swallow the IdP failure and redirect" would skip the Galaxy logout.
   - Worth porting deliberately rather than resolving the conflict mechanically.
2. **Info (merge forward): the `GModal` fix already exists on dev.**
   - On dev, `BaseComponents/GModal.vue` is a shim over `client/packages/ui/src/components/GModal.vue`, which already has `if (!dialog.value || dialog.value.open) return;`.
   - Take dev's side on merge. The new `GModal.test.ts` imports `./GModal.vue`, so it should still pass against the package version. That is reasoned from the code; I haven't run it.
3. **Nit: `pairing.ts:16-30` compiles each valid filter twice.**
   - `filterRegExp` calls `isValidFilter` (which builds a `RegExp`) and then builds it again.
   - A single `try { return new RegExp(filter) } catch { return MATCH_NOTHING }` would do, with `isValidFilter` written on top of it.
   - Reuse: `FormSelectMany.vue:76-82` and `Form/utilities.js:295-305` each have their own inline try/catch around `new RegExp` on user input. There's no shared helper today, so this PR doesn't miss one. A `utils/` safe-compile helper on dev could absorb all three. Not a 26.1 concern.
4. **Nit: logout toast wording.**
   - `logout.js:47-49` shows the raw `err_msg`. For the stale-CSRF case that is "Invalid session token.", which doesn't tell the user what to do.
   - A default such as "Please reload the page and try again." would make the toast actionable. Optional.
5. **Nit: the `UploadSelect.test.ts` backspace test calls vue-multiselect's internal `removeLastElement()`.**
   - That ties the test to library internals. I checked vue-multiselect 2.1.7 (`multiselectMixin.js:616-653`): `removeElement` returns early when `!allowEmpty && internalValue.length <= 1`, so the test does exercise the real guard.
   - Acceptable. It is only brittle if the library is upgraded.

## What's fine

- **GCard:** `x.handler && x.handler()` matches the existing `ea.handler && ea.handler()` (`GCard.vue:514`) and GTable's `ac.handler && ac.handler(...)`, so it's consistent with the codebase.
  - The title link (`:396`, `@click.stop.prevent="title.handler"`) is left alone correctly: `handler` is required on the title type (`GCard.types.ts:61`).
  - `MastheadDropdown` and `ToolFavoriteButton` use the same template form, but without modifiers, so they don't hit the `.apply` path.
- **UploadSelect:** `:allow-empty="false"` matches `SingleItemSelector.vue:8`, which the new upload panel cells use, so those cells don't have this bug.
- **Pairing:** all user-filter `RegExp` construction goes through `pairing.ts`. I grepped `Collections/`, `Upload/` and `Panels/Upload/`, and no other site builds a regex from these filters.
- **FilesInput:** no other `$refs.x.method()` calls target a `<script setup>` child. The other hits are `BTable.refresh` and `BModal.show`.
  - The selenium test change is a correction, not a weakening. The old manual click was masking the crash.
- **import-dataset:**
  - `Modal.show` rebuilds the buttons, so a disabled Import button doesn't leak into the next modal.
  - Both tests fail without the fix. In the existing-history path, the old code re-enabled the button synchronously. In the new-history path, the old `finally` re-enabled it.
- **GTN:** `persistLocation` already goes through try/catch getters. A cross-origin `contentDocument` returns `null` per spec rather than throwing, so the early return is the right guard.
- **Logout:** `Toast` in a util has a precedent (`utils/clipboard.js`). It's called from UI handlers, so the store-toast concern raised on #23844 doesn't apply. `errorMessageAsString` reads `response.data.err_msg` correctly.
- **Overlap with #23844:**
  - No repeat of the patterns flagged there. There is no new store toast, and there are no duplicated composable-level error handlers.
  - The suggested `onError` middleware for `GalaxyApi()` (#23844 Finding 6) isn't relevant, because `logout.js` uses axios directly.
- **Comments:** the few new comments (pairing docstring, IdP logout, GTN cross-origin) explain the non-obvious *why*. None of them are obvious comments.
- **Imports:** `logout.js` imports sit at module top.

## Tests

Not run: there are no `node_modules` in the worktree and the disk is nearly full. The assessment below comes from reading the tests.

| Test | Without the fix |
|---|---|
| `pairing.test.ts` invalid filter | `splitIntoPairedAndUnpaired` throws `SyntaxError` |
| `UploadSelect.test.ts` backspace / null | emits / throws on `null.id` |
| `GCard.test.ts` navigate-only actions | `undefined.apply` throws on click |
| `GModal.test.ts` | `showModal` spy called twice |
| `FilesInput.test.ts` | `vm.selectFile` is undefined |
| `import-dataset.test.js` (x2) | Import button re-enabled |
| `logout.test.js` (x2) | no toast; IdP failure skips redirect |

- No tests were weakened. The `GCard.test.ts` deletions are a `mountCard` helper extraction.
- The selenium test lost one line. As covered under "What's fine", that was a correction.
- The tests are small component and unit tests, which suits crash regressions on a release branch. The selenium history-import test already covers the `FilesInput` path end to end.

## Draft GitHub review comment

> *Written by Claude (AI assistant) on behalf of jmchilton.*
>
> Thanks, looks good for 26.1. Each fix is local, and each one except the GTN guard has a regression test that would fail without it. The `FilesInput` / selenium change is a nice catch: the test's manual dialog click was hiding the closed-`<script setup>` crash.
>
> A few notes, none blocking:
>
> 1. **Merge forward, `logout.js`:** dev has reworked `userLogout` so that OIDC `/authnz/logout` runs before `/user/logout`, and it still has no `.catch`. The stale-CSRF fix is worth porting by hand. The "IdP failure → continue redirect" half needs rethinking there, since on dev the Galaxy logout comes after the IdP call.
> 2. **Merge forward, `GModal`:** dev already has the `dialog.value.open` guard in `client/packages/ui/src/components/GModal.vue`, so take dev's side.
> 3. Small: `filterRegExp` compiles each valid filter twice (once in `isValidFilter`, once to return it). A single try/catch returning `MATCH_NOTHING` would avoid that. On dev, `FormSelectMany.vue` and `Form/utilities.js` have the same inline try/catch-around-`new RegExp`, which might be worth a shared helper.
> 4. Optional: for the stale-CSRF case, the toast shows "Invalid session token." Something like "Please reload the page and try again." would make it actionable.
