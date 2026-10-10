# Readability batch 34

Four originators, all a deliberate follow-through from batch 33: eligible consumers of `setupMockConfig`. Shared helper fix first, then one test per commit and one range review. [Manifest](readability_batch_34.yml).

## Originators

| Selected test | Result | Cases |
| --- | --- | ---: |
| QuotaMeter | `mountQuotaMeter({ enableQuotas, user })` over `getFakeRegisteredUser`, seeded via `initialState` + `withPlugins`; selectors, a three-row `it.each`, and the no-quota case split in two. A dead `vi.mock("@/api/schema")` (type-only re-exports) is dropped. The tooltip check went from `toContain("Storage")` to the exact title; the anonymous title used to pass it. [Review](reviews/batch34/QuotaMeter.md). | 4 → 7 |
| GridList | "basic rendering" is split into 4 cases and "operation handling" into 3. New helpers: `mountGridList`/`mountLoadedGridList`, `dataRequests()` (each `getData` call as named params), `cell()`/`header()`. The pager link is picked by label; four `as any` casts and a no-op `vi.mock("vue-router")` are gone. Exact operation list, `toHaveBeenCalledExactlyOnceWith(row)`, and the pager request checked at offset 4, limit 2. [Review](reviews/batch34/GridList.md). | 5 → 10 |
| ToolCard | Per-test `mountToolCard({ version, options })` returns `{ wrapper, router }`; `createTestRouter()` replaces deprecated `injectTestRouter`. An admin `getFakeRegisteredUser` is seeded before mount, and the two no-badge cases are an `it.each`. At review's request the `/api/configuration` handler stays, commented with the real reason (below). [Review](reviews/batch34/ToolCard.md). | 4 → 6 |
| useRegistrationTarget | The two-config "offers nothing" case is split; a `LOCAL_REGISTRATION_FORM` constant. Deliberately small. [Review](reviews/batch34/useRegistrationTarget.md). | 4 → 5 |

## Reuse and follow-through

[`setupMockConfig`](reviews/batch34/mockConfig.md) in `client/tests/vitest/mockConfig.js` now returns `config` and `isConfigLoaded` as refs. It was fixed in place rather than migrated to `@/composables/__mocks__/config`:
- `setupMockConfig` replaces the whole config, while `setMockConfig` merges into defaults that include `allow_local_account_creation: true`. Migrating would flip useRegistrationTarget's `{}` row.
- `__mocks__/config` has no setter for `isConfigLoaded`.
- A downstream-owned consumer would otherwise need editing.

Supporting WorkflowListTabs (9 → 9) drops its hand-rolled `vi.hoisted` computed mock, written around exactly this bug. It fails 6/9 under the old helper.

All 12 consumers pass at the tip: 95 cases, run together by the driver. Their output is otherwise unchanged.

The old helper made SelectionOperations' two "With Celery Disabled" cases vacuous. `isCeleryEnabled` reads `this.config` through Options API `setup()`, which was always undefined. Mounted with tasks enabled, both cases passed under the old helper and fail under the new one; they are real now with no test edit.

**Correction to batch 33.** Batch 33's Masthead notes, and this batch's first ToolCard draft, said testing pinia stubs `configurationStore.loadConfig`. It doesn't for the first call. The store's setup body calls `loadConfig()` before `@pinia/testing`'s plugin swaps actions for spies; in pinia 4.0.3, `setup()` runs before the plugin loop. Without a `/api/configuration` handler the store ends with `loadError`, which is the likely source of Masthead's `ECONNREFUSED` noise. `initialState` doesn't help, because it's also applied by a plugin.

README guidance proposed by the implementer, not added yet:
- replace-vs-merge semantics of the two config mocks
- the plain-object warning extends beyond templates to Options API `this.config` and script reads of `isConfigLoaded.value`

The README now names only `__mocks__/config`; documenting both mocks is a follow-up.

Follow-ups:
- Masthead: add the configuration handler, which should clear the `ECONNREFUSED` noise.
- SelectionOperations: the "Celery Enabled" block never checks that the two items appear.
- InstallationSettings (later lane): batch 24's reason for its local mock may no longer hold.
- README: document `setupMockConfig` vs `setMockConfig`.

## Validation and review

95 cases across 12 suites pass: 28 selected, 67 in the helper's other consumers. The selected baseline was 17. Each commit's tests pass at that commit, shuffled with seed `340101`; full client vue-tsc passes at the tip; ESLint, Prettier and hooks pass. [Independent review](reviews/batch34/review.md) approved four commits and asked that ToolCard restore the configuration handler. The implementer confirmed the claim by probing the store's `isLoaded`/`loadError`; the change was folded in with a fixup and re-verified. The review also confirmed:
- The ToolCard badge cases lose nothing by mounting with final props.
- GridList's action click doesn't depend on the loading state.
- The dropped mocks were no-ops.

Commits: `783d3e03c7d` (mockConfig fix + WorkflowListTabs), `16298061fde` (QuotaMeter), `86489dcbf6c` (GridList), `22d1b41b3d8` (ToolCard), `f324bca585c` (useRegistrationTarget).
