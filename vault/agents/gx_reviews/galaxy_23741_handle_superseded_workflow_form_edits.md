# galaxy#23741 - [26.1] Handle superseded workflow form edits

- PR: https://github.com/galaxyproject/galaxy/pull/23741 (mvdbeek, `sentry-usegalaxy-eu-main-1ja5` -> `release_26.1`)
- Reviewed head: `51de5c4e386` (1 commit, no stacking)
- Fix pushed: `03d215de49f` "Key workflow editor module queue by step" (ours, fast-forward onto author branch, 2026-09-29, at user's request)
- Worktree: `~/projects/worktrees/galaxy/pr/23741/`
- CI: 27/27 green. No existing reviews/comments.
- Sentry: USEGALAXY-EU-MAIN-1JA5 (also GALAXY-MAIN-4KSCZZZ001497, GALAXY-AU-SERVER-7QKZZZZFZF0ND): `TypeError: Cannot read properties of undefined (reading 'content_id')`.

## What changed

`Index.vue` `onSetData` runs `getModule` (POST `build_module`) through `this.lastQueue` (`client/src/utils/lastQueue.ts`). `LastQueue` created with defaults (`rejectSkipped = false`), so when a queued, not-yet-started task gets replaced, the replaced promise resolves `undefined` (`skip()`). `.then` read `data.content_id` unconditionally, so it threw. The fix returns early on `undefined` and returns the promise (for testability). The new vitest test drives the real queue: one request in flight, two more edits, and checks that the middle edit is dropped and the latest applied.

"Superseded" means this: a form edit queued behind an in-flight `build_module` request and then replaced by a newer edit before it started. In-flight requests are never aborted (`getModule` ignores the signal). Only queued tasks get skipped. So no requests leak, and `setLoadingState` is only set once a task actually runs, so no loading spinner gets stuck.

## Assessment

For the reported error, the fix is correct and minimal. It handles the queue's documented skip value. It doesn't hide a real failure: `getModule` errors still reject and still set the step's error state through `setLoadingState(stepId, false, msg)`. The `data === undefined` check matches how `LastQueue` is meant to be used here. The other callers either do the same or opt into `rejectSkipped=true` + `ActionSkippedError` (`collectionElementsStore.ts:132`, `historyItemsStore.ts:23`). Either choice is fine.

The real root cause sits one layer down, in how Index.vue keys the queue. The fix stops the crash but keeps the shared queue key, and that key is what drops the edits.

## Findings

### Medium - one `"default"` queue key shared by every step and by workflow loads

`Index.vue:1105` calls `enqueue(() => getModule(...))` with no `arg`/`key`, so every step's edits share the `"default"` key. `_loadCurrent` (`Index.vue:1352`, `enqueue(() => getWorkflowFull(id, version))`) uses the same key. Consequences:

1. **Cross-step edit loss (now silent).** Edit step A while a request is in flight (A's edit is queued). Then edit step B within the throttle window. B replaces A. A's edit is never sent to `build_module`, so the step store keeps A's old `tool_state`. The form still shows the new value, and the next save persists the old one. Before this PR the same edit was lost *and* raised a TypeError. Now it's lost with no signal. The TypeError Sentry was catching may partly be this case, not only "same step typed twice quickly".
2. **Superseded workflow load wipes the editor.** If `_loadCurrent` is queued behind an in-flight form edit (e.g. `onSave` -> `_loadCurrent` at `Index.vue:1227`, or a version switch at `:1252`) and another form edit arrives before it starts, `data` is `undefined`. `_loadCurrent` then calls `resetStores()` (which clears step/connection/state stores and `hasChanges`) and then `fromSimple(id, undefined)`, which throws on `data.steps` (`modules/model.ts:61`). The catch shows "Loading workflow failed..." over an empty editor. The window is unlikely, but the result is bad, and it's the same bug class on the sibling call site in the same file.

Fix (one line, covers both): key the queue per step, so step edits never supersede each other or the workflow load. Only repeated edits to the *same* step get collapsed, which is what's intended:

```js
return this.lastQueue
    .enqueue(() => getModule(newData, stepId, this.stateStore.setLoadingState), undefined, stepId)
```

Optionally, also give `_loadCurrent` its own explicit key (e.g. `"workflow"`) or an `undefined` guard, so a skipped load can never reach `resetStores()`. A test for (1): enqueue edits for two different step ids during an in-flight request and assert both `updateStep` calls happen. That is a small variation on the new test.

If you'd rather keep this PR a narrow Sentry fix, a follow-up is fine. But the guard added here makes (1) silent, so I'd lean toward doing it in the same PR.

### Low - merge-forward conflict

On `dev`, Index.vue has moved to `<script setup>`-style code (`onSetData` at dev `Index.vue:939`, and it already passes `{}` as `arg`). It still has no `undefined` guard and still uses the shared default key. The merge-forward will conflict. It's worth making sure the guard (and the key change, if adopted) lands on dev.

### Nits (optional)

- Test `finally { wrapper.destroy() }`: no other test in the file destroys the wrapper. It's harmless, but it's the odd one out.
- The comment `// Superseded edits resolve without module data.` is useful, not obvious. Keep it.

## Verification of Medium (2026-09-29)

It holds. `LastQueue.enqueue(action, arg, key = "default", options)` (`client/src/utils/lastQueue.ts`) keeps one pending slot per key, and the replaced task resolves `undefined`. Both call sites in `Index.vue` use the default key: `onSetData` at :1105 and `_loadCurrent` at :1352. There's a single `this.lastQueue` instance (:849). Claims (1) and (2) are both real.

- Red to green: I added the vitest `applies queued form edits for different steps`. Step 1's edit is in flight, then an edit for step 0 and a second edit for step 1 get queued. On `51de5c4e386` it fails because `getModule` is never called with step 0's data. With `enqueue(..., undefined, stepId)` all 12 tests in `Index.test.ts` pass, including the PR's same-step test, unchanged. Ran under node 22.20.0. Prettier and eslint are clean; the one warning, `multi-word-component-names`, was already there.
- Same-step coalescing is unchanged, because `pending`, `lastRun` and the throttle are all tracked per key.
- Residual, left alone: a queued `_loadCurrent` replaced by *another* `_loadCurrent` still resolves `undefined`, so it still reaches `resetStores()` + `fromSimple(id, undefined)`. That was there before this PR. It's load vs. load, which is rare. An `undefined` guard would close it.
- Ordering change: loads no longer wait behind an in-flight edit, so a late edit response can land on a freshly reloaded store. That mostly matters on a version switch. The old code wasn't safe either, since an edit queued behind a load ran against the new store. On save followed by reload, the new behaviour is better: before, the edit was applied and then wiped by `resetStores()`.

## Tests

- The new test is a reasonable unit-level regression test. It uses the real `LastQueue` and fake timers and mocks only `getModule`/`updateStep`. The author reports red-to-green with the guard removed. Not re-run locally (no `client/node_modules` in the worktree). CI is green.
- The level is right. A Selenium/Playwright test couldn't reliably reproduce a ~1s throttle race, and `lastQueue.test.ts` already covers the queue semantics.
- Assertions aren't trivial. They check that the skipped edit never calls `getModule`, and that the first in-flight response is applied before the latest one. Nothing was weakened.
- Gap: no test covers edits to different steps (see Medium). One would fail under the current shared key and pass with the per-step key.

## Draft GitHub review

> *Posted by Claude (AI assistant) on behalf of jmchilton. Not authored by them personally.*
>
> Thanks, the guard is correct for the reported TypeError, and the regression test using the real `LastQueue` is nice.
>
> I pushed one small commit on top (`03d215de49f`, "Key workflow editor module queue by step"). `onSetData` enqueued with no key, so every step's edits (and `_loadCurrent`'s `getWorkflowFull`) shared `LastQueue`'s `"default"` key. That meant:
>
> 1. An edit on step A queued behind an in-flight request got replaced by an edit on step B. A's new state was never sent to `build_module`, and the store kept the old `tool_state`, which then got saved. Before this PR that also threw the TypeError; with the guard it was silently dropped. Some of the Sentry events may be this case.
> 2. If `_loadCurrent` (after save or on a version switch) was queued behind a form edit and another edit came in, the load resolved `undefined`. `resetStores()` ran, then `fromSimple(id, undefined)` threw, and the editor was left empty.
>
> The commit passes `stepId` as the queue key (`enqueue(..., undefined, stepId)`), so only repeated edits to the same step collapse. It also adds a test next to yours: an edit for step 0 and a second edit for step 1, queued while a step 1 request is in flight, should both reach `updateStep`. It fails without the key change and passes with it. Your test is untouched. Feel free to drop or rework the commit if you'd rather keep this narrow.
>
> Optional: a load superseded by another load can still reach `resetStores()` with `undefined`, so an `undefined` guard in `_loadCurrent` would harden that.
>
> Also a heads-up: `dev` has the `<script setup>` rewrite of `Index.vue`, so the merge-forward will need a manual port of both the guard and the key.
