# DatasetIndex — batch 62 author review

Originator: `client/src/components/Dataset/DatasetIndex/DatasetIndex.test.ts`.

All seven original scenarios and 18 original checks remain; two table-prop assertions raise the final count to 20. Cases retain table presence/configuration, non-composite/file/not-found errors with table absence, subdirectory rendering, and the final error-container checks. All original expected values and HTML checks remain. Table lookup now targets the actual GTable component rather than a generated ID or assumed stub tag.

The mock function's signature is inferred from the real composable. mockImplementation creates its correctly typed computed function during component setup, so wrapper teardown owns the computed scope. Native props/global mount options remove object/any casts. Auto-unmount precedes resetting the owned function/composable mocks. No production or shared helper edit.

The column case now checks the stubbed child's exact Path/Type sortable-field contract; the subdirectory case checks exact child items with parent prefixes removed. Named component lookup avoids VTU's never-key inference for an imported generic Vue component while preserving the actual child boundary without a cast.

An independent-seed run exposed the preexisting generated-ID assumption: the pristine valid-content case fails at #g-table-0 with seed 620201 when another table is rendered first. Named lookup preserves the table-presence/fields contract and makes the final seven cases pass both 620101 and 620201. Existing gtable-stub absence lookups also now target the actual component rather than an assumed tag.

Bounded mutation: replaced only parent-prefix removal with an identity assignment. The original seven-case suite passes with its baseline seed 620101; the final suite fails only the new exact child-item assertion. Source and test are restored in finally, and the restored final suite passes all seven with seed 620201. Logs are `/private/tmp/readability62-index-mutant-{original,final}-620101.log` and `/private/tmp/readability62-index-restored.log`. No mutation is committed and the production diff is empty.

Pristine/final V8 coverage matches exactly: 31 files/91 covered statement/function/branch-arm locations, zero lost or added. This intentionally shallow suite checks GTable's public props rather than rendering shared UI children; no external-UI comparison is needed. Final file ESLint/Prettier and explicit absolute-config hooks pass. Final full client types are checked after correcting generic-component lookup. Evidence is `/private/tmp/readability62-index-*`.

No README or marginal advice change proposed. Existing explicit scenario/ownership guidance is sufficient; the generated-ID finding is recorded as a concrete repaired test issue rather than broad new advice.
