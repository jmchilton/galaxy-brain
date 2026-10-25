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
- Deeper cause for `__APPLY_RULES__`: Galaxy editor and Python type `type_from_rules` outputs from the rules mapping; TS never ported `RuleSet`. Ported to `workflow-graph` with synced `rules_dsl_spec.yml` and wired into graph builder (`a4c85310`, `187ee082`, docs `ea3a11a2`) on #205.
- Issue repro is miswired: its mapping builds `list:list`, now a real `invalid` vs fastp `paired`; `list:paired` variant gives 3 ok. Correction comment drafted, not posted: [issue_comment_repro.md](../../../branches/active/issue_204_unknown_map_over/issue_comment_repro.md).
