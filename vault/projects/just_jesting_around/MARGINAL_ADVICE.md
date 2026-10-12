Unresolved advice, with its originating examples and why it was deferred.

## Unmount components that poll

Components built on auto-refresh providers (`SingleQueryProvider`, 3 s polling) keep polling after a test unless they're unmounted. `enableAutoUnmount(afterEach)` handles it, and dropping an explicit `unmount()` while restructuring silently loses coverage of the provider's `unmounted` hook.

- Origin: [batch 43 JobInformation](reviews/batch43/JobInformation.md). Without auto-unmount, `SingleQueryProvider.js` lost 2 statements in the per-test coverage compare.
- Corroboration: [batch 47 GenericItem](reviews/batch47/GenericItem.md) retains explicit unmount before restoring its fake timers and observer, preserving SingleQueryProvider cleanup coverage.
- Deferred: GenericItem already had the necessary teardown, so it exposed no new missing-unmount gap. The batch's scope review keeps documentation focused on correcting existing VTU examples; revisit this guidance if another polling component loses cleanup during restructuring.
