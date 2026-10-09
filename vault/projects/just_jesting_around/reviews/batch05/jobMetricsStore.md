# jobMetricsStore review — iteration 05

Selected originator: `client/src/stores/jobMetricsStore.test.ts`.

Baseline and final: 4 cases, 9 assertion statements. Unfetched job/default-HDA/non-HDA reads still return empty arrays; cached job, default-HDA and non-HDA/LDDA lookups each retain length=1 and exact metric equality. Empty-result assertions now check [] directly.

Reuses `setupTestPinia` and relies on the actual empty default cache state. Each cached case populates only its relevant map, removing repeated three-map whole-state replacements. Preserves the deliberately non-hda discriminator: the getter's existing fallback routing is covered exactly rather than silently changing it to a narrower valid discriminator. The short metric payload remains visible and unmutated.

Reuse search found no same domain setup that warrants a shared factory; an inexpensive five-field metric object is clearer inline. The suite is already small and scenario-specific, so no parameterization or helper quota was imposed. No supporting migrations or additional guidance.

Validation: all 4 cases pass in the affected 11-suite/63-case run; scoped ESLint passes. Root performs final combined checks and type checking.
