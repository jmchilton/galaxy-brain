# Review: ToolSelectPreferredObjectStore

Approved.

## Case mapping

| Original (`update preferred object store on selection`) | New home |
| --- | --- |
| 3 option cards rendered | `lists the Galaxy default option...`: `toHaveLength(3)` |
| `__null__` default card exists | same case, `.exists()).toBe(true)` |
| `object_store_1` select button exists | `it.each` row 1, `expect(selectButton.exists()).toBe(true)` |
| no `.object-store-selection-error` after click | `it.each` row 1, `SELECTION_ERROR` `toBe(false)` |
| `emitted("updated")?.[0]?.[1]` falsy | `it.each` row 1, `toEqual([["object_store_1"]])` (stronger; original was vacuous, passed with no emit) |
| (new) | `it.each` row 2: preferred `object_store_1`, select `__null__`, emits `[[null]]` |

## Findings

- Coverage: nothing dropped or loosened. Emit assertion is strictly stronger. Row 2 adds real value: proves prop reaches `SelectObjectStore` (default card's select button only renders when not selected) and `__null__` → `null` mapping.
- Boundaries: unchanged. Same `mount`, real `SelectObjectStore` → `SourceOptionCard` tree, same `setupSelectableMock` / `setupMockConfig`. Nothing newly mocked.
- Readability/README: `as object` cast gone, mixed `PREFERENCES` / `ROOT_COMPONENT.preferences` paths unified into `SELECTION`, `it.each` per README line ~190, mount helper flushes initial load. `enableAutoUnmount` instead of manual cleanup. Clear improvement.
- Nit, not blocking: post-click `await flushPromises()` is likely unneeded (`handleSubmit` emits synchronously, `trigger` already awaits a tick; error is computed from load/parent state, not the click). Kept for byte-parity with the batch 17 Workflow twin; fine either way.
- Reuse: verified file is identical to `client/src/components/Workflow/Run/WorkflowSelectPreferredObjectStore.test.ts` (HEAD commit 943eec1a1ef) modulo component, prop name and describe label. Agree no shared factory: two consumers, but factory would hide scenario inputs; duplication mirrors two near-identical production wrappers. `SelectPreferredStore.test.ts` already uses the same async `mountComponent(preferredId)` shape, so pattern is consistent.
- Scope: only the test file modified. No production changes, no process comments.
- Run: `NODE_OPTIONS=--no-webstorage pnpm exec vitest run src/components/Tool/ToolSelectPreferredObjectStore.test.ts` → 3 passed (only pre-existing GCard `v-bind` compile warning).
