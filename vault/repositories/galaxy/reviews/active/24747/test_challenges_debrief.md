# Test challenges debrief — PR #24747

- Profile: `gx_test_challenger`; model `claude-opus-5-5`, effort medium.
- Reviewed commit: `f76e9ce6925d`, against merge-base `ab036aead321`.
- Mode: review directory, so nothing changed in the PR. Everything below is a recommendation.

## Bottom line

No test should be dropped: the PR's Vitest tests mostly assert visible behaviour through the real stores and a mocked API. Their weakness is what they leave out. Nothing runs the feature against a real server and browser, and the branches that keep the feature from showing up in the wrong place are mostly unprotected. One test passes without checking anything.

## How it was checked

No worktree dependencies exist, and the worktree is shared. So the PR's `client/` was extracted with `git archive` into a scratch directory, and its `node_modules` were symlinked from another worktree with an identical `pnpm-lock.yaml`. The PR worktree stayed clean.

Baseline: the PR's vitest files pass (15 files, 85 tests).

### Mutations against the PR's own tests

| Mutation | Result | Test that caught it |
|---|---|---|
| M1 `QuotaMeter`: drop the `enable_quotas` guard on the popover | survived | |
| M2 `quotaUsageStore`: count the default source in `otherSourcesOverQuota` | survived | |
| M3 `QuotaMeter`: popover with a single source (`> 1` to `> 0`) | survived | |
| M4 `QuotaMeter`: anonymous popover without configured labels | survived | |
| M5 `userStore`: load per-source usage for anonymous users | survived | |
| M6 `userStore`: ignore `enable_quotas` when loading | survived | |
| M7 `FilterMenuDropdown`: raw labels in the options | survived | |
| M9 `QuotaUsageBar`: don't resolve the storage name | survived | |
| M13 Popover: drop the "jobs writing here are on hold" message | survived | |
| M14 Popover: drop the usage text | survived | |
| M11 Store: no list update on single-source reload | killed | `quotaUsageStore.test.ts` |
| M15 Meter: don't pass the anonymous over-quota flag | killed | `QuotaMeter.test.ts` |
| M16 `userStore`: refresh skips the per-source reload | killed | `userStore.test.ts` (4 pre-existing tests) |
| M17 History: warn regardless of ownership | killed | `HistoryMessages.test.ts` |
| M18 Meter: drop the hint's text | killed | `QuotaMeter.test.ts` |
| M19 `objectStoreStore`: count storages with quota disabled | killed | `QuotaMeter.test.ts` |

M16 ran against `userStore.test.ts` and `userStore.storageUsage.test.ts`. The other mutations ran against the PR's quota test files plus `FilterMenu.test.ts`.

### Prototypes

- `test_challenges/quotaSourceGaps.test.ts`: 10 tests, all passing on the PR head. Each of the ten surviving mutations (M1-M7, M9, M13, M14) fails at least one of them.
- `test_challenges/test_storage_source_quota_warnings.py`: a Selenium integration prototype. **Not run**: it needs a Python environment and a client build of this PR. It only passed a syntax check.

## Unit test challenges

| Test | Verdict |
|---|---|
| `QuotaUsage.test.ts`: over-quota table | Keep. The boundary mirrors the server's rule and is cheap to check here. |
| `quotaUsageStore.test.ts`: stops reporting after a source reload | Keep. Good regression test, and M11 shows it bites. |
| `userStore.storageUsage.test.ts`: loaded / not loaded | Keep, and add the anonymous and quotas-off cases (P2 3). |
| `HistoryMessages.test.ts`: new tests | Keep. Add the default-source case (P2 2). |
| `QuotaMeter.test.ts`: `shows a tooltip on hover` | Keep. It replaces a `title` attribute check with the real directive, so this is stronger, not weaker. |
| `QuotaMeter.test.ts`: `lists no sources when quotas are off` | **Rewrite**: it passes without the guard (P2 1). |
| `QuotaMeter.test.ts`: `lists every source in a popover...` | Keep, but assert visible content rather than `.over-quota` (P3 1). |
| `QuotaMeter.test.ts`: lazy storage load, tooltip replacement | Keep. Request counts are the behaviour promised in the PR's note. |
| `QuotaMeter.test.ts`: anonymous group | Keep. Add the no-labels case (P2 1). |
| `QuotaUsageBar.test.ts`: `names a source labelled like the default one` | Keep. `async` has no `await`, which is harmless. |
| `QuotaUsageSummary.test.ts`: source names | Keep. Mock a storage so that name resolution is exercised (P3 2). |

Other challenges from the process:

- **Fake layout:** none. The hover helpers advance timers but don't fake geometry, though that also means jsdom can't show the popover is positioned or stays open under the pointer. That belongs in E2E.
- **Mocks:** the tests use `useServerMock` and real stores rather than module mocks, which is the preferred shape. No restructuring needed.
- **API or integration layer:** the PR is client-only, and the server hold rule is already covered by `test/integration/objectstore/test_quota_limit.py`.
- **Trivial tests:** none found.

## Test plan

### 1. Selenium integration test

This needs custom server config, so per `writing_tests.md` it belongs in `test/integration_selenium/`. Copy the prototype, which reuses `MSI_EXAMPLE_OBJECT_STORE_CONFIG_TEMPLATE` and `run_environment_test_tool(select_storage="second")`, and add these to `navigation.yml`:

```yaml
masthead:
  selectors:
    other_storage_over_quota:
      type: data-description
      selector: 'other storage over quota'
    quota_source_usage:
      type: data-description
      selector: 'quota source usage'
    quota_source_over_quota:
      type: data-description
      selector: 'quota source over quota'
    storage_dashboard_button:
      type: data-description
      selector: 'storage dashboard button'
    quota_sources_log_in_button:
      type: data-description
      selector: 'log in button'

history_panel:
  selectors:
    other_sources_over_quota:
      type: data-description
      selector: 'other sources over quota message'

storage_dashboard:
  selectors:
    source_label: '.storage-source-label'
```

To check when running it:

- `self._post("quotas", ..., admin=True)` is used here without `run_as_admin`, unlike `test_admin_quotas.py`. Confirm the admin key is enough.
- `client/src/utils/navigation/schema.ts` may need regenerating with `navigation_to_schema.mjs`.
- The test should pass under both drivers: it uses `self.hover`, as the badge popover test in `test_objectstore_selection.py` does.

### 2. Vitest additions

Split `test_challenges/quotaSourceGaps.test.ts` into its sibling files:

- Popover gates and the default-source row: `QuotaMeter.test.ts`.
- Default-source history warning: `HistoryMessages.test.ts`.
- Load gates: `userStore.storageUsage.test.ts`. Its `startWatchingWithQuotaSources` helper hardcodes `enable_quotas: true` and would need a parameter.
- Dashboard names: `QuotaUsageSummary.test.ts`.
- Filter names: a new test beside `FilterMenu.test.ts`.

### 3. Rewrite and clean up

- Replace `lists no sources when quotas are off` with the opened-popover version.
- Replace the `.over-quota` assertion with the row's visible message, and remove the class from `QuotaSourcesPopover.vue`. Nothing else uses it.

## Not flagged

- The `isUserOverQuota` move to `api/index.ts` keeps its coverage through the `HistoryMessages` table.
- The refresh path behind the "second request per refresh" note is covered by existing `userStore.test.ts` tests (M16).
- Bug hunting was out of scope, and no behavioural bug was found incidentally.
