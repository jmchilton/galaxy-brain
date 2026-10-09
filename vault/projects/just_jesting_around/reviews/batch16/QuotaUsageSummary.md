# QuotaUsageSummary

Selected originator: `client/src/components/User/DiskUsage/Quota/QuotaUsageSummary.test.ts`. Baseline and final: **3 tests**.

Tests use short behavioral names and a typed shallow mount with a fresh localized context and automatic unmounting. The standard `toQuotaUsage` conversion remains in every fixture. The exact exposed numeric total assertion is preserved using the component's inferred type, removing the explicit any and stale type TODO. The finite total also checks the rendered `723.3 MB` heading and total-quota wording.

The original quotas `654846535` and `68468436` bytes, their matching usage values, source labels, zero-usage unlimited source, and undefined unlimited quota remain unchanged. The three-bar assertion still counts the original CSS selector and now checks that each QuotaUsageBar receives the corresponding full fixture in order. The all-unlimited case retains both labels, undefined quotas, original usage values, and unlimited heading assertion. Its unnecessary async marker and one-use uppercase fixture name are removed.

Reuse: the existing domain conversion and compact local mount helper suffice. A new quota factory would only obscure these three explicit inputs; no supporting consumers require a new shared abstraction.

Validation: 52 tests pass across the three owned suites in shuffled order (seed `160063`, `NODE_OPTIONS=--no-webstorage`, two workers). Scoped ESLint, Prettier, and whitespace checks pass. A full client typecheck passed after removing the component/output/payload casts; the driver also validates the final batch together.

Guidance: the existing README already covers scenario locality, existing factories, component boundaries, async waits, and cleanup. No new best practice or unresolved marginal advice is proposed.
