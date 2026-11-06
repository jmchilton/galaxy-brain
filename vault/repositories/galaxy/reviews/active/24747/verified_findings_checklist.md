- [x] P2 1: The load and the popover answer "are there other quota sources?" differently, and the load sits in `userStore`
- [x] P2 2: The popover's gates are unprotected, and the quotas-off test passes without its guard
- [x] P2 3: Meter tests never include the default source, so a default-only overage is untested
- [x] P2 4: Per-source usage loading isn't tested for anonymous users, quotas off, or a user who arrives late
- [x] P2 5: No E2E test covers the feature
- [x] P3 1: `quotaUsageStore` updates its list of usages by hand in one load path
- [x] P3 2: `QuotaUsage.sourceLabel` is left behind as a key only
- [x] P3 3: `QuotaSourcesPopover` is two components behind `isAnonymous`
- [x] P3 4: Popover rows are asserted through a class nothing else uses
- [x] P3 5: Storage names in the history filter and dashboard aren't exercised
- [x] P3 6: Test setup is repeating instead of becoming a helper

Other Actions:
