# galaxy-tool-util-ts#210 — `validate-tests --workflow` ignores collection shape and datatype

Issue: https://github.com/jmchilton/galaxy-tool-util-ts/issues/210
Downstream: [galaxyproject/foundry#731](https://github.com/galaxyproject/foundry/issues/731)

[Plan](plan.md) · [Galaxy datatype research](research_galaxy_datatypes.md) · [TS consumer research](research_ts_consumers.md)

Branches (stacked): [`issue_210_datatypes_snapshot`](../../../branches/active/issue_210_datatypes_snapshot/index.md) (Phase A) → [`issue_210_test_kind_checks`](../../../branches/active/issue_210_test_kind_checks/index.md) (Phase B, asks 1+2; [verification](../../../branches/active/issue_210_test_kind_checks/verification.md)). Ask 3 (output `ftype`) deferred.

## Triage (2026-10-27)

- Claimed by workflow_libs workhorse; base `origin/main` `a0476900`.
- Confirmed on main: `checkTestsAgainstWorkflow` (`packages/schema/src/test-format/cross-check/check.ts`) checks only labels, required inputs, JS value type.
- `@galaxy-tool-util/workflow-graph` (Tier 1 of `vault/projects/workflow_state/TS_CONNECTION_REFACTOR_IN_GX_PLAN.md`) already landed: `DatatypesMapperModel`, `producesAcceptableDatatype`, collection-type algebra. Datatype mapping JSON exists only as a test fixture; `connection-validation` ignores datatypes.
- John's direction: a package mirroring how Galaxy reasons about datatypes, with Galaxy's datatype API responses embedded as a periodically refreshed snapshot. Galaxy reads the API, we read disk, shared abstractions; prepare for upstreaming.
