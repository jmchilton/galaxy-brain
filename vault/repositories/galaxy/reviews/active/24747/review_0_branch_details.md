Branch `pr_24747_review_0`, from reviewed commit `f76e9ce6925d`, closes the test gaps found in review and adds a Selenium integration test that drives the feature against a real server and browser. It also has the load and the popover share one "other quota sources" check, moves the load out of `userStore`, moves the usage list's update into `setSourceUsage`, retires `QuotaUsage.sourceLabel`, and splits the popover's anonymous and registered content into separate components. `userStore.ts` returns to its `dev` state, which removes this PR's overlap with #24738 in that file.

- `ac87dfae895` Share hover and storage fixtures in the quota tests: adds `hoverPastTooltipDelay` and `getFakeStorage` and uses them in the meter and history tests.
- `d417ebc44cd` Test the quota meter popover's gates, with the popover opened: rewrites the quotas-off test and adds the default-only and anonymous cases.
- `1dde5e00099` Include the default source in the quota meter fixtures: adds the default row and asserts no hint or second warning when only the default source is over.
- `f94aaf38fca` Assert the popover rows by what the user reads, dropping an unused class: checks the hold message and usage text, and removes `.over-quota`.
- `aeb7d8f9be5` Test the gates on loading the usage per source: covers anonymous users, quotas off and a user arriving after the watching starts.
- `ef20abeafa6` Test storage names in the history filter and on the dashboard: adds `FilterMenuDropdown.test.ts` and mocks a storage in the summary test.
- `5c4e99fb550` Keep the usage list in sync where a source's usage is set: moves the list patch into `setSourceUsage`.
- `5e43fd80e84` Give the other quota sources policy and load one owner: adds `client/src/composables/otherQuotaSources.ts`, called from `App.vue`, and bases the meter's popover on the same check; the hint and history warning still follow the loaded list.
- `f757a11bb4d` Retire QuotaUsage.sourceLabel, keying quota sources through sourceLabelToKey: removes the field and constant, and swaps the three hand-written quota keys.
- `5bd57245238` Split the quota popover's anonymous and registered content: adds `QuotaSourcesLogin.vue` and `QuotaSourcesList.vue` under a shell `QuotaSourcesPopover.vue`.
- `7ab041184b8` Add a Selenium integration test for the storage source quota warnings: adds the test and its `navigation.yml` selectors.
