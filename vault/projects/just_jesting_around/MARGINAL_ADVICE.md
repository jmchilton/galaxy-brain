Unresolved advice, with its originating examples and why it was deferred.

## Unmount components that poll

Components built on auto-refresh providers (`SingleQueryProvider`, 3 s polling) keep polling after a test unless they're unmounted. `enableAutoUnmount(afterEach)` handles it, and dropping an explicit `unmount()` while restructuring silently loses coverage of the provider's `unmounted` hook.

- Origin: [batch 43 JobInformation](reviews/batch43/JobInformation.md). Without auto-unmount, `SingleQueryProvider.js` lost 2 statements in the per-test coverage compare.
- Deferred: one example so far, and the README doesn't yet mention `enableAutoUnmount` at all. Promote it if another polling component shows the same gap.
