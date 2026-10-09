# ChangesetSummaryTable review

Selected originator: `lib/tool_shed/webapp/frontend/src/components/MetadataInspector/ChangesetSummaryTable.test.ts`.

Split the four comparison-result/label inputs into named cases, preserving exactly the original `initial`/null/First revision, `not equal and not subset`/updated/Modified, `equal`/null/Unchanged, and `subset`/null/Expanded combinations. Table input field types derive from the generated `ChangesetMetadataStatus` through `Pick`, preserving the record-operation union without a cast.

Assertions now find the actual comparison, snapshot, and error cells for null values. This prevents a dash elsewhere in the table satisfying the comparison/snapshot cases. Friendly labels are asserted exactly in their own result cell. The empty-data case still requires a rendered table and additionally verifies zero body rows; the null-error case still excludes `null` text and now asserts an empty error cell.

All other original contracts remain: real fixture revisions and headers, created/updated badge text/classes, two header tooltip relationships and explanations, native per-row title/focus behavior, named header help icons, check/xmark alternatives, explicit parse-error text, and seven-character hash truncation. Automatic unmount replaces an unused mock reset.

Reuse: existing real API fixtures and `makeChangeset`. Full mounting is retained because the real GTable slots and GTooltip accessibility relationships are under test; the existing JSON viewer stub serves an unrelated component boundary. No new helper/supporting edits.

Cases: 18 → 21. Native Tool Shed scoped run passes 21 cases; final shuffled run, full native typecheck, current ESLint, and Prettier are recorded with the iteration validation. Dependency links were not modified.

Guidance: existing descriptive tables, domain factories, cleanup, and explicit mount-boundary guidance cover the changes. No README/marginal addition proposed.
