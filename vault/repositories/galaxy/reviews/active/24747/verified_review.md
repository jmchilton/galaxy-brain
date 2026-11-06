### P2 1: The load and the popover answer "are there other quota sources?" differently, and the load sits in `userStore` (implementation verified)

`userStore.startWatchingStorageUsage` decides from the config labels, while `QuotaMeter` decides from the loaded list for registered users. The two can disagree: the usages endpoint also returns any source the user has recorded usage on, so a source that is no longer configured opens the popover on a server where the store decided there is nothing to load. The load also adds a config dependency and a quota check to a function about refreshing on tab focus, in the block the description says conflicts with #24738.

<details><summary>Evidence</summary>

A new meter test with `quota_source_labels: []` and a usage row for a `retired` source failed on the PR's code (`expected null to be 'Storage and Usage Details'`) and passes with the fix. `dictify_usage` (`lib/galaxy/model/__init__.py`) adds every `quota_source_usages` row whether or not the source is configured.

</details>

Have the load and the popover start from one `hasOtherQuotaSources(config)` check, and move the load to a `useOtherQuotaSourcesUsage` composable called from `App.vue` under the same non-embedded condition, leaving `userStore.ts` as it is on `dev`. The meter's hint and the history warning still follow the loaded list, so a retired source over its quota can still show them if another page loaded the list.

<details><summary>Details</summary>

Commit `5e43fd80e84`. Two constraints shaped it:

- The load stays in `App.vue` rather than `QuotaMeter`, which only mounts with the masthead: under `?hide_masthead=true` the history warning would lose its data.
- The composable reads `useConfigStore` rather than `useConfig`, whose `onMounted` calls `loadConfig` again. Using `useConfig` here failed `App.test.ts` ("retries only the configuration") with a second config request.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P2 2: The popover's gates are unprotected, and the quotas-off test passes without its guard (implementation verified)

`lists no sources when quotas are off` never opens the popover, and rows render only once it's open, so the assertion holds whether or not the popover exists. A registered user with nothing beyond the default source and an anonymous user on a server with no other sources are also untested.

<details><summary>Evidence</summary>

Each mutation passed the PR's tests and fails on the branch (commit `d417ebc44cd`, updated by `5e43fd80e84`): removing the `enable_quotas` guard, changing `> 1` to `> 0`, and forcing the anonymous labels check to true.

</details>

Open the popover in the quotas-off test, assert the tooltip that stays, and add the two missing cases.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P2 3: Meter tests never include the default source, so a default-only overage is untested (implementation verified)

The server's usage list always includes the default source, but `mountWithSourceUsages` can't express a `null` label, and the `HistoryMessages` tests never put the default row over quota. Counting the default source in `otherSourcesOverQuota` would show a user over only their default quota the "other storage" hint and a second history warning, with no test noticing.

<details><summary>Evidence</summary>

Removing `rawSourceLabel !== null` from `otherSourcesOverQuota` passed the PR's tests and fails two tests on the branch (commit `1dde5e00099`).

</details>

Include the default row in the meter fixtures, and assert no hint and no second warning when only the default source is over.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P2 4: Per-source usage loading isn't tested for anonymous users, quotas off, or a user who arrives late (implementation verified)

The description says the usage per source loads only for registered users on servers with quotas on several sources, because it adds a request per refresh. The tests cover only a registered user set before the watching starts, with `enable_quotas` hardcoded on. Without the anonymous gate, anonymous users would request the usage on every page load.

<details><summary>Evidence</summary>

Removing the registered-user or `enable_quotas` condition passed the PR's tests and fails the new ones.

</details>

Cover all three cases.

<details><summary>Details</summary>

Commit `aeb7d8f9be5` adds them beside the existing cases. `5e43fd80e84` moves them, with those cases, to `client/src/composables/otherQuotaSources.test.ts`.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P2 5: No E2E test covers the feature (implementation verified)

Every test uses a hand-written API payload, so nothing checks that the real configuration, usage and storage responses produce the warning. jsdom also can't show that the popover stays open as the pointer moves onto its button, or that a real over-quota run reaches the meter and history panel. The startup path is unproven too: the meter tests call `loadQuotaUsages()` themselves and the history tests set the store directly.

<details><summary>Evidence</summary>

Commit `7ab041184b8`. Both tests pass against a client built from the branch, run one at a time with `GALAXY_TEST_DRIVER_BACKEND=playwright`. The Selenium backend couldn't be run locally: that configuration needs `pyvirtualdisplay`, which isn't installed.

</details>

Add `test/integration_selenium/test_storage_source_quota_warnings.py`, which goes over quota on a second source, checks the meter hint, history warning and popover rows, clicks through to the dashboard, and covers the anonymous login path.

