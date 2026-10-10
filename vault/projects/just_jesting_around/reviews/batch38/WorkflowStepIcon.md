# WorkflowStepIcon

Selected originator: `client/src/components/WorkflowInvocationState/WorkflowStepIcon.test.ts`. Baseline and final: **7 tests**.

The table-driven test was already readable. The `as object` cast and the legacy `propsData` option are gone: the table is `as const`, so `stepType` type-checks against the component's prop union with `props`.

Preserved: each of the seven step types still draws its icon, asserted by the `data-icon` attribute, and the case names are unchanged.

Strengthened: the component rotates only the subworkflow icon by 270°, which nothing asserted. A `rotated` column now checks `fa-rotate-270` on every row, so subworkflow must carry it and the others must not. Flipping the subworkflow row to `false` fails that case.

Reuse: nothing to reuse; no helper.

Validation: 7 tests pass, shuffled (seed `380101`). ESLint, Prettier and full client `vue-tsc --noEmit` pass. Per-file coverage against the baseline: no loss.

Guidance: none.
