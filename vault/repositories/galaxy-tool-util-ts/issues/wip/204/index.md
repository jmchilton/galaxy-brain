# galaxy-tool-util-ts#204 — unknown upstream type collapses map-over

Issue: https://github.com/jmchilton/galaxy-tool-util-ts/issues/204
Branch: `issue_204_unknown_map_over`, worktree `~/projects/worktrees/galaxy-tool-util-ts/branch/issue_204_unknown_map_over/`. Branch record: [index](../../../branches/active/issue_204_unknown_map_over/index.md).

## Triage (2026-10-25)

- Still valid on `origin/main` `539c16c9` (1.14.0): issue repro gives the same `1 ok, 1 invalid, 1 skip`.
- Root cause confirmed: `connection-validator.ts` pushes `null` map-over for `skip` edges, the same as an unmapped `ok` edge. With no map-over, `_resolveOutputTypes` types data outputs as datasets, so collection consumers downstream fail.
- Python twin `connection_validation.py` lives only on Galaxy's unmerged `wf_tool_state` branch; not on `dev`. Fix in TS only.

## Progress (2026-10-25)

- PR [#205](https://github.com/jmchilton/galaxy-tool-util-ts/pull/205) opened from `issue_204_unknown_map_over`.
- Python parity committed to Galaxy `wf_tool_state` (`8bf22007fcd`, on `jmchilton`).
