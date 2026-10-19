# pr_24222_review_0

Branch `pr_24222_review_0` sits on reviewed head `8e75e467e47`. It makes picker-built tag clauses with quote characters round-trip through the inline parser, shares the favorite-toggle in-flight guard across components, and splits the curated-tag visibility unit test into one test per case. Each commit has a test that was run and passes. The tag-picker E2E test and API-level hidden-tool coverage are not included.

- `262d469a70e` Quote picker tag clauses containing quotes so they round-trip: wraps values containing `'` or whitespace in `"..."` and values containing `"` in `'...'`, and adds a `ToolsList.test.ts` case.
- `4292c2ab4af` Share favorite toggle in-flight guard across consumers: hoists `pending` in `useFavoriteObjects` to module scope, and adds `useFavoriteObjects.test.ts`.
- `fea07df3134` Split curated tool tag visibility unit test by case: separates the access and hidden cases and drops the `del allow_user_access` reset.
