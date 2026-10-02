# galaxy#23837 - [26.1] Save only edited fields from the history details editor

- PR: https://github.com/galaxyproject/galaxy/pull/23837 (mvdbeek, base `release_26.1`)
- Head: `a3c4f613c7e`
- Reviewed: 2026-10-01
- Size: +55/-3, 2 files (`DetailsLayout.vue`, `DetailsLayout.test.js`)

## Summary

`DetailsLayout.onToggle` snapshots `name/annotation/tags` from props; `onSave` used to emit all
three. `HistoryDetails.onSave` -> `historyStore.updateHistory` only writes the store after the PUT
returns (`historyStore.ts:594-597`), so reopening the editor before that copies stale props, and the
next save writes them back. PR keeps an `openedWith` snapshot and emits only fields that differ;
emits nothing if nothing changed.

Flake explanation holds: `history_panel_add_tags` is `@edit_details` (opens editor, adds tags,
saves), then `set_history_annotation` immediately reopens the editor and saves
(`navigates_galaxy.py:2609`, `:3077`). Old code sent `tags: []` with the annotation. Fixed code sends
`{tags}` then `{annotation}`: different fields, so the server order no longer matters.

Checked:
- Consumers: `HistoryDetails.vue:25` spreads into `updateHistory` (PUT accepts partial body);
  `CollectionDetails.vue:23` -> `CollectionPanel.updateDsc` (`:88-96`) uses `||` fallbacks, so
  partial is fine. Bonus: collections no longer get a spurious `annotation: null`. No other parents.
- `ClickToEdit` name path already emitted `{name}` alone, so partial payloads were already part of
  the contract.
- Annotation: `HistoryDetails` passes `history.annotation || ''`, so the snapshot is `""`, not
  `null`. Clearing the textarea gives `""`, so no false diff. Trim: `BFormInput`/`BFormTextarea trim`
  only emit when the user types, so no false diff on open.
- Tags: `StatelessTags` always emits a new array (`StatelessTags.vue:53,64-67`), so sharing the
  array between the shallow copy and props is safe. `JSON.stringify` is order-sensitive, and the
  UI can't reorder tags anyway.
- Tests: red-to-green confirmed locally. With base `DetailsLayout.vue` both new tests fail; with the
  PR all 6 pass. CI 27/27 green.
- dev: same `onSave`/`onToggle` logic, and `updateHistory` there still has no optimistic update.
  `DetailsLayout.vue` auto-merges into `origin/dev`.

**Verdict: approve.** It fixes the flake's root cause for the case that happens. One residual race
is worth a follow-up, not a blocker.

## Findings

1. **Medium (follow-up) - same-field race remains.** `DetailsLayout.vue:115-123`: open, add tag A,
   save, then reopen before the PUT returns. The snapshot is `tags: []`. Add tag B and save, and
   `[B]` is emitted, which overwrites `[A]` on the server. The diffing narrows the window to
   "same field edited twice", but the stale snapshot is still the root cause. The reusable fix sits
   in the store, not in each editor: update optimistically in `historyStore.updateHistory`
   (`historyStore.ts:594`), so props are current when the editor reopens:
   ```ts
   async function updateHistory(id: string, update: UpdateHistoryPayload) {
       setHistory({ id, ...update } as AnyHistory);
       const savedHistory = (await updateHistoryFields(id, update)) as HistorySummaryExtended;
       setHistory(savedHistory);
   }
   ```
   (On error, refetch or revert.) Keep the PR's diffing as well: it still guards against a slow
   first response landing after a second save's response. The alternative is to disable the editor
   toggle while a save is pending. Either can be a follow-up after this 26.1 fix.
2. **Low - emit contract is now partial, but types say otherwise.** `HistoryDetails.vue:25` types
   the payload as `HistorySummary`. Type the emit so consumers see the partial shape:
   `const emit = defineEmits<{ (e: "save", changes: Partial<EditableDetails>): void }>();`. Then
   export `EditableDetails` (or put it in `./types`) and use it in `HistoryDetails.onSave`.

## Draft review

_This review was posted by Claude (AI assistant) on behalf of jmchilton._

Looks right to me. I traced the flake: `history_panel_add_tags` saves through the editor, then
`set_history_annotation` reopens it right away. `updateHistory` only writes the store after the PUT
returns, so the old code sent back `tags: []`. Now the two saves touch different fields. Both
consumers handle partial payloads: `HistoryDetails` spreads into the PUT, and `CollectionPanel.updateDsc`
falls back with `||`. Collections also stop getting a stray `annotation: null`. I confirmed both new
tests fail against the old component and pass with the change.

Two small things, neither blocking:

1. A race on the same field is still possible. Add tag A, save, reopen before the PUT returns, add
   tag B, save: `[B]` is sent and A is lost. The stale snapshot comes from `updateHistory` waiting on
   the response. An optimistic `setHistory({ id, ...update })` before the PUT in
   `historyStore.updateHistory` would keep props current for any editor. Keeping the diffing on top
   still helps when responses come back out of order. Fine as a follow-up on dev.
2. The save payload is now partial, but `HistoryDetails.onSave` still types it as
   `HistorySummary`. A typed `defineEmits<{ (e: "save", changes: Partial<EditableDetails>): void }>()`
   would make that visible to consumers.
