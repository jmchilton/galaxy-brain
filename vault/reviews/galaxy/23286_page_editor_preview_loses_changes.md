# PR 23286 — [26.1] Fix report/page editor loses changes when previewing

**Verdict: approve-with-comments** — but CI is red and needs triage before merge.

> **Final pass 2026-08-17 at `b7bbc7d9` — see [Final pass](#final-pass-2026-08-17--b7bbc7d9) at the
> bottom. Both remaining P1s are resolved: #1 fixed with a `finally` + regression test, #3 (CI)
> cleared as a pre-existing base-branch failure. #2 is the only thing left worth holding for, and
> it is a narrow path. Body below is the original review at `d60ee97f`.**

Fixes [#23161](https://github.com/galaxyproject/galaxy/issues/23161) ("Previewing an unsaved
invocation report discards changes"). Base `release_26.1`, author `ahmedhamidawan`.

The direction is right and the abstraction is the *good* kind: a router-guard-based unsaved-changes
interceptor is strictly better than the two mechanisms Galaxy already has, and it is packaged as a
reusable composable rather than inlined into `PageEditorView`. Most of what follows is robustness and
lifecycle hardening, plus one path where the reported bug is not actually fixed.

---

## What the PR does

- New `client/src/composables/useSaveChangesModal.ts` (72 lines): registers `onBeforeRouteLeave` +
  `onBeforeRouteUpdate` guards; when `isDirty` it stashes `to.fullPath`, opens the modal, and calls
  `next(false)`. `handleSaveChangesProceed(url, forceSave, ignoreChanges)` optionally saves, then sets
  a `bypassGuard` latch and re-pushes.
- `PageEditorView.vue` consumes it, renders the existing `Workflow/Editor/SaveChangesModal.vue`, adds a
  `beforeunload` listener, and drops `store.clearCurrentPage()` from `handleBack()`.
- `PageEditorView.test.ts` — five new guard tests; also deletes a large block of commented-out
  "Save & View" tests that the guard work supersedes.
- `MarkdownToolBox.vue` — drive-by: gives `ActivityPanel` its required `title` prop.

### Does it fix the reported bug?

Yes, on the inline path. Tracing the invocation-report case concretely:

- The invocation "reports" tab renders `HistoryPageView` with `display-only`
  (`WorkflowInvocationState.vue:509-513`), so the *editor* actually lives at
  `/histories/{historyId}/pages/{pageId}?invocation_id={id}` (`HistoryPageView.vue:152-156`).
- `handlePreview` (`PageEditorView.vue:132-149`) pushes
  `/workflows/invocations/{id}/reports?id={pageId}` — a different matched record, so
  `onBeforeRouteLeave` fires and the modal appears. ✅

I also confirmed the guards actually register despite `PageEditorView` being a *nested*, non-routed
component in both mount contexts (`PageEditor.vue:2` and `HistoryPageView.vue:212`). vue-router 3.6.5's
`useFilteredGuard` walks *up* the parent chain to the nearest `<router-view>` to derive the depth
(`vue-router/composables.mjs:78-108`), so it resolves to the `<router-view>` in
`entry/analysis/modules/Analysis.vue:89`. This was my main structural worry and it does not bite —
worth stating because the unit tests mock `vue-router/composables` wholesale and therefore prove
nothing about it.

Note the same file also confirms these are implemented as *global* `router.beforeEach` guards with a
`to`/`from`/`depth` filter, removed via `onUnmounted` — so no leak across route changes, and exactly
one of leave/update fires per navigation (the two filters are complementary).

---

## P1 — blocking

### 1. `bypassGuard` is not reset in a `finally` — one rejected push permanently disables the guard

`client/src/composables/useSaveChangesModal.ts:63-66`:

```ts
bypassGuard = true;
await router.push(url);
bypassGuard = false;
```

Galaxy's monkeypatched `push` (`client/src/entry/analysis/router-push.js:46-50`) only swallows
`NavigationDuplicated`; anything else is rethrown, so the `await` rejects and `bypassGuard` is left
`true` for the rest of the component's life. Every subsequent navigation then sails through with
unsaved changes — i.e. the failure mode is *silently reintroducing the bug this PR fixes*. Reachable
via the global `beforeEach` in `router.js:979-994` (`AdminRequired` / `RegisteredUserRequired` →
`next(error)`), or any redirect.

```ts
try {
    bypassGuard = true;
    await router.push(url);
} finally {
    bypassGuard = false;
}
```

### 2. A failed save leaves the user wedged

`useSaveChangesModal.ts:55-60` awaits `onSave()` with no `try`. `store.savePage()` **re-throws** on
failure (`client/src/stores/pageEditorStore.ts:196-199`), so:

- `handleSaveChangesProceed` rejects → unhandled promise rejection from a `@on-proceed` handler;
- `bypassGuard`/`router.push` never run, so the user stays on the page (fine, arguably desirable);
- but `SaveChangesModal`'s `busy` ref is set `true` in `saveChanges()` and **never** reset
  (`SaveChangesModal.vue:25,50,55` — `busy.value = true` appears twice, `false` zero times).

Because `PageEditorView.vue:202-206` renders the modal *unconditionally* at the top of the template, the
component instance survives the failed navigation, so the next time the guard opens the modal all three
buttons — including **Cancel** — are `:disabled="busy"`. The only escape is `GModal`'s close button
(`GModal.vue:205`), which is not gated by `busy`. In the workflow editor this latent bug is masked
because a successful save always navigates and tears the component down; here it is directly reachable.

Fix: `try/catch` around `onSave()` in the composable and re-open / leave the modal open on failure, and
reset `busy` in `SaveChangesModal` (`busy.value = false` on the `update:show-modal` → false path, or
have the parent drive it). The `busy` half is pre-existing, but this PR makes it reachable.

### 3. CI is red — `test_history_pages.py::TestHistoryPages::test_revision_diff_view`

Two "Test" jobs fail (`gh pr checks 23286`). The Selenium failure is
`TestHistoryPages::test_revision_diff_view`, at `test_history_pages.py:534`:
`revision_compare_previous_button.assert_absent_or_hidden()` after clicking the oldest revision — i.e.
`isOldestRevision` was false when it should have been true. It failed on more than one attempt
(two artifact directories under
`~/projects/ci-artifacts/galaxy/pr/23286/raw/31542940920/artifact-9122718854/`).

I could not construct a path from this diff to that assertion — neither `PageRevisionView.vue`
(the `v-if="!isOldestRevision"` at line 85) nor the revision store state is touched, and the test itself
is unmodified. My read is a pre-existing race in `history_page_open_revisions()` → async `loadRevisions()`
→ `revision_item.all()`. **But I did not verify `release_26.1` is green for this test**, so the author
should confirm rather than assume. The Playwright failure
(`test_tool_discovery_view.py::TestToolDiscoveryViewAnonymous::test_tool_discovery_help_toggle_shows_and_hides`)
is plainly unrelated. `client-unit-test` and `build-client` both pass.

---

## P2 — should fix

### 4. The window-manager preview path bypasses the guard entirely — bug not fixed there

`handlePreview` goes through `pushToFrameOrPage` (`composables/windowAwareNavigation.ts:33-51`). When
`Galaxy.frame.active`, it pushes with a `title` option, and the monkeypatch short-circuits at
`router-push.js:38-42`:

```js
if (title && !preventWindowManager && Galaxy.frame && Galaxy.frame.active) {
    Galaxy.frame.add({ title: title, url: location });
    return;
}
```

`originalPush` is never called, so **no navigation guard runs**. `windowManagerStore.add()` pushes a
window rendered as an `<iframe :src>` (`WindowManager/WindowManagerWindow.vue:220`), i.e. a fresh
document that fetches the *saved* page from the API. Result: with the window manager on, clicking
Preview with unsaved changes still shows stale content and the user gets no prompt — the literal
complaint in #23161.

Mitigating: the window manager is opt-in and off by default (`windowManagerStore.ts:25`,
`const active = ref(false)`). Still, this is the one path the issue names. Options: have `handlePreview`
check `store.isDirty` and open the modal itself before delegating to `pushToFrameOrPage`, or have
`useSaveChangesModal` expose a `guardedNavigate(fn)` wrapper for non-router navigations. At minimum call
it out in the PR description.

### 5. `beforeunload` listener is registered after an `await` — leaks on fast unmount

`PageEditorView.vue:82-89`: the `addEventListener` sits *after* `await store.loadPage(props.pageId)`.
If the component unmounts while that request is in flight, `onUnmounted` (line 92) removes a listener
that does not exist yet, and the continuation then attaches one that is never removed — a stale handler
closing over a dead component, firing on every future page unload.

Register it synchronously at the top of `onMounted`, or better, use `useEventListener` from
`@vueuse/core` (already a dependency and already used at `composables/fileDrop.ts:1,113-116`), which
owns the teardown:

```ts
useEventListener(window, "beforeunload", handleBeforeUnload);
```

### 6. "Don't Save" does not actually discard — and `store.discardChanges()` already exists

`useSaveChangesModal.ts:55-67`: the `ignoreChanges` branch just navigates. Nothing reverts
`currentContent`/`currentTitle`. It *works* only because
`Analysis.vue:89` is `<router-view :key="$route.fullPath" />`, so any fullPath change destroys the
subtree and `PageEditorView`'s `onUnmounted` → `store.clearCurrentPage()` (line 97) wipes the state.
That is an incidental dependency on an unrelated `:key`, and it is exactly the mechanism that caused
the original bug.

`pageEditorStore.ts:233-236` already has:

```ts
function discardChanges() {
    currentContent.value = originalContent.value;
    currentTitle.value = originalTitle.value;
}
```

Give the composable an optional `onDiscard?: () => void` and have `PageEditorView` pass
`() => store.discardChanges()`. Then the semantics are explicit and no longer depend on the router-view
key. The test named `"Don't Save proceeds: discards changes and navigates without saving"` would then
be able to assert the discard it claims to test (today it asserts only that `savePage` was not called).

### 7. Every guard-blocked navigation emits an unhandled promise rejection

`next(false)` makes vue-router reject the push with `createNavigationAbortedError`
(`vue-router.esm.js:2364-2366, 2034-2041`), which is a plain `Error` carrying `_isRouter`/`type: 4` and
**no** `name === "NavigationDuplicated"`. The monkeypatch's catch (`router-push.js:46-50`) therefore
rethrows, and no caller handles it (`handleBack`, `pushToFrameOrPage`, `RouterLink.navigate` all push
bare). So the console gets `Uncaught (in promise) Error: Navigation aborted from … via a navigation
guard` on every block.

I checked that this does *not* escalate: `confirmTransition`'s `abort` skips `errorCbs` for navigation
failures (`vue-router.esm.js:2303-2319`), so `router.onError` → `router.push({name: "error"})`
(`router.js:1002-1004`) does not fire. So it is noise, not breakage — but this PR's own sibling commit
was "prevent console errors", and Galaxy has E2E tests that inspect the browser log. Cheapest fix:
widen the monkeypatch catch to also swallow `isNavigationFailure(err, NavigationFailureType.aborted)`.

### 8. Under-typed guard signature

`useSaveChangesModal.ts:41`:

```ts
function guard(to: { fullPath: string }, _from: unknown, next: (arg?: false) => void)
```

vue-router 3 ships the real types — `composables.d.ts` declares
`onBeforeRouteLeave(leaveGuard: NavigationGuard)`, and `NavigationGuard` / `Route` are exported from
`vue-router`. Use them; the hand-rolled shape silently forfeits type checking on `to` and would not
catch, say, a `to.path` vs `to.fullPath` slip. The same ad-hoc cast is duplicated in the test helper
(`PageEditorView.test.ts:45-54`).

### 9. `router` should not be a parameter

`useSaveChangesModal(isDirty, onSave, router)` — the composable is already running inside `setup()`
(it has to be, for `onBeforeRouteLeave`), and vue-router's own `useFilteredGuard` calls `useRouter()`
internally. Just call `useRouter()` in the composable and drop the third argument; one fewer thing for
the next caller to wire up.

---

## P3 — nits / follow-ups

10. **The composable + component split is a footgun, and the docblock knows it.**
    `useSaveChangesModal.ts:10-19` has to shout "**IMPORTANT:** this composable does not render
    anything! The caller MUST render `SaveChangesModal.vue` … Without that template usage, `isDirty`
    navigation is blocked (`next(false)`) but the user is never given a way to proceed as the guard
    would strand them on the page." A doc comment is a weak guard against a hard lock-up. Consider
    collapsing both halves into a single renderless-plus-modal component
    (`<UnsavedChangesGuard :is-dirty="store.isDirty" :on-save="..." />`) that registers the guard in its
    own `setup` and renders the modal. One import, no way to get it half-installed.

11. **`SaveChangesModal.vue` is still under `components/Workflow/Editor/`** while now imported from
    `components/PageEditor/` via a `../Workflow/Editor/…` relative path
    (`PageEditorView.vue:18`, `PageEditorView.test.ts:14`). The TODO at
    `useSaveChangesModal.ts:32-34` acknowledges this. Now that there is a second, non-workflow caller,
    the move to `components/Common/` (or similar) is cheap and should happen with this PR rather than
    later.

12. **Galaxy now has three unsaved-changes mechanisms.** (a) `router.confirmation` + native `confirm()`
    (`App.vue:36,215-217,237-241`, `router.js:967-979`, `router-push.js:30-36`); (b) the workflow
    editor's call-site `onNavigate()` + `SaveChangesModal` (`Workflow/Editor/Index.vue:1164-1190`);
    (c) this new guard-based one. The new one is the best of the three — call-site interception can
    always be routed around, which is precisely why (b) did not prevent this bug class. Worth filing a
    convergence issue so this reads as a step toward one mechanism rather than accretion of a third.
    The composable's own TODO gestures at it but there is no tracked follow-up.

13. **Test coverage is real but shallow in exactly the risky places.** The five new tests do fail
    against pre-fix code (with `vue-router/composables` fully mocked, `mockOnBeforeRouteLeave.mock.calls`
    is empty, so `callGuard` invokes `undefined` and throws; `findComponent(SaveChangesModal)` would also
    be empty) — so they are not happy-path-only. But because `mockPush` (`PageEditorView.test.ts:31`) is a
    bare resolved stub that never re-runs guards:
    - `bypassGuard` — the trickiest logic and the subject of finding #1 — is never exercised;
    - there is no test that a *second* navigation after Save/Don't-Save is allowed through;
    - `handleBeforeUnload` has no test at all;
    - there is no unit test for `useSaveChangesModal` itself, only through the view;
    - save-failure behaviour (#2) is untested.
    A small `useSaveChangesModal.test.ts` with a stub router whose `push` re-invokes the captured guard
    would cover #1 and #2 directly.

14. **A removed assertion, but a justified one.** `PageEditorView.test.ts` drops
    `expect(store.clearCurrentPage).toHaveBeenCalled()` from the back-button test. That is correct — the
    call had to go, because clearing the store zeroes `currentContent`/`originalContent` and so makes
    `isDirty` false, defeating the guard on the very path it needs to protect. Flagging it only so it
    reads as deliberate. Ideally replace it with a positive test: back with unsaved changes now opens the
    modal instead of navigating.

15. **`pendingNavUrl` is never cleared on cancel** (`useSaveChangesModal.ts:37`). Harmless — it is
    overwritten on the next block — but leaves a stale URL on a hidden modal.

16. **Guard-based re-push drops the monkeypatched push options.** The guard only sees the resolved `to`,
    so `handleSaveChangesProceed`'s `router.push(url)` loses any `title` / `force` /
    `preventWindowManager` the original call site passed (`router-push.js:14`,
    `windowAwareNavigation.ts:36-48`). Not hit by `handlePreview` today (no `force`), but it is a
    latent trap for the next `pushToFrameOrPage` caller behind a guard, and it overlaps with #4.

17. **`MarkdownToolBox` drive-by is legitimate.** `ActivityPanel.vue:6` declares `title: string` with no
    default in `withDefaults`, so omitting it warns. `MarkdownToolBox` overrides the
    `activity-panel-header-top` slot so the `<h2>` is not rendered, but the root
    `:data-description="props.title"` (`ActivityPanel.vue:24`) changes from `undefined` to
    `"Insert Markdown Objects"`. I grepped `lib/galaxy_test/` and `client/tests/` for selectors on the
    markdown toolbox / activity panel and found none, so no test should break. Unrelated to the fix
    though — a sentence in the PR description would help reviewers.

18. **Display-only unmount still skips cleanup.** `PageEditorView.vue:93` guards
    `clearCurrentPage()` behind `!props.displayOnly`, so leaving a display-only view leaves
    `currentPage`/`currentContent` populated. Pre-existing, and `loadPage` overwrites on the next mount —
    but slightly more visible now that `handleBack()` no longer clears. Low risk; noting for
    completeness.

---

## What I verified

- Read the full diff, plus `PageEditorView.vue`, `useSaveChangesModal.ts`, `PageEditorView.test.ts`,
  `SaveChangesModal.vue`, `pageEditorStore.ts`, `HistoryPageView.vue`, `PageEditor.vue`,
  `windowAwareNavigation.ts`, `router-push.js`, `router.js`, `App.vue`, `Analysis.vue`,
  `ActivityPanel.vue`, `windowManagerStore.ts`, `WorkflowInvocationState.vue` in the worktree.
- Read vue-router **3.6.5** source from `node_modules` (borrowed from
  `~/projects/worktrees/galaxy/pr/23233/client/node_modules/`, same declared `^3.6.5` range) to confirm:
  guards register for nested non-routed components via the RouterView-depth walk; leave/update filters are
  mutually exclusive; guards are removed on unmount; `next(false)` calls `ensureURL(true)` (so the address
  bar *is* restored on back-button aborts — no finding there); the aborted error's shape; and that
  `router.onError` is not invoked for navigation failures.
- Grepped for other consumers of `SaveChangesModal` / `useSaveChangesModal`: only
  `Workflow/Editor/Index.vue` (pre-existing, untouched by this PR — it uses call-site `onNavigate`, not
  route guards, so there is no interaction) and the new `PageEditorView` pair. Nothing breaks.
- Grepped for pre-existing route-leave / unsaved-changes patterns: `onBeforeRouteLeave` appears nowhere
  else in `client/src`; the only prior art is the `update:confirmation` → `router.confirmation` →
  native `confirm()` chain, which the composable's docblock correctly declines to entangle with.
- Traced the invocation-report edit/preview URLs end to end through the router table to confirm which
  guard fires.
- Read the CI artifact JSON at `~/projects/ci-artifacts/galaxy/pr/23286/converted/` and `gh pr checks` to
  identify the two failing jobs (note: `ghwt` reported "0 test failures", which is wrong here).
- Confirmed `@vueuse/core`'s `useEventListener` is already used in `client/src/composables/fileDrop.ts`.

## What I did **not** check

- **I did not run the client unit tests.** The worktree has no `client/node_modules` and a full
  `yarn install` was not worth the cost; borrowing another worktree's `node_modules` (different base
  branch) risked a misleading result. My "these tests fail pre-fix" claim is from reading the mocks, not
  from executing a revert. CI's `client-unit-test` job passes on the PR as-is.
- **I did not verify `test_revision_diff_view` is green on `release_26.1`.** My "probably pre-existing
  flake" read is inference from the diff not touching that code, not evidence.
- **I did not exercise anything in a browser** — no manual repro of #23161, and no manual check of the
  window-manager preview path (finding #4). #4 is a code-path argument
  (`pushToFrameOrPage` → early `return` in `router-push.js` → `<iframe>`), not an observed failure.
- I did not check the `hasChanges`/`update:confirmation` interaction if a user somehow has both the
  workflow editor and a page editor mounted; I believe it is impossible given the routing but did not
  prove it.
- I did not review whether `edit_source` should be set when saving through the modal
  (`savePage()` is called with no argument at `PageEditorView.vue:78`; the store defaults it to `"user"`
  only in standalone mode, `pageEditorStore.ts:168-171`). Possibly intentional; flagging as unexamined.

---

## Final pass 2026-08-17 — `b7bbc7d9`

Original review was written against `d60ee97f`. One commit landed since: `b7bbc7d9` "await router push
and only reset `bypassGuard` if it succeeds", in response to the posted comment on finding #1. Diff is
two files — `useSaveChangesModal.ts` (+8/-4) and `PageEditorView.test.ts` (+45/-12, mostly a
`wrapper.vm.$nextTick()` → `nextTick()` sweep). Nothing else in the PR moved.

### #1 — fixed, correctly, and with the regression test asked for

`useSaveChangesModal.ts:62-67` is now exactly the suggested shape:

```ts
bypassGuard = true;
try {
    await router.push(url);
} finally {
    bypassGuard = false;
}
```

And `PageEditorView.test.ts` gains `"keeps guarding subsequent navigation after a rejected
router.push"`: `mockPush.mockRejectedValueOnce(...)`, proceed via Don't Save, then re-invoke the guard
and assert `next(false)` + modal reopens. That is the invariant, tested at the level it can be tested
at given the mocked router. Fully addressed.

Two small things came in with it, both new:

- **The comment and the commit message contradict the code.** `useSaveChangesModal.ts:63` says
  `// Await the push and only reset the bypassGuard if it succeeds`, and the commit headline says the
  same. `finally` resets it *unconditionally* — that is the entire point of the fix. A future reader
  taking the comment at face value could "restore" the bug. Drop the comment or reword to
  "reset even if the push rejects, so a failed navigation can't disable the guard".
- **The test asserts on the console noise** (`expect(consoleErrorSpy).toHaveBeenCalled()`). It codifies
  the unhandled rejection from finding #7 as expected behaviour rather than merely silencing it. Once
  #7 is addressed that assertion becomes a false failure. Prefer spying to silence without asserting.

### #3 (CI) — cleared, pre-existing, not this PR

The picture changed and is now clean enough to merge on:

- **Selenium is fully green.** Run `31610796188` (`Test (3.10, 0/1/2)`) passes. The
  `test_history_pages.py::TestHistoryPages::test_revision_diff_view` failure that drove the original
  P1 did not recur — it was the flake the review guessed it was.
- **`client-unit-test` (×2), `build-client` (×5), all API/integration/framework jobs, CircleCI: pass.**
- **One red check remains**: `Test (3.10, 0)` in the *Playwright* workflow `31610796261` —
  `test_tool_discovery_view.py::TestToolDiscoveryViewAnonymous::test_tool_discovery_help_toggle_shows_and_hides`,
  a 10s timeout waiting for
  `#g-card-content-__FILTER_FAILED_DATASETS__ [data-description="tools list toggle tool help"]`.

I verified the base-branch claim the original review flagged as unverified. The **identical test with the
identical selector fails on `release_26.1` itself** — runs at `3d95b2e7` (2026-08-12) and `34fe4186`
(2026-08-11). The PR's diff is four files, none of which touch the tools list or `ToolsList`/tool
discovery. So this is a broken-on-base test, not a regression. Worth its own issue, not a blocker here.

### Everything else — unchanged, all still present at `b7bbc7d9`

Re-read the current files; findings #2 and #4–#18 stand verbatim. The one that still deserves a decision
before merge:

- **#2 — a failed save wedges the modal.** `handleSaveChangesProceed` still `await onSave()` with no
  `try`, and `SaveChangesModal.vue` still sets `busy.value = true` in both `dontSave()` and
  `saveChanges()` and never sets it `false` anywhere. Because `PageEditorView.vue:202-206` renders the
  modal unconditionally, the instance outlives the failed navigation: every later open has Cancel /
  Don't Save / Save all `:disabled="busy"`, escapable only via `GModal`'s X. The user isn't locked out
  of the app — they stay on the page and can still hit the main Save button — but the modal is dead for
  the rest of the session. Reachable whenever `store.savePage()` rejects, which it does by re-throwing.

The rest are follow-ups, not merge gates: #4 (window-manager preview path still bypasses the guard —
the one path #23161 names, but opt-in and off by default), #5 (`beforeunload` registered after an
`await`), #6 (Don't Save doesn't call the existing `store.discardChanges()`, relies on the router-view
`:key`), #7 (unhandled rejection per block), #8/#9 (typing, `router` param), #11 (move
`SaveChangesModal` out of `Workflow/Editor/`), #12 (three unsaved-changes mechanisms — file the
convergence issue).

