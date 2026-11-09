# Test challenges review — PR #24747

- Profile: `gx_test_challenger`
- Model: `claude-opus-5-5`
- Effort: medium
- Reviewed commit: `f76e9ce6925d`, against merge-base `ab036aead321`

No tests need dropping and none were weakened. The gaps are a missing E2E test and untested gating branches. Mutation evidence, the per-test verdicts and the test plan are in [test_challenges_debrief.md](test_challenges_debrief.md).

## Findings

### P2 1: Popover gates are unprotected, and the quotas-off test passes without its guard

`lists no sources when quotas are off` never opens the popover. Source rows render only once it is open, so the assertion holds whether or not the popover exists. Removing the `enable_quotas` check from `showSourcesPopover` leaves the suite green. Two sibling branches are also uncovered: a registered user with only the default source, and an anonymous user on a server with no other sources. Both should keep their tooltip, and both mutations survive.

Open the popover in the quotas-off test, assert the tooltip text, and add the two missing cases. Prototypes are in `test_challenges/quotaSourceGaps.test.ts` under `popover gate`, and they kill all three mutations.

### P2 2: Meter tests never include the default source row, so a default-only overage is untested

The server's usage list includes the default source, but `mountWithSourceUsages` builds rows from `Record<string, number>` keys, which can't express a `null` label. The `HistoryMessages` tests include a default row but never over its quota. So removing `rawSourceLabel !== null` from `otherSourcesOverQuota` survives, although it would make a user over only their default quota see the "other storage" hint and a second history warning. The "Default storage" popover row is also unexercised.

Add a default row to the meter fixtures, and assert no hint and no second warning when only the default source is over. Prototypes are under `with the default source row the server always sends`.

### P2 3: Per-source usage loading isn't tested for anonymous users or quotas off

The PR's note says usage per source loads "only for registered users on servers with quotas on several sources", because it adds a request per refresh. `userStore.storageUsage.test.ts` covers only the empty and non-empty label cases, with `enable_quotas` hardcoded on. Removing either the `isRegisteredUser` or the `enable_quotas` condition survives.

Parameterize the helper and add both cases. Prototypes are under `loading the usage per source`.

### P2 4: No E2E test covers the feature

Every test uses a hand-written API payload, so nothing checks that the real `/api/configuration`, usage and `/api/object_stores` responses produce the warning. jsdom also can't show what the PR depends on in a browser: the popover staying open as the pointer moves onto its button, the tooltip being replaced, or a real over-quota run reaching the meter and history panel. The startup path is also unproven: `App.vue` calls `startWatchingStorageUsage()`, but the meter tests call `loadQuotaUsages()` themselves and the history tests set the store directly, so no test shows a normal page load producing the warnings. Custom object store and quota config makes this a Selenium integration test, and `test_objectstore_selection.py` already has the config template and a popover hover pattern to reuse.

Add `test/integration_selenium/test_storage_source_quota_warnings.py`: go over quota on a second source, check the meter hint, history warning and popover rows, click through to the dashboard, then cover the anonymous login path. A prototype and the `navigation.yml` additions are in the review directory. The prototype has **not been run**; it only passed a syntax check.

### P3 1: Popover rows are asserted through a class nothing else uses, not what the user reads

`lists every source...` checks the `.over-quota` class, which has no CSS and no other reference. Dropping the "jobs writing here are on hold" message survives, as does dropping the usage text, including the "(unlimited)" case.

Assert the message, through its existing `quota source over quota` attribute, and the usage text per row, and remove the class. Prototype: `shows each row's name, usage and hold message in the popover`.

### P3 2: Storage naming on the dashboard and history filter isn't exercised

The PR lists both as places sources are named after storages. Their tests mock `/api/object_stores` as empty or don't cover naming, so reverting `QuotaUsageBar` or the `FilterMenuDropdown` options to raw labels survives.

Mock one storage in `QuotaUsageSummary.test.ts`, and add a small dropdown test. Prototypes are under `names after the storages using the source`; the E2E test also covers the dashboard.

### P3 3: Test setup is repeating instead of becoming a helper

The real-tooltip `localVue` override and hover-then-advance sequence in `QuotaMeter.test.ts` follow the setup in `ObjectStoreBadge.test.ts`, and `tooltipTestUtils.ts` is the natural home for it. Storage payloads are also hand-written in both `QuotaMeter.test.ts` and `HistoryMessages.test.ts`, beside the new `getFakeQuotaUsageData`.

Add a hover helper to `tooltipTestUtils.ts` and a `getFakeStorage` to `tests/test-data`.

## Security

No security findings.
