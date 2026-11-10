Fix 🎯 #288 - `validate_draft` now rejects draft steps that depend on each other through a cycle, including a step that sources its own output.

On the issue's draft, where `a` reads `b/out` and `b` reads `a/out`:

```diff
  >>> validate_draft(doc)
- ok=True  topology_errors=[]
+ ok=False topology_errors=[DraftValidationDiagnostic(path=[], message='steps "a", "b" depend on each other through a cycle')]
```

***A cyclic draft can never become a runnable workflow.*** Galaxy refuses to run a workflow whose steps form a cycle ("Workflow cannot be run because it contains cycles"), and a step that sources its own output can never get its input. Today a cyclic draft passes `validate_draft` and only fails once it reaches Galaxy.

***`next_draft_step` already counted on this check.*** When `_topo_ordered_steps` hits a cycle, it drains the remaining steps alphabetically, and its comment says "validate_draft reports the underlying problem". Nothing did. Its graph also dropped self-edges, so a step sourcing its own output never registered as a dependency at all. One step graph now backs both ordering and the new check.

***Each error names the steps that depend on each other, not the steps downstream of them.*** A step that only consumes `b/out` isn't listed. When two cycles share a step (`a`↔`b`, `b`↔`c`), all three come back as one group, and the message says they depend on each other rather than claiming one edge would fix it.

***Only drafts are checked.*** `validate_draft` rejects a non-draft before any topology check, so `GalaxyWorkflow` documents, including the layout tests' cyclic `format2/synthetic-cycle.gxwf.yml`, are unaffected.

***Rejecting cycles breaks no draft we could find.*** None of the 240 draft files from Foundry, its worktrees and the foundry-paper run archive has a cycle. On the 209 that PyYAML loads (the rest redefine a YAML anchor), `validate_draft` gives the same verdict on `main` and on this branch.

***Step order resolves refs the way validation does now.*** `_topo_ordered_steps` used to resolve refs against step labels only. It now uses the shared graph, which matches `check_edge_ref` (input and step labels, steps win on a shared label). So a workflow input labelled `y/out` no longer counts as step `y`'s port when ordering steps; a new case pins that. `next_draft_step` output is unchanged on every other fixture and on all 209 real drafts.

***Nested drafts are checked at every level.*** A cycle inside a draft subworkflow is reported at that subworkflow's path. A cycle that runs through a subworkflow step is a cycle between outer steps, so it's reported at the outer level.

***`next_draft_step` still answers on a cyclic draft.*** It doesn't validate, so it keeps offering a step: the first ready one, or the alphabetically first when every step is on a cycle. New cases pin both.

<details><summary>How cycles are found</summary>

- `_step_dependencies` maps each step to the steps its inputs source from, in every source shape: a bare ref, a list, `source:` as a string or a list, and the bare step shorthand (`q` meaning `q/output`). Self-edges are kept. `_topo_ordered_steps` strips them.
- `_step_cycles` groups steps by mutual reachability. A group of one is a self-loop: `step "self" sources its own output`.
- Labels inside a message are code-point sorted, and groups are ordered by their first label. One error per group goes at the workflow's path, after the output checks and before the step checks.
- A ref to a known step counts as an edge even when its port isn't declared. The unknown port is still reported on its own, and a fixture case asserts both.
- List-form steps use the same keys as elsewhere in `draft.py`, including the index-plus-inputs-offset key of an unlabeled step.
- Not covered, as before: `$link` refs aren't followed, and duplicate list-form step labels keep only the last step, which can hide a cycle.

</details>

## Risks

Risks are minimal - this change doesn't lock the project into particular difficult to change choices (a two-way door). Reverting accepts cyclic drafts again.

<details><summary>Risk Details</summary>

- A draft with a step cycle now fails `validate_draft`. None of the real drafts we checked has one, but drafts outside Foundry and its run archive weren't checked.
- Anything that matches the exact topology error list on a cyclic draft sees new entries.

</details>

## Context

Builds on 🔀 #289; its TypeScript pair, jmchilton/galaxy-tool-util-ts#217, left cycles to this issue. Nothing else in gxformat2 calls `validate_draft`, and gxwf-web and the VS Code extension don't use it. Paired with 🔀 [jmchilton/galaxy-tool-util-ts#228](https://github.com/jmchilton/galaxy-tool-util-ts/pull/228), which syncs the fixtures and expectations added here and ports the check, so this merges first. Python and TypeScript give identical verdicts, topology errors and `next_draft_step` results on the 209 real drafts both load and on every draft fixture.

## Agentic Checks

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Approve: no structural regressions; three behavior-neutral cleanups.</summary>

The step-graph helpers moved into their own section, the cycle wording moved out of the validation walk into `_cycle_diagnostics`, and a fallback that could never run was removed. Not acted on: a single resolved-edge index per workflow level. Validation and `next_draft_step` resolve the same refs separately, and unifying them restructures code that predates this branch. `draft.py` was already over 1,000 lines.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy-tool-util-ts/branches/issue_288_draft_cycles/thermo_nuclear_review/). Run via Claude Opus 5.5 at default effort.

</details>

### ✅ Second Frontier Model Review

<details><summary>One confirmed issue, fixed: two cycles sharing a step got advice that one edge would break them.</summary>

The groups are mutually reachable sets, and such a set can hold more than one cycle. Listing every simple cycle can blow up combinatorially, so the message now says the steps depend on each other through a cycle. A shared-step case was added. The paired TypeScript review found nothing further. It reviewed `021fd1b`, so it hasn't seen the rewording, the thermo-nuclear cleanups or the later test cases.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy-tool-util-ts/branches/issue_288_draft_cycles/codex_review/). Run via gpt-6-sol at medium effort.

</details>
