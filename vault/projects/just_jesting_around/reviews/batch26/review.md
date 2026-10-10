# Batch 26 review

Range `1577eab6dae..vitest_readability` (5 commits; worktree HEAD was detached by the driver, so read from branch ref).

## da4a4a2629c Improve readability of PageProvider tests

Approved.

Mapping: the single "make an API call and fire callback" case is now "fetches the requested page and search under the configured root and passes the response to its callback".
- The conditional handler (limit 50, offset 0, search "rna tutorial", else `[]`) becomes an always-respond handler that records params, plus `toEqual({ limit: "50", offset: "0", search: "rna tutorial" })`.
- `called` truthy becomes `toHaveBeenCalledTimes(1)`, plus checks on the callback's `data` and `total_matches` header.
- Added: the returned `items`.

Findings: the original was vacuous, since wrong params fell through to `[]` and the callback still fired. Every param from the old condition is now asserted, so the intent is kept. The root is still checked through the `/prefix/api/pages` handler path. The shape is identical to batch 25's `StoredWorkflowProvider.test.js`. Not extracting a shared helper for three one-case files is reasonable.

## 6bf1eeae414 Improve readability of WorkflowInvocationState tests

Approved.

Mapping (10 → 10). The two ID-keyed tables became a per-test `storeInvocation(id, summary, overrides)` with the same data:
- terminal → `toBe(true)`, invocation fetched 1, summary fetched 0, plus new `calledWith({id})`
- not-fetched (null entries) → overview absent, 1/0, info alert "Invocation not found."
- `state: "new"` → false, 2/0
- `{running:1}` → false, 1/1, plus new summary `calledWith`
- `populated_state:"new"` → false, 1/1
- error-invocation (throw now set in-test) → overview absent, 1/0, danger alert text
- Report/Export disabled `"true"` for new; `undefined` for terminal
- Debug tab absent for `{running:1,error:1}` (false); present for `{ok:1,error:1}` (true)

Findings:
- The HTML grep for `invocationandjobterminal="true"` is replaced by `findComponent(WorkflowInvocationOverview).props("invocationAndJobTerminal")`. The template renders exactly one `WorkflowInvocationOverview` (`class="invocation-overview"`, `:invocation-and-job-terminal`), and the prop is declared `boolean`. The old helper's "absent → false" branch is now an explicit `exists()` false in the not-found and error cases. Elsewhere the check is the prop value `false`. That is stronger, and no behavior is lost.
- Stub boundary is unchanged: same `shallowMount`, `getLocalVue`, `createTestingPinia`, vue-router mock, and invocation/workflow store mocks. Getters are now plain functions instead of `vi.fn` wrappers, but nothing asserted on them. `findComponent(GAlert)` hits the same auto-stub as `g-alert-stub`. In both alert cases the main `div` isn't rendered, so the first GAlert is the same element as before.
- A top-level `beforeEach` now resets the spies and maps for all describes. Before, only the first describe reset them. The tab describes assert no counts, so nothing is masked. `mockReset` leaves the same `undefined` return the old non-error branch gave.
- The typed `importActual` and the dropped dead selectors are fine. No reuse was missed: there is no jobs-summary factory in `tests/test-data`.

## 362350acd0a Improve readability of ErrorBanner tests

Approved.

Mapping (9 → 9):
- message shown
- empty → no banner
- banner exists + `aria-live="assertive"`
- dismiss hides it (button text "Dismiss" still asserted)
- dismiss emits: `toBeTruthy`+`toHaveLength(1)` → `toEqual([[]])`, which is stricter
- re-show after dismiss with "Second error"
- "Initial" → "Updated" with `not.toContain`
- long message: the edge cases moved under "rendering"
- special characters: the loose "Error:"/"quotes" check becomes the full literal text plus no `<script>` element, which is the intent of the old comment

Findings: dropping `button.exists()` loses nothing, because `.text()` on a missing wrapper throws. Dropping the extra `nextTick`/`flushPromises` after `setProps` is sound. The `error` watcher is pre-flush, and `setProps` awaits the re-render. `enableAutoUnmount(afterEach)` matches 8 sibling Tool Shed suites. The removed `vi.clearAllMocks()` was a no-op.

## ea3fcc46c25 Add tests/vitest/fakeTaskMonitor.ts for client unit tests

Approved.

Helper: `getFakeTaskMonitor(overrides)` returns an idle `TaskMonitor`: false flags, `ref()` for `failureReason`/`taskStatus`, fresh `vi.fn()` methods, and no `expirationTime`. It has two concrete consumers, the Alert suite here and `persistentProgressMonitor.test.ts` in the next commit. Both pass a `TaskMonitor` input into the real composable. It is placed in `tests/vitest/` because it imports `vitest`, which `tests/test-data/` never does.

Supporting suite (`PersistentTaskProgressMonitorAlert.test.ts`), mapping 7 → 7: only monitor construction changed. The module-level `FAKE_MONITOR` and its `{...FAKE_MONITOR, flag: ref(true)}` spreads became a local `fakeMonitor(state)` that keeps `FAKE_EXPIRATION_TIME`. The `mountComponent` default param is evaluated per call, so each mount gets fresh refs and spies. The unused `vi` import is dropped. No test asserts on the monitor's spies.
- Moving `ref("")` to `ref()` is type-correct (`Ref<string | undefined>`) and doesn't change behavior. The component's `v-if="failureReason"` and the composable's `taskStatus`/`failureReason` watchers (`if (newStatus && ...)`) treat `""` and `undefined` the same.
- Assertions, requests, monitoring data, the GAlert/BLink stubs, and the listener-leak comments are untouched.

Other adopters: none missed. `DownloadItemCard.test.ts` fakes `PersistentProgressTaskMonitorResult`, which is the composable's output and a different interface. `taskMonitor.test.ts` and `shortTermStorageMonitor.test.ts` exercise the real monitors. No other `TaskMonitor` literals exist under `client/src`.

## 3621eb6896d Improve readability of persistentProgressMonitor tests

Approved.

Mapping (4 → 4):
- no data → `hasMonitoringData` `toBe(false)` (it is a boolean computed)
- start with data → `isRunning` true, plus new `waitForTask` `toHaveBeenCalledWith("123")`
- start without data → rejects with the exact message
- reset → true then false

`MOCK_REQUEST`, `taskId: "123"`, `expirationTime: 1000` and the `useLocalStorage`-as-ref mock are preserved.

Findings:
- The module-level shared monitor, which leaked `isRunning` across tests, is now a fresh monitor per test.
- The old `loadStatus` implementation is dropped. It was unreachable: `isFinalState` is a bare spy and the data starts now with a 1000 ms expiry, so `start()` always reaches `waitForTask`.
- The start test's own `isRunning` ref and `waitForTask` spy make the running-state flip visible in the scenario, and the added `calledWith` gives the test teeth.
- `any` → `unknown` in the serializer mock is fine.
- Commit order is correct: the helper commit comes first.

## Commit shape (all)

Each originator commit touches one test file. The helper commit precedes its originator and carries only the helper plus a supporting adoption. There are no production changes and no process comments.
