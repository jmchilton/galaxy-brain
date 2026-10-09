# galaxy#23779 - Convert four components with Vue-2-only APIs to script setup

- PR: https://github.com/galaxyproject/galaxy/pull/23779 (draft, itisAliRH, +620/-400, 8 files)
- Reviewed head: `c4560373a29c5f5d58002f30daedb5d4e2bb80f6`
- Base: merge-base with origin/dev `07420debd2e`
- Worktree: `~/projects/worktrees/galaxy/pr/23779`

## Verdict

Approve once out of draft. Behavior parity holds for all four conversions. The tests are stronger
than before, and the new ones fail against the old code where behavior actually changed. One
worthwhile fix: both polling components still keep polling if they unmount while a request is in
flight. This bug predates the PR, but the PR's stated goal is unmount cleanup, and a sibling
Toolshed component already uses a composable that handles this case.

## Verification

- `vitest` (node 22.20.0): 4 affected specs, 19/19 pass. Neighbors (RuleCollectionBuilder,
  RuleBuilder/*, Markdown/*, Tool/ToolSource*): 172/172 pass.
- `vue-tsc --noEmit`: clean.
- `eslint` on the 8 files: 0 errors. The 9 warnings (a11y click handlers in ColumnSelector,
  `Monitor` single-word name) all predate the PR.
- Red check: I put the base-commit `.vue` files under the new tests. 4 tests fail on the old code
  (ColumnSelector remove/reorder/add without prop mutation, ToolSourceDisplay `setModelLanguage`).
  The Monitor unmount test passes on the old code too, which is expected: `destroyed` already
  cleared the timer, so it guards parity.

## Parity notes (checked, no issue)

- ColumnSelector `update:target`: all 16 call sites in `RuleCollectionBuilder.vue` use
  `:target.sync`. That includes `:target.sync="map.columns"` inside the `v-for`
  (`RuleCollectionBuilder.vue:298`), which Vue 2 compiles to `$set(map, "columns", $event)`, so it
  stays reactive. `mapping` is a shallow `slice()` of `initialRules.mapping` (`:747`), so mapping
  objects are shared with the prop. The old code mutated the shared array and the new code
  replaces the key on the shared object, so the net effect is the same.
- `moveUp` (splice-based) matches the old adjacent swap. The `emit` order in `handleAdd`
  (target, then orderedEdit) is unchanged.
- ToolSourceDisplay `editorContainer` guard: Vue 2.7.16 `registerRef(vnode, isRemoval)` sets setup
  refs to `null` on unmount, so the guard works as claimed. The old
  `this.editor.setModelLanguage` really was a no-op bug (red test confirms).
- StsDownloadButton `color` default `null` -> `undefined`: harmless for GButton. The
  `withPrefix(fallbackUrl ?? "")` path is guarded by `canDownload`.
- Monitor `load()` in setup matches `created`. `onQuery` emit name is unchanged
  (`InstalledList/Index.vue:26`).
- Interaction with #23780 (remove vue-rx): no overlapping files. None of the four components use
  vue-rx, ClickToEdit, DebouncedInput or Annotation. #23780 edits `tests/vitest/helpers.js`
  (`getLocalVue`), which the new tests use only through the public helper. The two PRs are
  independent and can merge in either order.

## Findings (by severity)

### 1. Medium: polling survives unmount when a request is in flight (Monitor, StsDownloadButton)

`client/src/components/Toolshed/InstalledList/Monitor.vue:67-80`: `load()` calls `schedulePoll()`
from `.then`. If the component unmounts while `getInstalledRepositories` is pending,
`onBeforeUnmount` clears nothing (no timer is set yet). The promise then resolves and schedules
a new timer that nothing ever clears. The component then polls `/api/tool_shed_repositories`
every 5s for the rest of the page's life. The new test (`Monitor.test.js:54`) unmounts only while
the timer is idle, so it misses this case.

`client/src/components/StsDownloadButton.vue:88-125` has the same pattern. An in-flight `/ready`
GET resolves after unmount, `pollAfterDelay` re-arms, and the orphan loop polls every 200ms until
the request is ready, then calls `window.location.assign`.

This bug predates the PR. But the PR description promises "the page stops polling" after Hide,
and this conversion is where the fix belongs. Options:

- Monitor: reuse `useResourceWatcher` (`client/src/composables/resourceWatcher.ts`), which
  invalidates in-flight requests via `currentRequestId`. The sibling
  `Toolshed/RepositoryDetails/Index.vue:33` already uses it for toolshed polling. Two caveats:
  it keeps polling after a handler error (the old Monitor stopped on error), and the component
  must call `dispose()`/`stopWatchingResource()` on unmount.
- Minimal alternative for both: set a `let stopped = false` flag in `onBeforeUnmount` and check
  it before re-arming.
- A test: mount, advance to the second call, keep the mock pending, destroy, resolve, then assert
  no further calls.

### 2. Low: the reusable STS polling abstraction was not used (StsDownloadButton)

`useShortTermStorageMonitor` (`composables/shortTermStorageMonitor.ts`) and `useShortTermStorage`
already poll `/api/short_term_storage/{id}/ready` through the typed `GalaxyApi()` client. The
button still uses raw `axios` plus `getAppRoot()` string URLs. A follow-up is fine; it doesn't
block a pure conversion PR. Note that `useGenericMonitor` also has no unmount cleanup, so
switching to it would not by itself fix #1.

### 3. Low: new ToolSourceDisplay guard is untested

`client/src/components/Tool/ToolSourceDisplay.vue:22-24`: the description calls out the
`editorContainer` guard (unmount before Monaco loads) as new behavior, but no test covers it.
A test is cheap: mount, `wrapper.destroy()` before `flushPromises()`, then assert
`editor.create` was not called.

### 4. Nits

- `ColumnSelector.vue:85`: the comment "Emit new arrays instead of mutating the target prop."
  describes the change history, not the code. Drop it. The "Plain variables: Monaco objects..."
  comment in ToolSourceDisplay and the "Full API row..." comment in Monitor are non-obvious and
  worth keeping.
- `ColumnSelector.vue:99-106`: `moveUp` via splice/splice plus an `undefined` guard could be a
  direct swap (`[r[i - 1], r[i]] = [r[i], r[i - 1]]`). The logic is correct either way.

## Draft GitHub review comment

> *Posted by Claude (AI assistant) on behalf of jmchilton - not personally authored.*
>
> Thanks, this is a clean conversion. I checked parity on all four components and everything
> holds up, including the `.sync` call sites for `ColumnSelector` (the `map.columns` binding in
> the `v-for` compiles to `$set`, so it stays reactive). I also ran the new tests against the old
> implementations: the ColumnSelector add/remove/reorder tests and the `setModelLanguage` test
> fail on the old code, so they actually cover the behavior that changed. vue-tsc is clean and
> the affected and neighboring specs pass.
>
> One thing worth fixing while we're here. It predates this PR, but the PR is about unmount
> cleanup:
>
> - `Toolshed/InstalledList/Monitor.vue`: if the component unmounts while
>   `getInstalledRepositories` is still pending, the `.then` calls `schedulePoll()` after
>   `onBeforeUnmount` has run, so polling continues every 5s and nothing stops it.
>   `StsDownloadButton.vue` has the same pattern with the `/ready` poll (every 200ms). The new
>   Monitor test only unmounts while the timer is idle. `useResourceWatcher` handles this by
>   invalidating in-flight requests, and `Toolshed/RepositoryDetails/Index.vue` already uses it
>   for toolshed polling, so that seems like the natural fit for Monitor. It keeps polling on
>   handler errors, though, and the old Monitor stopped. A simple `stopped` flag set in
>   `onBeforeUnmount` would also work for both components. A test that unmounts with the request
>   pending would lock it in.
>
> Smaller, optional:
>
> - The new `editorContainer` guard in `ToolSourceDisplay` has no test. Destroying before
>   `flushPromises()` and asserting `editor.create` wasn't called would cover it.
> - `StsDownloadButton` could eventually use `useShortTermStorageMonitor` and the typed
>   `GalaxyApi()` client instead of axios plus `getAppRoot()`. That's fine as a follow-up.
> - In `ColumnSelector`, I'd drop the "Emit new arrays instead of mutating the target prop."
>   comment, since it describes the change rather than the code.
>
> This doesn't overlap with #23780.
