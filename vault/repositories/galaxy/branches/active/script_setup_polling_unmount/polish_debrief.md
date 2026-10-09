# Polish debrief: `script_setup_polling_unmount`

Polished 2026-10-07. The branch now sits at `26da6bc30bd`, off dev.

## Rebase
- The branch was 6 commits made on 2026-09-28, 1181 behind dev. The first 4 commits (script-setup conversions of StsDownloadButton, ToolSourceDisplay, ColumnSelector and the install Monitor) had already landed through #23779 under the same titles, so they were dropped. Only the 2 polling commits were replayed (`git rebase --onto origin/dev c4560373a29`).
- One mechanical conflict came up, in the `Monitor.vue` imports: dev had moved `BAlert` to `GAlert`.
- Dev is now on Vue 3 test-utils, so `wrapper.destroy()` became `wrapper.unmount()` in the new tests. The worktree's `client/node_modules` were stale, so I ran `pnpm install --frozen-lockfile`.

## Verification
- Affected vitest (`StsDownloadButton`, `Toolshed/`, `composables/`): 54 files, 423 tests, all passing on node 22.20.0.
- `vue-tsc --noEmit` is clean. eslint shows only pre-existing warnings (`Monitor` single-word name, `@onUninstall` hyphenation).
- Red check: with dev's `.vue`/`.ts` sources under the branch's tests, all 7 new lifecycle tests fail at their behavioural assertions (request counts, `window.location.assign`).
- Fork CI on the polished SHA was still queued (backlog) when I handed off.

## Checklist pass
- Every item passed. Its concerns all made later stale state possible but were invisible to users: `isRunning` left true after a stop mid-flight, a stale `failureReason` write, a second idle STS monitor in StsDownloadButton, and a double-click race that predates the branch. None of them was worth changing.

## Strengthening round (one round)
- **Code:** after an error, `Monitor.vue` now calls `dispose()` instead of `stopWatchingResource()`. With `stopWatchingResource()`, `useResourceWatcher`'s visibility listener restarted polling when the tab was shown again and left a stale error alert, so polling did not really stop after an error as it had on dev. The fix was done red-first: the extended error test failed before the fix and passes after it.
  - The failing test also exposed a test leak: the existing render test never unmounted, so its listener added extra calls to the shared mock. It now unmounts.
- **Description:**
  - It now discloses the hidden-tab pause.
  - The scope sentence is corrected: monitors created outside a scope also lose in-flight responses on `stopWaitingForTask`, and not every consumer had unmount cleanup.
  - The "API error message" claim is narrowed to `/ready` failures. The prepare POST still goes through axios. Making that toast use `errorMessageAsString` too would be easy, but it's outside the branch's purpose, so I left it out.
  - Tests are now described as "lifecycle tests".

## Left over
- I didn't change the prepare-POST toast to use `errorMessageAsString`. It's an optional one-line follow-up.
- A double-click on StsDownloadButton while waiting can start a second poll chain. This predates the branch. Disabling the button while waiting would fix it, but that's outside this branch.
