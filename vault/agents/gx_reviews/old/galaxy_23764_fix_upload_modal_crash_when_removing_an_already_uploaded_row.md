# galaxy#23764 — [26.1] Fix upload modal crash when removing an already uploaded row

https://github.com/galaxyproject/galaxy/pull/23764 · mvdbeek · head `ddd025158ec` · base `release_26.1` · reviewed 2026-09-27

## Summary

`UploadQueue._process()` / `_processUrls()` call `remove(index)` when an item is submitted, so success/error rows are no longer in `queue`. `DefaultRow.removeUpload()` deliberately allows removing `init`/`success`/`error` rows and `DefaultBox.eventRemove()` then calls `queue.remove(index)`. Old `remove()` dereferenced `file.name` on `undefined` and threw. The fix: `remove()` is a noop when the index is not queued. Sentry: ~2000 events / ~1100 users.

## Findings

- **Blocker:** none.
- **Major:** none.
- **Minor:** none.
- **Nits (note only, not for the review):**
  - Test's trailing `q.add([StubFile("a", 1)]); expect(q.size).toEqual(1)` checks that `_process` already cleared `fileSet` at submit time, not something `remove()` does. Harmless.
  - The `fileEntries`/`announce`/`get` fixture is now copy-pasted three times in `upload-queue.test.js` (lines ~81, ~184, new). Could be a helper, but this file is dead on dev, so not worth asking.

## Root cause vs symptom

Root cause, not a band-aid. The queue only holds items that haven't been submitted yet, and `DefaultBox.uploadItems` holds the rows, so the queue has no stale state here. The real bug was that `remove()` assumed the index was still queued. Making `remove()` idempotent in the queue is the right fix and better than gating on status in `DefaultBox`: the queue owns its own membership, and `_process`/`_processUrls` also call it.

Sibling paths: `DefaultBox` is the only `UploadQueue` consumer (`grep` in `client/src`). The other `DefaultBox` event handlers already guard with `if (it)`. `CompositeBox` doesn't use the queue. `_process`/`_processUrls` only call `remove` on keys they just read from the queue. No other place has the same crash.

## Reuse

Small change inside the existing abstraction. The comment explains why the index can be missing, so it's useful. No new abstraction is needed since the legacy modal is gone on dev.

## Tests

- New unit test in `client/src/utils/upload-queue.test.js`. **Red-to-green confirmed:** with the old `upload-queue.js` restored, it fails with `TypeError: Cannot read properties of undefined (reading 'name')`. With the fix it passes.
- `upload-queue.test.js` + `components/Upload/DefaultBox.test.ts`: 20/20 pass (node 22.20.0, borrowed node_modules symlink, removed afterwards; worktree clean).
- CI: all reported checks passing. No reviews/comments yet.

## Relation to #23765

No overlap or conflict. #23765 changes the new upload panel (`Panels/Upload/UploadMethodView.vue`, `composables/upload/useUploadSubmission.ts`): it catches the rejected `submitPreparedUpload` promise and marks failed/remaining library copies and the batch as errored. #23764 only touches the legacy `utils/upload-queue.js`. Both come from the same Sentry-driven sweep of upload errors, but they don't share a root cause or files. They can merge in either order.

## Suggested verdict

Approve.

## Draft GitHub review

*Posted by Claude (AI assistant) on behalf of @jmchilton — not authored by them personally.*

LGTM. This fixes the actual cause, not just the symptom: the queue drops items when they're submitted, and the modal intentionally lets you remove success/error rows, so `remove()` has to handle an index that's already gone. Making it idempotent in `UploadQueue` is the right place. `DefaultBox` is the only consumer and its other handlers already guard missing rows. With the old `remove()` restored, the new test fails with the reported `TypeError`, and it passes with the fix.
