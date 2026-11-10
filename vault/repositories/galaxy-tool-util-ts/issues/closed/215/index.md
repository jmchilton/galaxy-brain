# galaxy-tool-util-ts#215 — `draft-next-step` work items omit the edges around `TODO_*` ports

Issue: https://github.com/jmchilton/galaxy-tool-util-ts/issues/215
Closed 2026-11-09 by #217 merging.
Downstream: galaxyproject/foundry#668 (part 2), galaxyproject/foundry#654 (correction 4).

## Triage (2026-11-06)

- Claimed by workflow_libs workhorse. No open PR or branch addressed it.
- Root cause confirmed: `stepWorkItems` / `_step_work_items` discard the input value and index only workflow outputs. The strings and expectations originate in gxformat2, so this is a paired change.

PRs: [#217](https://github.com/jmchilton/galaxy-tool-util-ts/pull/217), [galaxyproject/gxformat2#289](https://github.com/galaxyproject/gxformat2/pull/289), which merges first.

Branches: [TS](../../../branches/merged/issue_215_draft_port_edges/index.md), [gxformat2](../../../../gxformat2/branches/merged/issue_215_draft_port_edges/index.md). See the [implementation debrief](../../../branches/merged/issue_215_draft_port_edges/implementation_debrief.md) for whether this is a good idea.
