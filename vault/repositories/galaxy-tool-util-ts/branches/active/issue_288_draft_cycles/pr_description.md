Fix 🎯 galaxyproject/gxformat2#288 - `gxwf draft-validate` now rejects draft steps that depend on each other through a cycle, including a step that sources its own output.

On the issue's draft, where `a` reads `b/out` and `b` reads `a/out`:

```diff
  $ gxwf draft-validate cycle.gxwf.yml
- draft valid                                                                     (exit 0)
+ 1 error
+ Topology errors (1):
+   <workflow>: steps "a", "b" depend on each other through a cycle               (exit 1)
```

***A cyclic draft can never become a runnable workflow.*** Galaxy refuses to run a workflow whose steps form a cycle ("Workflow cannot be run because it contains cycles"), and a step that sources its own output can never get its input. Today a cyclic draft passes `draft-validate` and only fails once it reaches Galaxy.

***`draft-next-step` already counted on this check.*** When `topoOrderedSteps` hits a cycle, it drains the remaining steps alphabetically, and its comment says `validateDraft` surfaces the error. Nothing did. Its graph also dropped self-edges, so a step sourcing its own output never registered as a dependency at all. One step graph now backs both ordering and the new check.

***This removes the guide's "cycles aside" caveat.*** The [draft format guide](https://github.com/jmchilton/galaxy-tool-util-ts/blob/main/docs/guide/draft-format.md) says a step isn't offered while a step feeding it still has work, "cycles aside". On a draft `validateDraft` accepts, there are now no exceptions. The guide and the schema package docs list the new rule.

***Each error names the steps that depend on each other, not the steps downstream of them.*** When two cycles share a step, all three steps come back as one group, and the message says they depend on each other rather than claiming one edge would fix it.

***Only drafts are checked.*** `gxwf validate` and the other non-draft commands don't run this check; only `draft-validate` calls `validateDraft`.

***Rejecting cycles breaks no draft we could find.*** None of the 240 draft files from Foundry, its worktrees and the foundry-paper run archive has a cycle.

***Python and TypeScript agree.*** The fixtures and expectations are synced from the paired gxformat2 branch. Verdicts, topology errors and `draft-next-step` results are identical in both languages on 209 real drafts and every draft fixture. PyYAML can't load the other 31 files, which redefine a YAML anchor.

***Nested drafts are checked at every level.*** A cycle inside a draft subworkflow is reported at that subworkflow's path. A cycle through a subworkflow step is reported at the outer level.

***Step order resolves refs the way validation does now.*** `topoOrderedSteps` used to resolve refs against step labels only, and it now matches `checkEdgeRef`. So a workflow input labelled `y/out` no longer counts as step `y`'s port when ordering steps; a synced case pins that. `draft-next-step` output is unchanged on every other fixture and on the 209 real drafts both languages load. On a cyclic draft it still offers a step, and new cases pin that too.

***This adds `topologyErrors` entries, not fields.*** The report shape is the same, so gxwf-web needs no OpenAPI regeneration.

<details><summary>How cycles are found</summary>

- `stepDependencies` maps each step to the steps its inputs source from, in every source shape. Self-edges are kept. `topoOrderedSteps` strips them.
- `stepCycles` groups steps by mutual reachability. A group of one is a self-loop: `step "self" sources its own output`.
- Labels inside a message are code-point sorted, and groups are ordered by their first label. One error per group goes at the workflow's path.
- A ref to a known step counts as an edge even when its port isn't declared. The unknown port is still reported on its own, and a fixture case asserts both.
- Not covered, as before: `$link` refs aren't followed, and duplicate list-form step labels keep only the last step, which can hide a cycle.

</details>

## Risks

Risks are minimal - this change doesn't lock the project into particular difficult to change choices (a two-way door). Reverting accepts cyclic drafts again.

<details><summary>Risk Details</summary>

- A draft with a step cycle now fails `gxwf draft-validate` with exit 1. None of the real drafts we checked has one, but drafts outside Foundry and its run archive weren't checked.
- Anything that matches the exact topology error list on a cyclic draft sees new entries.

</details>

## Context

Port of 🔀 [galaxyproject/gxformat2#294](https://github.com/galaxyproject/gxformat2/pull/294), which owns the shared fixtures and expectations and merges first. Builds on 🔀 #217, which left cycles to gxformat2#288.

## Agentic Checks

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Approve: no structural regressions; three behavior-neutral cleanups.</summary>

- Dropped an `inDegree` map from `topoOrderedSteps` that always equalled the dep-set sizes.
- Moved the step-graph helpers into their own section and the cycle wording out of the validation walk.
- Removed a fallback that could never run.

Not acted on: a single resolved-edge index per workflow level, which restructures code that predates this branch. `draft-checks.ts` was already over 1,700 lines.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy-tool-util-ts/branches/issue_288_draft_cycles/thermo_nuclear_review/). Run via Claude Opus 5.5 at default effort.

</details>

### ✅ Second Frontier Model Review

<details><summary>One confirmed issue, fixed in both languages: two cycles sharing a step got advice that one edge would break them.</summary>

The TypeScript session found nothing, but its sandbox couldn't run Vitest. The finding came from the paired Python review and applies to the shared logic. The message now says the steps depend on each other through a cycle, and a shared-step case was added. It reviewed `59565c31`, so it hasn't seen the rewording, the thermo-nuclear cleanups or the later test cases.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy-tool-util-ts/branches/issue_288_draft_cycles/codex_review/). Run via gpt-6-sol at medium effort.

</details>
