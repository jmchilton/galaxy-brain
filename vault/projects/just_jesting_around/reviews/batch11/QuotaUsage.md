# Iteration11: QuotaUsage

Originator: `client/src/components/User/DiskUsage/Quota/model/QuotaUsage.test.ts`.

Moved toQuotaUsage calls into their scenarios instead of converting shared fixtures while registering the suite. Named source-label and limited/unlimited variants as it.each rows. Unlimited formatting remains its own focused behavior.

Preserved all three raw fixtures, undefined default label semantics, named-source label, unlimited niceQuota and both true/false isUnlimited values; the original combined status case becomes two independently named cases.

Reuse: the three short typed quota fixtures remain local. Other quota UI fixtures carry richer endpoint/display setup and would hide the few relevant inputs here. Current readable-scenarios guidance covers this transformation; no additional best practice proposed.

Validation: baseline 4 passed cases; final 5 passed cases in shuffled order (seed110047). The six-originator run increased from50 to74 passed cases with no skips/failures. Reports: `/private/tmp/jest_readability_batch11_components_baseline.json` and `/private/tmp/jest_readability_batch11_components_final.json`. Scoped ESLint and Prettier run on all six owned files; root driver supplies final aggregate typecheck evidence.

Supporting source files: none. Shared factories/helpers changed: none. README/inventory/Git changes: none by this reviewer.