### Merge readiness

**Ready, modulo #2.** The direction and the abstraction are right, the one blocking correctness bug was
fixed properly with a test, and CI red is base-branch breakage rather than anything this PR caused. If
#2 lands here it is a clean approve; if it is deferred, it should be deferred *deliberately* with an
issue, because this PR is what makes the pre-existing `busy` leak reachable. #6 and #11 are cheap
enough to be worth folding in now rather than "later"; the rest can be follow-ups.

### What I verified in this pass

- Fetched `pull/23286/head`, fast-forwarded the worktree `d60ee97f` → `b7bbc7d9`, read the full
  interdiff.
- Read `useSaveChangesModal.ts`, `PageEditorView.vue`, `SaveChangesModal.vue` at current head to confirm
  findings #2/#5/#6 are untouched — `busy.value = false` appears zero times in `SaveChangesModal.vue`.
- `gh pr checks 23286` on the new head; identified the failing workflow as "Playwright tests"
  (`31610796261`) and pulled `--log-failed`.
- `gh run list --workflow "Playwright tests" --branch release_26.1` and `--log-failed` on the failing
  base runs to confirm the same test fails without this PR. **This closes the "did not verify
  `release_26.1` is green" gap from the original review** — for the Playwright test. The Selenium
  `test_revision_diff_view` question is moot now that Selenium is green on the PR.
