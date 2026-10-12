# datasets provider — batch65

Originator commit: `59e2e2b200a467fac2d15cce389977eed8a78010`.

All nine original cases and22 checks remain unchanged, covering recent/latest deduplication and sorting, preview mapping/history subtitle, complete-cache request suppression including collection counts, stale refresh, partial-cache backend merging and cache-only root fan-out. Real dataset/history stores remain under an owned Pinia disposed at test completion. The scoped-search capability is checked once instead of asserting its presence at every call; original scope/query/context inputs remain visible.

The API's HistoryItemSummary union types the mock result list. Canonical history and collection factories replace incomplete cast fixtures, preserving their original identity/name/update-time fields and collection discriminant. This removes the misleading collection-as-HDASummary double cast. The existing narrow loadDatasets mock and recent-items mock remain: these tests observe provider/store caching and request counts, while transport is outside their scope. The partial API mock uses the real module type rather than Record<string,unknown>.

Pristine/final shuffled650101 both pass9cases/22checks. Main V8 covered statement/function/branch-arm locations retain all622 across152files, adding6 from actual owned-store disposal; zero loss. Supplemental coverage includes actual canonical shared UI source imported transitively:43files/37covered locations exactly, zero losses/additions. This is imported module coverage, not a claim to render shared UI. Source test restoration used try/finally.

File ESLint, Prettier and explicit absolute-config repository hooks pass. Driver owns integrated full types. No production/support/shared edits. Existing canonical fixture, native typing and ownership guidance is sufficient; no evidence-backed new guidance gap is proposed. Logs and JSON live under /private/tmp/readability65-datasets-{before,after} with supplemental -ui reports.
