# Editor "unsaved changes" flake in test_run_from_editor_and_cancel

**Root cause.** This is a real client bug, and a race in the test makes it show up. While the editor loads a workflow, `loadEditorData` (`client/src/components/Workflow/Editor/Index.vue`) assigns the loaded name, annotation, readme, help and logo URL. Those assignments trip the attribute watchers, which set `hasChanges = true`. Nothing clears the flag until the `getVersions` request returns (`finally { hasChanges = hasStateMessages }`). For that whole window, an untouched workflow counts as dirty. Clicking Run or Exit in that window raises "You have unsaved changes…". The test opened the editor, waited only for `#workflow-canvas`, and clicked Run. The canvas renders before the workflow has loaded, and on a cold start the click landed inside the dirty window.

**Fix (two parts; each works without the other):**
- **Test side.** The fix is folded into "Test running a workflow from the editor and cancelling it" (now `82b94422d2d`). I added a `workflow_editor.canvas_loading` selector (`#workflow-canvas .galaxy-loading-shade`) to navigation.yml. After `canvas_body` is visible, the test now waits for `canvas_loading` to be absent and then asserts that the Save button is disabled. The overlay is bound to `loadingWorkflow || initialLoading` and renders in the same component as `#workflow-canvas`, so once the canvas is visible, "overlay absent" means the load has finished. I didn't change `workflow_index_open_with_name` or `workflow_editor_click_run`.
- **Client side.** New commit `f4fa8e20d84` "Don't mark a loading workflow as changed in the editor". `loadEditorData` now runs `await nextTick(); hasChanges.value = hasStateMessages;` right after the assignments, so it no longer waits for the versions request. That is 5 lines. The existing `finally` reset stays. I also added a Vitest in `Index.test.ts` ("while the workflow loads"). It holds `getVersions` pending and checks three things: `hasChanges` stays false, Exit navigates without the modal, and `hasChanges` is still false once versions resolve. The test is red without the fix and green with it. It is a separate commit so the coordinator can split it out or drop it.

**Scope note.** The branch was test-only before, and `screenshot_debrief.md` says it changes no Vue or UI code. That is no longer true: the head commit is a client fix on release_26.2. It hasn't had a normal review yet, and the PR title, description and the screenshot debrief's claim are now stale. Whether it stays on this branch or ships as its own release fix is a coordinator decision. The test wait passes without it (cold run 3).

## Details

### Reproduction
- Cold Galaxy plus Vite (`client/node_modules/.vite` cleared), Playwright headless, with temporary uncommitted instrumentation in Index.vue. The instrumentation logged `hasChanges`, `initialLoading`, store-subscription and `onNavigate` events with stack traces to `window.__hc`, and the test dumped them before and after the Run click.
- **Run 1 (cold, original test):** failed exactly like the screenshot, with a timeout on `#run-workflow`. The dump taken when `canvas_body` became visible was empty, so the workflow hadn't even been fetched yet. The dump after the click showed `hasChanges` going true and then false, with `initialLoading` still true. The stack for "true" pointed at the `name` watcher, triggered from `loadEditorData`. The stack for "false" pointed at the `finally` in `loadEditorData`.
- **Run 2 (warm, original test):** passed. At the moment `canvas_body` was visible, the dump showed `hasChanges=true` mid-load. `onNavigate` ran about 50ms after load finished, with `hasChanges=false`. The test only passed because the click landed later.
- **Run 3 (cold restart, test wait only, no client fix):** passed. `onNavigate` ran after `initialLoading=false`, with `hasChanges=false`. So the test wait is enough without the client fix.
- I didn't capture the exact timing of the failing click in run 1, because the `onNavigate` trace was added afterwards. The modal can only open when `hasChanges` is true at `onNavigate`, and the only true window in the trace is the load window. That nails the cause even without the timestamp.

### Other suspects ruled out
- Store subscriptions (`stepStore`, `commentStore`): they're gated on `initialLoading`, and every mutation in the trace happened while it was true.
- State-upgrade messages: none for this workflow, since the `finally` set `hasChanges` to false.
- Auto-layout and position normalization: nothing wrote to the step store after load.
- Node/terminal map-over writes: the workflow has data inputs only, so these don't apply.
- The "Best Practices 2" badge is unrelated. It counts lint findings.

### Why this client fix
- My first attempt guarded the attribute watchers on `!loadingWorkflow` and merged the five watchers into one. It broke 5 existing tests ("tracks changes to annotations/name/help/logoUrl", "prevents navigation only if hasChanges"). Those tests emit edits right after mount, while the load is still running, and expect them to count. I reverted that attempt instead of changing those tests.
- The final fix only clears the dirty flag that the loaded values themselves caused, one tick after they are assigned. A user edit made later in the window still marks the workflow dirty, as before, and the existing `finally` still settles the flag at the end. Behavior stays the same everywhere except the spurious dirty window, which also covers the reload after Save and version switches (both go through `loadCurrent` → `loadEditorData`).
- Remaining release-bug impact without the fix: a user who clicks Run or Exit while versions are loading gets a pointless save prompt, and the Save button briefly lights up on a fresh load.

### Validation
- Vitest (node 22.20.0 via pnpm): `src/components/Workflow/Editor/`, 33 files / 340 tests pass. The new test was red before the fix.
- `vue-tsc --noEmit` (`pnpm type-check`) exits 0.
- prettier and eslint are clean on the changed files (pre-existing eslint warnings only). Pre-commit passed on the client commit. ruff and black pass on the test file.
- Playwright headless, final code: 2 warm runs passed (41s, 39s), then 1 run after a full cold restart of Galaxy and Vite passed (47s). Earlier, the cold run with only the test wait (plus debug tracing) also passed.
- Selenium (chromedriver, non-headless): 1 run passed (67s).

### Commits
- Autosquashed fixup into the test commit. Its new SHA is `82b94422d2d` (was `0ce363ef5f9`). Later commits were recreated: `6adf47a8ac2` (was `73da05fb281`), `b78c77d2bac` (was `938e0acdf65`). The three earlier commits and the base `65132d40dac` are unchanged. I checked that the tree before and after the rebase is identical.
- New head is `f4fa8e20d84` (client fix + Vitest). Nothing was pushed.

### Housekeeping
- Killed orphaned Galaxy celery processes from this worktree with PPID 1: 11696/11698/11699 and 75792/75794/75795 (resource_tracker, celery worker, celery beat; 2-4h old, none started by me).
- Other stale Galaxy gravity trees from this worktree still have live parent shells and no listening gunicorn: PIDs 556, 29661, 45279, 62284, 80546 with their celery children. They belong to other sessions, so I left them alone. Someone may want to clean them up.
- Stopped my own Galaxy and Vite, and confirmed nothing new was orphaned.
