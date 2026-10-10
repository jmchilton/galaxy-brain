# Review: ObjectStoreBadges

Approved.

## Case mapping

| Original | Assertions | New form |
| --- | --- | --- |
| `should render all badges in array` | `.object-store-badges` exists; 2 `ObjectStoreBadge`; first has `size="lg"` | `renders every badge at the default lg size when no size is given`: container `exists()` `toBe(true)`; `toEqual` over full list checks count 2, order, each `badge` prop, every `size="lg"` |
| `should pass along size attributes` | container exists; 2 badges; first has `size="2x"` | `passes an explicit size to every badge`: same shape with `"2x"` |

No assertion removed or loosened. The list `toEqual` is strictly tighter: it now checks the `:badge` binding and the size on every badge, not just the first.

## Findings

- **Coverage**: preserved and tightened. The only test-data change is `source: "admin"` on each badge. `BadgeDict` requires it, `ObjectStoreBadge.test.ts` uses it too, and the stubbed child never reads it, so the data means the same thing.
- **Boundaries**: still `shallowMount` of the same component. Nothing new is mocked. `getLocalVue(true)` → `getLocalVue()` is fine because neither the component nor the stubs call `l()`.
- **README**: test names state the behavior and the condition. It has a mount factory, a selector constant, and no stray `async`. The `as object` cast, the shared `let wrapper` and the unused `nth` are gone. `enableAutoUnmount(afterEach)` is not redundant, because `tests/vitest/setup.ts` doesn't unmount. Result reads clearly better.
- **Reuse**: no shared badge factory exists. `tests/test-data/objectStores.ts` only defaults `badges: []`, and the only other badge literals are in `ObjectStoreBadge.test.ts`. Not adding a shared helper is correct. `renderedBadges` is single-file and local.
- **Scope**: only the test file changed. No production edits or process comments.
- **Run**: `NODE_OPTIONS=--no-webstorage pnpm exec vitest run src/components/ObjectStore/ObjectStoreBadges.test.ts` → 2 passed.

No changes requested.
