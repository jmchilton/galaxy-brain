# JobStep author review

Originator `46523aaaff3f6df2bfc6bb2aa8dd18cd93722b6f`.

Base `a454ecaea1a5798c2e556625ee18db4798d0f785`; only the assigned test changes. Three original cases/31 successful checks remain:15 checks across initial nav/buttons, three state iterations and four row observations;11 reactive-state checks; five single-job checks. Exact imported job values, invocation ID, state/button/row ordering, new→running update, count/title expectations and all original click/setProps/flush order remain.

A local domain mount-options helper removes three repeated arrangements and captures each original testing Pinia for completion disposal. Native mount/shallowMount boundaries stay identical. Automatic unmount covers every wrapper, after a teardown-only promise flush completes the mounted table's existing store/render work. Required table/nav/last-cell observations use get; original explicit presence/absence checks remain. Object.entries preserves fixture iteration order while removing erased key/count casts. The original JSON-to-JobBaseModel boundary remains documented: JSON widens state to string; no fabricated fixture fields/defaults added.

Immediate unmount initially lost three invocationStore metrics-getter locations. Actual JobStepJobs reads a computed runtime map which invokes internal metrics fetching; its closed-over fetch is not replaced by the testing-Pinia action spy. Finishing existing promise/render work before unmount restores those locations without delaying original observations. The inherited suite supplies no handlers for those background localhost requests; caught ECONNREFUSED logging is exposed during settling, with no test/unhandled rejection failure. No new API fixture or production workaround is added, and no successful network contract is claimed.

Pristine/final pinned Node22.20 shuffled730101 pass3cases. Default covered statement/function/branch-arm locations242files863 exact; actual external shared UI23files252→258, zero loss, six gains from real GButton teardown. Shared totals also include imported setup; the original full multi-job table and shallow single-job details boundaries are qualified. Evidence `/private/tmp/readability73-job-{before,after}` and corresponding -ui JSON/logs.

File ESLint/Prettier/explicit absolute hooks pass. Driver owns integrated full types. No shared/support/production/later-lane changes; existing ownership/location-comparison guidance catches the asynchronous boundary, with no new useful guidance gap.
