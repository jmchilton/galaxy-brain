# Thermo review: #24747

- Profile: `thermo_review` (`_shared/reviewers/thermo_review.md`)
- Model: `claude-opus-5-5`
- Effort: medium
- Reviewed commit: `f76e9ce6925d` (merge-base `ab036aead321`, base `dev`)
- Code read, not run

## Verdict

No P1. No file crosses 1k lines (largest touched: `userStore.ts`, 467). The feature's shape is sound: the composable and `storeNamesByQuotaSource` are real, reusable abstractions. The two structural problems are in state and policy: the PR hand-syncs two copies of the same usage data, and it answers "does this server have other quota sources?" from different signals in `userStore` and `QuotaMeter`, while parking the load in the user store.

## Findings

### P2 1: `quotaUsageStore` keeps two copies of each source's usage, and the PR adds a hand-written sync between them

`quotaUsages` and `sourceUsageByKey` both hold `QuotaUsage` objects. Before this PR they could drift without much consequence. Now the warnings read the list, so `loadQuotaUsageForSource` patches it after every single-source fetch (`quotaUsageStore.ts:141-147`, "Keep the list of all sources... as current as this one"). That is a second write inside one flow, in a helper-less spot, while `setSourceUsage` exists as the single-source writer. Any later writer has to remember both.

Fix: keep one record of usage. Preferred: `sourceUsageByKey` is the only store of usage objects; `loadQuotaUsages` also records the ordered source keys; `quotaUsages` becomes a `computed` over those keys. The patch at lines 142-147 and `hydrateSourceUsageFromAll`'s duplication then disappear, and the two views cannot disagree. `HistoryMessages.test.ts:31` assigns `quotaUsages` directly and would need to seed through the server mock or `sourceUsageByKey`.

Smaller fallback if that is too much for this PR: move the list patch into `setSourceUsage`, so one function owns "a source's usage changed".

### P2 2: The "other quota sources" policy is restated in three places, and its load is parked in `userStore`

`userStore` and `QuotaMeter` answer the same question from different signals:

- `userStore.ts:185-189`: `enable_quotas && quota_source_labels.length && registered` (config labels)
- `QuotaMeter.vue:31-39`: `enable_quotas`, then `quota_source_labels.length` for anonymous users, but `quotaUsages.length > 1` for registered ones (the loaded list)

The signals aren't strictly equivalent. `dictify_usage` (`lib/galaxy/model/__init__.py:1359`) also returns any source the user has recorded usage on, whether or not it is still configured, so a registered user can get the popover on a server where `userStore` decided there is nothing to load.

The load itself sits in `startWatchingStorageUsage`, a function about refreshing on tab focus. It adds a new `userStore` to `configurationStore` dependency and a quota feature check to a general store. "Warnings stay current" also rests on a side effect: this call sets `wasRequested`, which is what makes `refreshStorageUsage` (`userStore.ts:144`) reload the usages. The PR's own note says this block is where it conflicts with #24738.

Fix: one owner for the policy. Add a `hasOtherQuotaSources` getter from config to `quotaUsageStore`, and a small composable (e.g. `useOtherQuotaSourcesUsage`) holding the `watchImmediate` for registered users, called from `App.vue` under the same non-embedded condition as today. `startWatchingStorageUsage` returns to its one job and its config import goes away. The meter's popover condition and the load then start from that one getter, with the meter adding only its need for the list to have loaded.

Don't move the load into `QuotaMeter` itself, though it looks like the obvious home: `App.vue` only mounts `Masthead` under `showMasthead`, while `startWatchingStorageUsage` runs without it, so the history warning would lose its data under `?hide_masthead=true`.

### P3 1: The model's `sourceLabel` and `DEFAULT_QUOTA_SOURCE_LABEL` are left vestigial, so sibling lists key differently

The PR correctly stops treating `sourceLabel` as a display name or default check, since a real source labelled "Default" collides with it (see the new `QuotaUsageBar.test.ts` case). But the field survives with only two non-test readers, both `:key` bindings (`FilterMenuDropdown.vue:169`, `QuotaUsageSummary.vue:57`), and they keep that collision. The new popover keys through the newly exported `sourceLabelToKey`, so lists over the same type now key differently.

Exporting `sourceLabelToKey` is the right abstraction: it works on a label before any `QuotaUsage` exists, which the hand-rolled `?? "__null__"` copies in `SourceOptionCard`, `DescribeObjectStore` and `ProvidedQuotaSourceUsageBar` also need. Finish the move instead: add a `sourceKey` getter on `QuotaUsage` that delegates to that helper (moving it beside the model so the model doesn't import a store), use the getter for all three `:key` bindings, and retire `sourceLabel` and `DEFAULT_QUOTA_SOURCE_LABEL`.

### P3 2: `QuotaSourcesPopover` is two components behind `isAnonymous`

The anonymous and registered branches share only the `GPopover` shell. The template alternates `v-if="isAnonymous"`, `v-else-if="isShown"` and `v-if="!isAnonymous"`. `isOverDefaultQuota` is read only in the anonymous branch, yet `QuotaMeter` computes and passes it for everyone, and every mode-specific prop is optional, so the type doesn't state which combinations are valid.

Fix: move each branch's content into its own small component and have `QuotaMeter` select one (or keep one shell with a default slot). `isOverDefaultQuota` then becomes a required prop of the anonymous one, `quotaUsages` a required prop of the registered one, and the `isAnonymous` prop goes away.

### P3 3: The popover rebuilds usage text that `QuotaUsageBar` already owns, with fragment translations

`QuotaSourcesPopover.usageText` re-derives "X of Y" after passing `compact` to suppress the same line in the bar, and it concatenates `localize("of")` and `localize("unlimited")`. That is the fragment translation `HistoryMessages.vue` avoids on purpose ("so each sentence translates whole"). The bar also gains a third display boolean (`showDefaultSourceName`, beside `embedded` and `compact`), and its source-name rule now reads `!embedded && (!isDefaultQuota || showDefaultSourceName)`.

Fix: put the usage sentence in one place, translated whole, on the `QuotaUsage` model or a shared formatter, and have both the bar and the popover read it. If the bar's display modes keep growing, replace the booleans with a named layout.

## Considered, not flagged

- **`quotaSourceName` instantiating the object store lazily**: magic, since a name lookup can start a request, and `isShown` in the popover exists only to defer it. `QuotaUsageBar.test.ts` also now needs an `/api/object_stores` mock. The PR description calls out this load timing as deliberate, and every explicit alternative I found adds more code than it removes.
- **`v-g-tooltip="{ title: quotaTitle }"` with an empty title**: a documented form of the directive, with the reason in a comment.
- **`isUserOverQuota` and `QuotaUsage.isOverQuota`**: two over-quota rules, but they read different payloads and anonymous users have no bytes to compare. Moving the existing helper to `api/index.ts` for reuse is right.
- **File size**: no threshold crossed.

## Bugs noticed

None beyond the duplicate `:key` in P3 1, which requires a source literally labelled "Default".

## Follow-up issue

None: the base is `dev`, so the refactors fit in this PR.
