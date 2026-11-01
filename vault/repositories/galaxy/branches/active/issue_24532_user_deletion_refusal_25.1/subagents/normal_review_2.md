**Acted on (coordinator):** Low 1 and the test nit, in `e6590e91c9b`. `resetModal` now clears `deleting`, matching 26.1. The pending-request test no longer clicks the disabled button or counts requests; it now asserts the failure message after the response. The test fails against the original-scope component.

Not acted on:
- Low 2: a thrown (network) error leaves `deleting` set. 26.1 has the same gap, so a `try/finally` belongs on dev.
- Low 3: no in-flight spinner on 25.1. That's UI polish beyond the double-submit gap.

<details><summary>Full review</summary>

Run via Claude Opus 5.5 at low effort.

# Normal review 2: issue_24532_user_deletion_refusal_25.1 (after re-scope)

**Top-line:** The re-scope commit `a1bc7532e16` is correct and matches 26.1. BModal checks `defaultPrevented` synchronously after `$emit('ok')`, and `event.preventDefault()` runs before the first `await`, so the modal stays open. Cancel, the header close, Esc and backdrop clicks go through `hide()` with their own triggers, so they still close the modal and fire `@hidden` → `resetModal` → `emit("reset")`. `deleting` is cleared on every API error path, and on success `userLogoutClient()` navigates away. Tests pass (8/8 under jest). There are no blocking findings. Three low items and two nits follow, and none of them needs a change before handoff. No security issues.

## Verification

- `git diff origin/release_25.1...HEAD`: 5 commits, 2 files (+92/-5). `a1bc7532e16` adds `deleting`, binds `:ok-disabled="!nameState || deleting"`, sets `deleting` before the DELETE and clears it on error, and adds the pending-request test.
- `npx jest --config tests/jest/jest.config.js src/components/User/UserDeletion.test.ts`: 8 passed.
- BModal (`node_modules/bootstrap-vue/src/components/modal/modal.js`):
  - `onOk` calls `hide('ok')`. That builds a cancelable `BvModalEvent`, `$emit('ok', evt)`, and then checks `evt.defaultPrevented`. When it is set, BModal calls `updateModel(true)`, which emits `change` only if the value differs from the `visible` prop. Here the prop is `true`, so nothing is emitted, and that makes `expectModalStillOpen` (no `change` emitted) a valid assertion. Without `preventDefault`, `updateModel(false)` emits `change: false`.
  - The OK button's `disabled` is `okDisabled || busy || isTransitioning`. Cancel uses `cancelDisabled`, so it stays enabled while `deleting`, as on 26.1. That is better than the `busy` prop, which would also lock Cancel.
  - The modal has no `<form>`, so Enter in the email field doesn't trigger `ok`. No other path reaches `handleSubmit`.
- Parity with `origin/release_26.1:client/src/components/User/UserDeletion.vue`: the `deleting` ref, its set and clear points, and the `ok-disabled` expression are the same. 26.1 also resets `deleting` in `resetModal` and swaps the form for a `LoadingSpan` while deleting (see Low 1 and Low 2). The `index.md` merge-forward note (keep 26.1's GModal version, put `CONFIG_DOES_NOT_ALLOW` in its check, keep `deleting.value = false`) still covers what's needed.

## Findings

### Low 1: `resetModal` doesn't clear `deleting` (26.1 does)

The scope evaluation's Scope B said to clear it "on error (and in `resetModal`)". The commit only clears it on error. In practice this doesn't matter. The parent mounts `<UserDeletion v-if="showDeleteAccountModal" @reset="toggleUserDeletion" />`, so `reset` unmounts the component and the next open starts with `deleting = false`.

**Recommendation:** You can add `deleting.value = false;` to `resetModal` so the logic matches 26.1 line for line. That would also shrink the merge-forward conflict a little. It's optional either way.

### Low 2: a fetch rejection leaves the modal stuck with OK disabled and no message

If `GalaxyApi().DELETE` throws instead of returning `{ error }` (for example, a network failure where openapi-fetch's `fetch` rejects), the `await` throws: `deleting` stays `true`, no `deleteError` appears, and the rejection goes unhandled. Before this branch, the modal had already closed by then, so the user saw nothing either way. Now they see a modal that can't be confirmed. They can still Cancel, Close or press Esc to get out, and 26.1 has the same gap.

**Recommendation:** None for this backport, because matching 26.1 matters more. If it gets addressed, a `try/finally` around the request (or a `catch` that sets the generic message) belongs on dev.

### Low 3: no in-progress feedback beyond the disabled button

26.1 replaces the email form with `LoadingSpan message="Deleting user account"` while `deleting`. On 25.1 the only sign that something is happening is the greyed-out OK button. Deletion is normally quick, and porting the spinner would widen the backport.

**Recommendation:** Leave as is. Mention it in the PR description only if a reviewer asks about the in-flight state.

### Nit 1: the "click while disabled" step in the pending test is vacuous

In `disables the delete button while the deletion request is pending`, `deleteButton.trigger("click")` on a disabled element does nothing in Vue Test Utils (`trigger` skips disabled elements), so `expect(deleteRequests).toBe(1)` would pass even if the OK path weren't guarded. The guard that matters is the `disabled` attribute assertion. Without `deleting` it would fail, because `nameState` is true during the request. So the test still covers the change.

**Recommendation:** Either drop the click and the `deleteRequests` counter, or keep them but don't count them as proof that a second request is blocked. Also checking that the generic error shows after `respond()` would tie the re-enable to the failure path. Optional.

### Nit 2: comment on `handleSubmit`

"Keep the modal open so a failed deletion can show its error; success logs out." is useful: it explains why `preventDefault` is there, which isn't obvious from the code. Keep it.

## Not flagged

- The `BvModalEvent` type import is the right narrow typing for the handler.
- On a successful delete, the modal now stays open until `userLogoutClient()` navigates. That's fine, and it matches 26.1's `:close-on-ok="false"`.
- If the user cancels while a request is in flight, the request still finishes, and on success it logs out. Since the account really was deleted, that's correct. 26.1 behaves the same way.
- Earlier findings (local constant, generic fallback text, test helper seam for the merge-forward) were settled in review 1 and haven't regressed.

</details>