<details><summary>Details</summary>

The popover's button shares `data-description="storage dashboard button"` with the one in `HistoryCounter.vue`, and a first run clicked the history one, so the new `navigation.yml` selector is scoped to `.quota-sources-popover`.

`client/src/utils/navigation/schema.ts` wasn't regenerated: it has drifted from `navigation.yml` well beyond this PR, with about 1,000 changed lines on regeneration.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 1: `quotaUsageStore` updates its list of usages by hand in one load path (implementation verified)

`quotaUsages` and `sourceUsageByKey` both hold `QuotaUsage` objects. The warnings now read the list, so `loadQuotaUsageForSource` patches it after each single-source fetch, beside `setSourceUsage`, the function that records one source's usage. Any later caller of `setSourceUsage` would leave the warnings stale.

<details><summary>Evidence</summary>

Commit `5c4e99fb550`. The PR's `quotaUsageStore.test.ts` regression test and `userStore.test.ts` pass. No behavior changes, so this is P3 rather than the discovery report's P2.

</details>

Move the patch into `setSourceUsage`, so one function owns "a source's usage changed".

<details><summary>Details</summary>

Making `quotaUsages` a `computed` over `sourceUsageByKey` would remove the second copy entirely, but it changes how a `null` single-source result is treated and how tests seed the store. That can follow if the two copies keep causing trouble.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 2: `QuotaUsage.sourceLabel` is left behind as a key only (implementation verified)

Moving display to `quotaSourceName` leaves `sourceLabel` and `DEFAULT_QUOTA_SOURCE_LABEL` used outside tests only as `v-for` keys in `QuotaUsageSummary.vue` and `FilterMenuDropdown.vue`, and the field's doc comment no longer describes it. As a key it gives the default source and a source labelled "Default" the same value, which the new popover avoids through `sourceLabelToKey`.

<details><summary>Evidence</summary>

Commit `f757a11bb4d`; `vue-tsc` is clean and the quota, object store and config template Vitest suites pass.

</details>

Key those lists with `sourceLabelToKey(usage.rawSourceLabel)` and drop the field and constant. The hand-written `?? "__null__"` quota keys in `ProvidedQuotaSourceUsageBar`, `DescribeObjectStore` and `SourceOptionCard` can use the same helper.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort and [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 3: `QuotaSourcesPopover` is two components behind `isAnonymous` (implementation verified)

The anonymous and registered branches share only the `GPopover` shell. The template alternates `v-if="isAnonymous"`, `v-else-if="isShown"` and `v-if="!isAnonymous"`, and every mode-specific prop is optional, so the types don't say which combinations are valid.

<details><summary>Evidence</summary>

Commit `5bd57245238`: `QuotaSourcesLogin.vue` and `QuotaSourcesList.vue`, selected in `QuotaMeter.vue`. The meter tests and E2E tests pass, including lazy storage loading.

</details>

Keep the popover as a shell exposing `isShown` through its slot, and move each branch's content into its own component with required props.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 4: Popover rows are asserted through a class nothing else uses (implementation verified)

`lists every source...` checks the `.over-quota` class, which has no CSS and no other reference. Dropping the "jobs writing here are on hold" message or the usage text, including the unlimited case, leaves the tests green.

<details><summary>Evidence</summary>

Both mutations passed the PR's tests and fail on the branch (commit `f94aaf38fca`).

</details>

Assert the hold message and usage text per row, and remove the class.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 5: Storage names in the history filter and dashboard aren't exercised (implementation verified)

The description lists both as places named after storages, and `FilterMenuDropdown.vue` changes both its options and toggle text. No test asserts a storage name in the dropdown, and `QuotaUsageSummary.test.ts` mocks `/api/object_stores` as empty, so reverting to raw labels goes unnoticed.

<details><summary>Evidence</summary>

Reverting the options, the toggle, or `QuotaUsageBar`'s name each fails a new test (commit `ef20abeafa6`).

</details>

Add a `FilterMenuDropdown.test.ts` covering the options and the toggle, and mock a storage in `QuotaUsageSummary.test.ts`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 6: Test setup is repeating instead of becoming a helper (implementation verified)

The hover-then-advance sequence in `QuotaMeter.test.ts` belongs beside the other tooltip helpers, and storage payloads are hand-written in both `QuotaMeter.test.ts` and `HistoryMessages.test.ts`, next to the new `getFakeQuotaUsageData`.

<details><summary>Evidence</summary>

Commit `ac87dfae895`; both test files pass with no assertion changes.

</details>

Add `hoverPastTooltipDelay` to `tooltipTestUtils.ts` and `getFakeStorage` to `tests/test-data`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>
