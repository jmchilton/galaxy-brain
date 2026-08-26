# PR 37 — Don't wedge SaveChangesModal when the save fails

<https://github.com/ahmedhamidawan/galaxy/pull/37> — `jmchilton`, targeting
`fix_preview_report_discards_changes`, head `ea9021051f3681f5d5ed362ba4d49c53598c0e80`.
This is a follow-up commit intended to fold into galaxyproject/galaxy#23286.

**Verdict: the bug is real, the fix is correct and appropriately scoped, and I found no blocking
issue.** The patch closes two coupled failure modes: it contains a rejected page save instead of
letting the rejected event-handler promise reach Vue's global error path, and it makes the shared
modal reusable after an attempted proceed leaves its component instance mounted. The implementation
reuses the existing `SaveChangesModal` and `useSaveChangesModal` abstractions, keeps the new Vue
import at module scope, and adds focused tests without weakening existing coverage.

## Why this is an actual bug

The complete path is visible in the surrounding code:

1. `SaveChangesModal.saveChanges()` sets its private `busy` ref to `true`, closes the dialog, and
   emits `on-proceed` (`client/src/components/Workflow/Editor/SaveChangesModal.vue:65-69`). All three
   footer buttons are disabled from that ref (`SaveChangesModal.vue:79-89`). Before this patch,
   nothing ever assigned `busy = false`.
2. The page editor passes `store.savePage()` into `useSaveChangesModal`
   (`client/src/components/PageEditor/PageEditorView.vue:76-80`). `savePage()` catches an API error,
   writes the user-facing `store.error`, and deliberately rethrows it
   (`client/src/stores/pageEditorStore.ts:164-201`; the contract is already covered at
   `client/src/stores/pageEditorStore.test.ts:411-423`).
3. Before this patch, `handleSaveChangesProceed()` did a bare `await onSave()`. A failed save
   therefore stopped before `router.push`, while the promise returned by the Vue event handler
   rejected. The page remains dirty because the original content/title baselines are updated only
   after a successful request (`pageEditorStore.ts:181-186`).
4. `PageEditorView` renders `SaveChangesModal` unconditionally rather than behind `v-if`
   (`PageEditorView.vue:200-206`), and `GModal` only opens/closes its native dialog; it does not
   recreate the child (`client/src/components/BaseComponents/GModal.vue:126-135,182-231`). A later
   guarded navigation therefore reopens the same `SaveChangesModal` instance with `busy` still
   true. Cancel / Don't Save / Save are all unusable; only `GModal`'s separate header close button
   remains active.

This is reachable with any real `PUT /api/pages/{id}` failure (network failure, permission/state
change, server error, and so on); it is not a hypothetical state manufactured only by the test.
The workflow editor shares the same component and can leave it mounted after `onSave()` reports
`false` (`client/src/components/Workflow/Editor/Index.vue:1165-1192,1196-1225`), so resetting the
state in the shared component is preferable to a page-only workaround.

## Assessment of the fix

- The `try/catch` at `client/src/composables/useSaveChangesModal.ts:57-63` is the right control
  flow. Failed save means remain on the dirty page and do not call `router.push`; the store has
  already populated the alert rendered at `PageEditorView.vue:208-210`. Keeping the modal closed
  lets that alert be seen instead of immediately asking the same question again.
- Resetting `busy` when `showModal` changes back to true
  (`client/src/components/Workflow/Editor/SaveChangesModal.vue:25-36`) matches the lifetime of the
  state: it preserves the double-click latch while a proceed is in flight, but gives each later
  opening a fresh interaction. Putting this in the shared modal also fixes the workflow editor's
  equivalent stale latch.
- Removing the old `bypassGuard` comment is correct. The existing `finally` at
  `useSaveChangesModal.ts:67-73` resets on both success and rejection; the deleted comment claimed
  the opposite and could have encouraged a regression.
- No duplicate abstraction was introduced. `watch` is imported at module top level alongside
  `ref`, consistent with the project's Python/import preference translated to this TypeScript
  code.

## Tests and minor caveats

The new modal tests directly prove the latch first disables all footer actions, then clears on a
false-to-true `showModal` transition
(`client/src/components/Workflow/Editor/SaveChangesModal.test.ts:36-57`). The page-editor test
proves a rejected save does not navigate, closes the modal, and does not hit `console.error`
(`client/src/components/PageEditor/PageEditorView.test.ts:259-278`). Together with the existing
store test that proves `error` is set before rethrow, these cover the implementation in sensible
unit-sized layers.

Two non-blocking test/documentation improvements would make the intent harder to regress:

- The page-editor test name says it “surfaces the store error,” but it replaces `savePage` with a
  bare rejecting mock and never sets/asserts `store.error` or the `BAlert`. Either rename the test
  or set `store.error` in the mock and assert the alert text. This does not undermine the fix,
  because the real store behavior has separate coverage.
- `useSaveChangesModal` is generic, while its catch comment assumes every future `onSave` callback
  surfaces its own error. Its JSDoc should record that callback contract so a future caller does not
  get a silent failure. The only current caller satisfies it.

## Verification

- `SaveChangesModal.test.ts`: **2 passed**.
- `PageEditorView.test.ts`: **31 passed** (run with Node 25's experimental global web storage
  disabled; the first invocation otherwise failed during test import because Node supplied a
  non-DOM `window.localStorage`, unrelated to the patch).
- ESLint on all four changed files: **passed**.
- Prettier check on all four changed files: **passed**.
- `git diff --check HEAD^`: **passed**.

