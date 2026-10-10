# categories

Selected originator: `client/src/components/CommandPalette/providers/categories.test.ts`. Baseline **7 tests** → final **21 tests**.

The two registry checks that looped `expect` inside `forEach` are now `it.each(PALETTE_CATEGORIES)`: "names a registered provider for the $label category" and "gives the $label category a scope to borrow". A failure now names the category. Before, it read "expected [...] to contain undefined" with no hint which entry broke. A local `categoryIds(ctx)` replaces the repeated `availableCategories(ctx).map((category) => category.id)`. Each case separates its arrange/act lines from the assertions.

Preserved: every assertion and context is unchanged. The registered-provider and scope checks run once per category, as the loops did. The actions exclusion, the "All"-first order, the anonymous list `["all", "tools", "navigation"]`, the navigation-disabled case and the workflows/tools-disabled case (including the `histories` survivor) all stay. The 14 extra cases come only from the `it.each` split (8 + 8 replacing 2).

Coverage: unchanged.

Reuse: `makeCtx` from `CommandPalette/test-utils`; no new helper.

Validation: 21 tests pass shuffled (seed `390101`, `NODE_OPTIONS=--no-webstorage`). ESLint (`--max-warnings 0`), Prettier and full `vue-tsc --noEmit` pass.

Guidance: none. The README already recommends `it.each` for combinations.