- Confirmed the review comment thread: one comment (finding #1) posted, `ahmedhamidawan` replied "Done!"
  — no other reviewer feedback on the PR.

### Still not checked

- Client unit tests still not run locally (no `client/node_modules` in the worktree); relying on CI's
  passing `client-unit-test`, which does now exercise the new regression test.
- Still no browser verification — #4 remains a code-path argument, not an observed failure.

---

## Proposed fix for #2 — `review/23286-save-failure-wedge` @ `2fd6243a`

Local branch off `b7bbc7d9` in `~/projects/worktrees/galaxy/pr/23286`, not pushed.
`git show 2fd6243a`. Four files, +108/-3.

- `useSaveChangesModal.ts` — `try/catch` around `await onSave()`, `return` on failure.
- `SaveChangesModal.vue` — `watch(() => props.showModal)` clears `busy` on every open.
- `useSaveChangesModal.ts` — replaced the `// only reset the bypassGuard if it succeeds` comment,
  which described the opposite of what the `finally` does.
- Two new tests, both verified red before the fix.

**Deviation from what the review proposed.** The review said "re-open / leave the modal open on
failure"; the commit closes it instead. `GModal` is blocking, so a reopened modal hides the
`BAlert v-if="store.error"` the failed save just populated and re-asks "do you want to save?" with no
indication the save failed. Closing it leaves the user on the page, changes intact, error visible.
This also matches what the workflow editor already does — `Index.vue:1165-1181` sets
`proceed = await this.onSave()` and returns early when the save reports failure, with the modal
already closed by `saveChanges()`.

**The `busy` fix helps both callers.** The workflow editor has the same latch leak on that
early-return path; it is just harder to hit because most of its exits tear the editor down.
Fixing it in `SaveChangesModal` rather than in the composable covers both.

`watch` on show (rather than reset in `closeModal`) preserves what `busy` is actually for:
`dontSave()` deliberately leaves the modal open while the parent navigates, so a reset on close would
disable the double-click guard on the one path that needs it.

### Verification

Client tests could not be run in the original review (no `client/node_modules`); they can now.
`pnpm install --frozen-lockfile` (36s), and node **22.20.0** per `client/.node_version` — the
system's node 25 fails every test in this suite at `window.localStorage.getItem is not a function`
under happy-dom, which is an environment mismatch, not a repo problem.

- Baseline before any edit: `PageEditorView.test.ts` 30/30 pass.
- Red-to-green confirmed for both new tests:
  - `"re-enables its buttons every time it is shown again"` → `[true,true,true]` vs expected
    `[false,false,false]`.
  - `"Save proceeds but the save fails"` → `console.error` called twice (Vue 2's
    `invokeWithErrorHandling` logging the unhandled rejection out of the `on-proceed` handler).
- After the fix: `src/components/PageEditor` + `src/components/Workflow/Editor` — **37 files, 409
  tests, all pass.**
- `vue-tsc --noEmit` clean, `eslint` clean, `prettier --check` clean, pre-commit hooks pass.

### Submitted

Pushed as `jmchilton:review-23286-save-failure-wedge` (the fork already has a branch literally named
`review`, which blocks `review/*` — hence the dash, matching the existing `review-23235-…`).

**PR: https://github.com/ahmedhamidawan/galaxy/pull/37** — base
`ahmedhamidawan/galaxy:fix_preview_report_discards_changes`, so merging it folds into #23286 rather
than opening a second PR against `release_26.1`. Body leads with the Claude-on-behalf-of marker, no
@-mentions. Commit `ea9021051f`.

---

## Re-review 2026-08-20 — `34116395a` (six new commits since `b7bbc7d9`)

`ahmedhamidawan` reworked the whole mechanism rather than patching it. `useSaveChangesModal.ts`
is **deleted**; its guard, `beforeunload` handling and proceed logic now live inside a new
self-contained `components/Common/SaveChangesModal.vue` (167 lines) that takes two props —
`hasChanges` and `onSave` — and registers `onBeforeRouteLeave`/`onBeforeRouteUpdate` itself.
`PageEditorView.vue` drops from a composable + four-prop modal to a single line:

```html
<SaveChangesModal :has-changes="store.isDirty" :on-save="() => store.savePage()" />
```

Interdiff: 8 files, +416 / −234. New `Common/SaveChangesModal.test.ts` (204 lines, 11 tests).

### Our findings, re-checked at this head

| # | Finding | Status at `34116395a` |
|---|---|---|
| 1 | `bypassGuard` not reset in a `finally` | **Fixed** — carried into the new component's `proceed()` |
| 2 | Failed save wedges the modal | **Fixed on the page-editor side** — `try/catch` around `onSave()`, `Toast.error`, `closeModal()` resets `busy`. **Reintroduced on the workflow-editor side — see below.** |
| 4 | Window-manager preview path bypasses the guard | **Unchanged.** `handlePreview` still delegates to `pushToFrameOrPage`; the monkeypatch short-circuits before `originalPush`, so no guard runs. The one path #23161 names. |
| 5 | `beforeunload` registered after an `await` | **Fixed** — now a bare `onMounted`/`onUnmounted` pair in the modal component, no `await` in front of it |
| 6 | "Don't Save" does not discard | **Still open, and now structurally harder.** The component's entire prop surface is `hasChanges` + `onSave`; there is no `onDiscard` hook, so a consumer *cannot* wire `store.discardChanges()` even if it wanted to. It still works only by the `<router-view :key="$route.fullPath">` teardown. The test named `"Don't Save proceeds: discards changes and navigates without saving"` moved to the new file with the same name and still asserts only that `onSave` was not called. |
| 7 | Unhandled rejection per blocked navigation | **Addressed** — `proceed()` catches the push, and a new exported `pushIgnoringNavFailure(router, url)` wraps the four `handleBack`/`handleEdit` pushes plus the three in `useWindowAwareNavigation`. Blunt: it swallows *every* push rejection, not just guard-cancellations. |
| 8/9 | Under-typed guard, `router` as a parameter | **Addressed structurally** — `router` comes from `useRouter()` inside the component. The guard is still hand-typed (`to: { fullPath: string }`, `_from: unknown`, `next: (arg?: false) => void`) rather than vue-router's `NavigationGuard`. |
| 11 | `SaveChangesModal` lives under `Workflow/Editor/` | **Half.** A `Common/` component now exists, but the `Workflow/Editor/` one remains and the two are near-identical — same title, body, three button labels, same `busy` pattern. The new file carries a `TODO` to converge, blocked on `appendVersion`, which the `Common` one does not accept. |
| 12 | Three unsaved-changes mechanisms | Follow-up, unchanged |

### New — the wedge moved into the workflow editor

`795b8590d4` takes our fix to `Workflow/Editor/SaveChangesModal.vue` nearly verbatim (identical
13-line diffstat; two comments reworded) but also **removes `closeModal()` from `saveChanges()`**,
compensating with `this.showSaveChangesModal = false` in `Index.vue`. That line sits *after*
`onNavigate`'s early return:

```js
proceed = await this.onSave();     // false on failure
...
if (!proceed) { return; }          // ← modal never closed
this.showSaveChangesModal = false;
```

So when a workflow save fails, the modal stays open with `busy` still `true` and Cancel /
Don't Save / Save all `:disabled="busy"`. The `watch` only clears `busy` on a `false → true`
transition of `showModal`, which has not happened. The only exit is `GModal`'s X.

Reachable on both `onSave()` failure paths: `nameValidate()` returning false (unnamed workflow),
and the `saveWorkflow` catch, which calls `onWorkflowError` → `MessagesModal`. In the second case the
error modal renders *over* the dead SaveChangesModal, and its Ok handler is `hideModal()`, which only
clears `messageTitle`/`messageBody` — `showSaveChangesModal` is untouched, so dismissing the error
returns the user to a modal with three disabled buttons.

Before this PR `saveChanges()` closed the modal immediately, so this path did not exist. It is
finding #2, relocated from the page editor to the workflow editor.

### New — a merged PR's guard reverted and its test inverted

`3ab2abab82` ("remove `displayOnly` check for resetting store page") drops the
`if (!props.displayOnly)` around `store.clearCurrentPage()` in `PageEditorView`'s `onUnmounted`.
That check is **not** part of this PR — it came from `e1d519014e` ("Fix empty-content save for
notebooks and reports"), already merged into `release_26.1`, along with its test. The same commit
inverts that test:

- was: `does not clear editor state on unmount in displayOnly mode` → `clearCurrentPage` **not** called
- now: `still clears editor state (not $reset) on unmount in displayOnly mode` → `clearCurrentPage` **is** called

The inversion is at least argued in a comment rather than silent, but the argument's premise is off:
it says `HistoryPageView`'s `v-else-if` chain "only ever renders one of `PageEditorView` (edit) or
`PageDisplayOnly` (view)" — which is true, and is exactly why the display-only branch there renders
`PageDisplayOnly`, never `PageEditorView` with `displayOnly: true`. The mount this test describes
comes from the standalone `/pages/editor?id=…&displayOnly=true` route instead. Worth asking what
`e1d519014e` needed the check for before flipping its assertion; `clearCurrentPage()` does not touch
`store.error`, so the stated reason in the deleted comment was already satisfied without it.

### Nit

`proceed()`'s middle branch is dead: `else if (!ignoreChanges) { busy.value = false; return; }` is
unreachable — `dontSave()` always passes `ignoreChanges: true` and `saveChanges()` always passes
`forceSave: true`. A leftover from the emit-based API where Cancel routed through the same function.

### What our PR #37 is worth now

`ahmedhamidawan/galaxy#37` is **superseded in substance**: they applied our `SaveChangesModal.vue`
change themselves, and the two regression tests we wrote now live — same scenarios, same
`[false, false, false]` button assertions — in `Common/SaveChangesModal.test.ts` (`"Save fails: closes
the modal (toasting the error) but keeps guarding the next navigation"`, `"keeps guarding subsequent
navigation, with buttons re-enabled, after a rejected router.push"`).

Two things it still carries that head does not:

1. Our `Workflow/Editor/SaveChangesModal.test.ts` (58 lines) was **not** taken. The workflow-editor
   modal now has the fix and no test.
2. Their `closeModal()` removal — the wedge above — is exactly what that dropped test would have
   caught at the component level.

So: close #37 as superseded, and open a small replacement against the same branch carrying the
workflow-editor test plus the `Index.vue`/`saveChanges()` ordering fix.

### CI at this head

24 pass / 1 fail. The failure is Playwright `test_workflow_editor.py::TestWorkflowEditor::test_change_datatype`
(run `32265472651`, 10s selector timeout). Not the failure triaged last pass — that one
(`test_tool_discovery_help_toggle_shows_and_hides`) is gone. This one needs its own call: a **sibling**
test in the same class, `test_pick_value_change_datatype_pja`, failed on `release_26.1` itself on
2026-08-18 (run `32143231531`), and the base run on 2026-08-20 (`32339385868`) is green. That points at
flake, but this is the first head where the PR touches `Workflow/Editor/` at all, so it deserves a
re-run rather than an assumption.

### Verified in this pass

- Fetched `pull/23286/head`, branched `pr23286-head-34116395` at `34116395aa`, read the full interdiff.
- `pnpm exec vitest run src/components/Common/SaveChangesModal.test.ts` — **11 passed**.
- `src/components/PageEditor` + `src/components/Workflow/Editor` — 310 passed / 12 failed, **all 12 are
  the node-25 environment mismatch**, not the PR: `TypeError: window.localStorage.getItem is not a
  function` at `persistentRef.ts:28` under happy-dom. `client/.node_version` asks for 22.20.0 and no
  node 22 is installed on this machine; CI's `client-unit-test` is green at this head.
- Read `Index.vue:1165-1192` (`onNavigate`, `onSave`, `nameValidate`, `onWorkflowError`, `hideModal`)
  to confirm the wedge path end to end.
- `git merge-base --is-ancestor e1d519014e origin/release_26.1` — confirms the reverted guard is
  pre-existing base code, not this PR's own.
- `gh run list --workflow "Playwright tests" --branch release_26.1` for the base-flake comparison.

### Merge readiness

**Closer, but not clean.** Both original P1s are genuinely fixed and the refactor is the better
abstraction — a self-contained guard component beats a composable plus a four-prop modal, and it is now
reusable by name and location. Holding points, in order: the workflow-editor wedge (new, and a
regression against pre-PR behaviour), the inverted `displayOnly` test from a merged PR, and the red
Playwright job needing a re-run. #4, #6 and #11 remain the deferred set — #6 is worth pushing on now
rather than later, because the new component's prop surface is what freezes it out.

---

## Follow-up branch 2026-08-20 — `ahmedhamidawan/galaxy#38`

`jmchilton:23286-review-followups-2` → `ahmedhamidawan:fix_preview_report_discards_changes`,
five commits on top of `34116395a`, 9 files, +351 / −38. Named against the ranked list:
**I1, I2, I3, I5, I6**. I4 (the two near-identical modals) and I7 (the dead branch, which the
discard commit removes incidentally) were tabled.

| Commit | Issue | What it does |
|---|---|---|
| `67cce27471` | I1 | Closes the workflow modal when the save it asked for fails; adds the component tests the modal never got |
| `c4e3f973f3` | I2 | Restores the `displayOnly` unmount guard and the assertion — framed as "don't change shipped behaviour here", not as a fix |
| `bf43c7d85b` | I6 | One awaitable `pushIgnoringNavCancel` for every call site: tolerates a missing promise, only swallows `isNavigationFailure` |
| `64877af602` | I5 | Optional `onDiscard`; `PageEditorView` passes `store.discardChanges()`; the discard test asserts the discard |
| `8bff0db5f1` | I3 | `guardNavigation(navigate)` on the modal; `handlePreview` routes through it |

SHAs are post-review; the branch was rewritten and force-pushed on 2026-08-20 after the
second-opinion pass below. The PR was **closed by the user** — opening it was not asked for.

### I6 was worse than "blunt"

The helper doesn't just swallow errors — it **throws**. `router.push(...).catch(...)` runs against
`undefined` whenever the monkeypatch returns early, which it does on exactly the branch of
`pushToFrameOrPage` that passes a title:

```
TypeError: Cannot read properties of undefined (reading 'catch')
```

Reproduced in `windowAwareNavigation.test.ts` against a router whose push returns nothing.

### Verification

- node 22.20.0 fetched to the scratchpad — `client/.node_version` asks for it and the machine only
  has node 25, under which every `PageEditor` suite dies at
  `window.localStorage.getItem is not a function` (`persistentRef.ts:28`, happy-dom). With 22 the
  baseline at `34116395a` is 37 files / 411 tests green, so the failures really were environmental.
- After the branch: `PageEditor` + `Common` + `Workflow` + `composables` — **94 files, 869 tests,
  all pass**. `vue-tsc --noEmit` clean, eslint clean on every changed file, pre-commit hooks pass
  per commit.
- Red-to-green individually confirmed for all five, including a check that the `busy`-reset test
  fails when the `watch` is neutered, and that the preview test fails when `handlePreview` calls
  `pushToFrameOrPage` directly.

### Test-harness note

`shallowMount` + `stubs: { SaveChangesModal: {...} }` does **not** work here: VTU matches stub keys
against registered component names, and a `<script setup>` child is resolved from a setup binding,
so the entry is ignored and the auto-stub is used instead — which has none of the exposed methods.
The fix is to hang the stand-in on the auto-stub's vm after mounting. Worth remembering for any
`defineExpose` component in this codebase.

### Also delivered

`ahmedhamidawan/galaxy#37` closed as superseded, with a comment recording that the fix landed on
the branch directly but that the workflow-editor modal's test did not come with it.

### Second opinion — subagent review, 2026-08-20

Ran the suites (869 pass at the time), typecheck, lint, and reverted each fix to confirm its
test bites. **No functional defect in any of the five commits.** What it did find, all acted on:

- **Two commit-message errors.** The I6 message claimed "two of the three `@ts-ignore`s" — there
  were only ever two. And the I2 message argued against the `HistoryPageView` chain reasoning,
  which appears in the author's *test comment*, while their commit message makes a different and
  stronger argument: *"the views are rendered based on the route containing the `displayOnly`
  prop which remounts the component anyways."* That one goes unanswered. Both rewritten; I2 now
  says outright that it is not a bug fix, that the remount claim is true for the one route that
  reaches this component, and that the commit is droppable.
- **The modal ref was structurally typed**, so deleting `defineExpose` from the modal would have
  been invisible to `vue-tsc`. Now `InstanceType<typeof SaveChangesModal>`; verified by deleting
  the `defineExpose` and getting `TS2339` at `PageEditorView.vue:129`.
- **The catch in `proceed()` duplicated the helper's** because the helper returned `void`. Helper
  is now `async` and returns a promise that never rejects, so `proceed` awaits it and only a
  throwing `navigate` callback reaches the catch. I6's "one helper" claim is now true.
- **`pushToFrameOrPage` had no test at all** — the window-manager `TypeError` was covered only
  obliquely. Added a direct one; red-checked against the old `.catch(() => {})` body, which throws
  `TypeError: Cannot read properties of undefined (reading 'catch')` exactly as claimed.

Left alone, but worth knowing:

- **`router.confirmation` already exists** for "prompt before a navigation the guards cannot see"
  — set via `update:confirmation`, checked in `router-push.js` *before* the window-manager branch,
  and used by the workflow editor. It only offers a native `confirm()` with no Save option, so
  `guardNavigation` is strictly better, but the author may fairly ask why the existing wiring was
  not extended instead.
- **`pushIgnoringNavCancel` would Toast over an admin-required error page.** `router.js` aborts
  those with `next(new Error(...))`, which is not a navigation failure. Unreachable from the
  current call sites; the helper is exported, so it is a latent trap.
- **The `mountComponent` stub hack is a one-way fiction**, confirmed: with `defineExpose` deleted,
  `PageEditorView.test.ts` stays green while the modal's own suite goes red. The `InstanceType`
  change closes that gap at typecheck time.
- Galaxy's imperative-dialog idiom (`composables/confirmDialog.ts`) is an *awaitable* `confirm()`,
  not a callback. A `guardNavigation(): Promise<boolean>` would match it better and make the
  fire-and-forget latch question moot. Not changed — the callback works and the latch was proven
  safe against a real router.

Final state: **871 tests pass**, `vue-tsc` exit 0, eslint 0 errors (1 pre-existing-style
`@ts-ignore` warning, down from two at the base).
