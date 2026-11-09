# Initial review: #24747

- Profile: default (`_shared/reviewers/default.md`)
- Model: claude-opus-5-5
- Effort: medium
- Reviewed commit: `f76e9ce6925d` (against merge-base `ab036aead321`)

## Verdict

No blockers. Behavior matches the server and the design is reusable; only three minor findings. Static review: vitest was not run locally. CI at this commit: 22 checks pass, 1 skipped.

## Findings

### P3 1: Gating of the eager usage load is only tested on one branch

`hasOtherQuotaSources` in `startWatchingStorageUsage` (`client/src/stores/userStore.ts:185`) gates on `enable_quotas`, `quota_source_labels` and `isRegisteredUser`, and is a reactive `watchImmediate` so it can fire once the user or config arrives. `userStore.storageUsage.test.ts` covers only a registered user set before watching, with and without labels. No test covers the anonymous gate (without it, anonymous users would request `/api/users/current/usage` on every page load) or a user who loads after `App.vue` starts the watching.

Add two cases beside the existing ones, using the existing `startWatchingWithQuotaSources` helper: an anonymous user issues no request (`sourceUsageRequests` stays 0); a user set after watching starts triggers one request.

### P3 2: `QuotaUsage.sourceLabel` is left behind as a key only

The PR moves all display to `quotaSourceName`, which leaves `QuotaUsage.sourceLabel` and `DEFAULT_QUOTA_SOURCE_LABEL` used outside tests only as `v-for` keys (`QuotaUsageSummary.vue:57`, `FilterMenuDropdown.vue:169`). The field's doc comment ("The name of the ObjectStore associated with the quota") no longer describes it. As a key it also gives the default source and a source labelled "Default" the same value, a case the PR's own `QuotaUsageBar.test.ts` now covers, and the new popover avoids it by exporting `sourceLabelToKey` for its one key.

Remove the leftover: key those two lists with `sourceLabelToKey(usage.rawSourceLabel)`, then drop `sourceLabel` and `DEFAULT_QUOTA_SOURCE_LABEL` (updating `QuotaUsage.test.ts` and the bar tests). `ProvidedQuotaSourceUsageBar.vue:38` can use the exported helper in place of its hard-coded `"__null__"` at the same time.

### P3 3: Naming in the history filter dropdown is untested

The description lists the history filter among the places that use storage names, and `FilterMenuDropdown.vue` changes both the list item and `dropDownText` to `quotaSourceName`. No test asserts a storage name in the dropdown: `FilterMenu.test.ts` mocks only a null-label usage, and no other test mounts the quota source filter. The meter, summary and history warning all have name assertions.

Add a case to `FilterMenu.test.ts` with a labelled source and a mocked `/api/object_stores`, asserting the storage name in the list and in the toggle once selected.

## Checked, no finding

- Over-quota rule: `QuotaUsageModel.isOverQuota` matches `DatabaseQuotaAgent.is_over_quota` (`usage > quota`). `get_quota` returns `None` for 0, so the "0 means no quota" comment is correct. `NoQuotaAgent` yields `quota_bytes: null`, so no warnings with quotas off.
- `quota_source_labels` excludes the default source when it has no label, so non-empty really means other sources exist; `dictify_usage` always includes the default plus each label, so the `> 1` popover gate holds.
- Lazy storage loading: the meter and history panel stay lazy (`otherSourcesOverQuotaText` renders only behind its `v-if`, the popover list only once open). Embedded `QuotaUsageBar`s also load the storages for a non-default source, because `sourceName` is in their `aria-label`; that is one cached request on pages that show that name, so not raised.
- Keyboard and screen readers: `GPopover` hover + `interactive` opens on focus and is tabbable from the `BLink`; the warning icon has `sr-only` text.
- Tooltip: `vGTooltip` reads `title` from the object binding on update and treats empty as no tooltip, as the `QuotaMeter.vue` comment says.
- Token: `--color-yellow-500` is defined in `client/packages/ui/src/styles/tokens.css`.
- Selectors: no Selenium or navigation selector uses `quota-storage-source`, the removed "storage source" text, or the meter's old tooltip.
- `quotaUsageStore.invalidate()` has no callers, so `wasRequested` can't reset and drop the warnings.
- Tests: no assertions weakened; the `title` attribute test became a stricter hover test against the real directive.
- Abstractions: `isOverQuota`, `isUserOverQuota`, `storeNamesByQuotaSource` and `useQuotaSourceNames` are reusable, with no duplicated logic elsewhere. `ObjectStoresStorageOverview.vue` names per store through `getObjectStoreNameById`, a different mapping.

Deliberate decisions in the description (the extra request per refresh, names from selectable storages only, and #24738's conflict) are not re-raised.
