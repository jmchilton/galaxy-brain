*Drafted by Claude (AI assistant) on behalf of jmchilton.*

Suggested changes for #23779: stop polling after unmount when a request is in flight

Both `Monitor.vue` and `StsDownloadButton.vue` re-arm their poll timer from the promise callback. If the component unmounts while a request is pending, `onBeforeUnmount` clears a timer that doesn't exist yet. The response then arrives and schedules a new one that nothing clears. Monitor polls every 5s forever. StsDownloadButton polls every 200ms and eventually calls `window.location.assign` from a component that is gone.

**Monitor.vue**: now uses `useResourceWatcher`, as the sibling `RepositoryDetails/Index.vue` already does. The watcher already drops responses that arrive after it stops, and `dispose()` runs on unmount. The load handler calls `stopWatchingResource()` on error, so polling still stops after a failure. One behavior change comes from the watcher's visibility handling (`enableBackgroundPolling: false`, same as the sibling): polling pauses while the tab is hidden and resumes when it's visible again.

**useGenericMonitor** (shared by the task and short-term-storage monitors):
- `stopWaitingForTask()` now also throws away the result of any in-flight request. Previously it only cleared the timer, so it had the same bug.
- The monitor stops itself when its owning component or effect scope is disposed (`onScopeDispose`), and won't start polling after that.

All existing callers only call `stopWaitingForTask` from `onUnmounted`, so they get the fix without changes.

**StsDownloadButton.vue**: polls with `useShortTermStorageMonitor` and navigates with `useShortTermStorage().downloadObjectByRequestId`. The hand-rolled axios/`getAppRoot()` polling loop is gone. Props, the fallback path and the error toast are unchanged. The prepare POST still goes through axios because `downloadEndpoint` is a full URL built by the caller (PageView, InvocationReport, Markdown), not a typed API path.

Tests: each new test was written first and failed on the current branch.
- `Monitor.test.js`: a response that arrives after unmount doesn't trigger another poll. Also checks that polling stops after an error.
- `StsDownloadButton.test.js`: a ready or not-ready response that arrives after unmount causes no further polls and no navigation. A prepare POST that resolves after unmount starts no polling.
- `shortTermStorageMonitor.test.ts`: in-flight results are ignored after `stopWaitingForTask()` or scope disposal, and polling doesn't start after disposal.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
