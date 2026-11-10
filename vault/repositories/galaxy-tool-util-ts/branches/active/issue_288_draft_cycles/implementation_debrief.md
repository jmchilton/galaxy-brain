# Implementation debrief

Paired with [the gxformat2 branch](../../../../gxformat2/branches/active/issue_288_draft_cycles/index.md), which owns the shared fixture and expectations and lands first.

## Root cause

Confirmed as the issue states. `_walk_draft_validation` / `walkDraftValidation` have no cycle check, while `_topo_ordered_steps` / `topoOrderedSteps` drain a cycle alphabetically on the assumption that validation reports it. The topo graph also dropped self-edges, so a step sourcing its own output never registered as a dependency at all.

## What changed (both languages, same shape)

- `_step_dependencies` / `stepDependencies`: one step graph, self-edges kept. Refs resolve against input and step labels, as `check_edge_ref` does (steps win on a shared label), not against step labels only as topo did.
- `_step_cycles` / `stepCycles`: steps on each cycle via mutual reachability, so steps downstream of a cycle aren't named. Members are code-point sorted; cycles are ordered by first member.
- Validation emits one topology error per cycle at the workflow level (`path` = that workflow's prefix). The existing recursion covers nested draft subworkflows. A cycle "through" a subworkflow is a cycle between outer steps, so the outer level reports it.
- Messages: `steps "a", "b" form a cycle; break one of its edges` and `step "self" sources its own output; break that edge`.
- Topo order now uses the shared graph minus self-edges, and stays total on invalid drafts.
- An edge to a known step counts whether or not the port is declared. A dangling-port ref that also closes a cycle gets both diagnostics.
- TS: guide drops "cycles aside" (now "on a draft `validateDraft` accepts"), and the topology-rule lists in `draft-format.md` and `packages/schema.md` mention cycles. A patch changeset covers `schema` and `cli`.

## Verification

- Red first: `test_validate_draft_rejects_step_cycles` failed on both bases (`ok: true`), green after.
- The fixture covers: the issue's 2-cycle; a 3-cycle through a list source, a `source:` mapping and a bare step ref; a self-loop; a nested-draft cycle whose labels sort differently by code point (`"Y", "x"`); and a downstream step that must not be named. Exact count and exact messages.
- Real data: 248 draft files (149 distinct) from the Foundry clones, worktrees and foundry-paper, plus all draft fixtures. On those, the only `validate_draft` verdict change on Python main vs branch is the new fixture. `next_draft_step` output and topo order are unchanged everywhere, so the label-resolution alignment changed nothing observable. No real draft has a cycle (TS also checked 31 more files PyYAML can't load due to duplicate anchors).
- Parity: Python and TS give identical `ok`, `topology_errors` and `next_draft_step` on all 248 shared files.
- `extract_draft_subset` terminates on the cycle fixture (drops all 9 steps).
- gxformat2 gate: ruff, flake8, black, isort, mypy, pyrefly, flake8-docstrings, full pytest (958 passed). TS: `make check`, `make test` green across all packages.
- `gxwf draft-validate` on the fixture exits 1 and lists the four cycles.

## Not changed

- Result shape is unchanged (only new `topology_errors` entries), so gxwf-web needs no OpenAPI regen.
- `$link` refs are still not followed, as in validation and ordering (215 follow-up).
- Sync again pulled `test_extra_field_output_*` / `synthetic-extra-field-output.gxwf.yml`; reverted, same unrelated gap 215 noted.
