# Review: WorkflowSelectPreferredObjectStore.test.ts

Approved.

## Coverage map

| Original assertion (single case "update preferred object store on selection") | New location |
| --- | --- |
| 3 option cards rendered | "lists the Galaxy default option…" — `toHaveLength(3)` |
| `__null__` default card exists | same test — `.exists()).toBe(true)` |
| `object_store_1` select button exists | `it.each` row 1 — `selectButton.exists()` |
| click, then no `.object-store-selection-error` | `it.each` row 1 (kept in the selection case) |
| `emitted("updated")?.[0]?.[1]` falsy | `it.each` row 1 — `toEqual([["object_store_1"]])` (stronger) |
| — (new) | `it.each` row 2: `object_store_1` preferred, select `__null__`, emits `[[null]]` |

## Findings

- **Coverage**: nothing dropped. The old final assertion was vacuous. The wrapper's `updated` emit has one argument (`id`), so `[0][1]` was always undefined, and the optional chain also passed when nothing was emitted. The exact `toEqual` covers the old claim and also proves the event fired with the right ID.
- **New row is real behavior**: `SourceOptionCard` hides the select action when `selected` (`visible: !props.selected`), so the `__null__` button only exists if the preferred prop reaches `SelectObjectStore`. The `__null__` → `null` mapping is real `SelectObjectStore.handleSubmit` logic.
- **Boundaries**: same full `mount`, same `setupSelectableMock` request mock, same `setupMockConfig`. Nothing new is stubbed. `getLocalVue(true)` now runs per mount, so each test gets a fresh real pinia and object-store load. That gives better isolation and doesn't change what is exercised. `mount` over `shallowMount` is justified: every assertion depends on the child card tree.
- **Readability/README**: async mount factory with `flushPromises` and selector constants (both README patterns). `it.each` follows the README. Dropping the `as object` cast is fine (vue-tsc is checked by the driver). `enableAutoUnmount(afterEach)` is not redundant: `tests/vitest/setup.ts` doesn't unmount. Nothing is left over: no unused handlers and no extra flushes. Each remaining `flushPromises` covers the mount load or the click. The it.each title reads "…while null is preferred" for row 1. That is slightly awkward but accurate, so not a change request.
- **Reuse**: adopts the existing `setupSelectableMock`, `setupMockConfig`, navigation selectors and `getLocalVue`. No new shared helper, which is correct. The Tool twin (`ToolSelectPreferredObjectStore.test.ts`) has the same vacuous `[0][1]` assertion. It is a fair follow-up and isn't in scope here.
- **Scope**: one test file changed. No production edits. No process comments.
- **Run**: `NODE_OPTIONS=--no-webstorage pnpm exec vitest run src/components/Workflow/Run/WorkflowSelectPreferredObjectStore.test.ts`: 3 passed.
