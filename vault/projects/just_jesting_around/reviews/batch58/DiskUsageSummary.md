# DiskUsageSummary — readability batch 58

All four original cases and nine original assertion lines are retained. The refresh case still checks 1 MB, a visible refreshing alert while the real task monitor receives PENDING, then alert disappearance and 2 MB after the handler changes to SUCCESS and the poll timer runs. Typed MSW endpoints and the real component subtree remain in use.

The mount helper now uses native `global: withPlugins(localVue, pinia)` options, obtains the user store explicitly from that owned Pinia, and registers disposal on test completion. It preserves the original post-mount user arrangement. Each case scopes fake timers through beforeEach; restoration clears pending timers and restores real timers after automatically unmounting the component. Required quota and refresh targets use `get`; existing presence/absence assertions continue to use `find`.

Case names describe behavior and condition; scenario inputs are direct booleans, without redundant local aliases. No production, shared helper, supporting test, dependency, or README changes.

Pristine and final shuffled Vitest runs with seed 580101 passed four cases. Full client vue-tsc, file ESLint, Prettier, and explicit pre-commit gates passed. Comparison verified all nine original assertion lines are unchanged and in order. V8 coverage explicitly includes actual GButton and GAlert implementations behind the node_modules symlink: 1,934 total files including uncovered imported source, 1,020 covered locations before, 1,029 after, zero lost and nine added. Added locations are actual genericTaskMonitor scope disposal and timeout cleanup, lines 210–225. Broad `src/**` coverage includes uncovered assets that produce non-JS parse warnings in both baseline and final runs; both runs exit successfully and the covered-location comparison is intact.

Evidence: `/private/tmp/readability58-disk-before.log`, `/private/tmp/readability58-disk-after.log`, `/private/tmp/readability58-disk-types.log`, `/private/tmp/readability58-disk-hooks.log`; corresponding before/after coverage JSON directories.

Current README ownership and teardown guidance covers this work. No new general advice or shared abstraction is warranted.
