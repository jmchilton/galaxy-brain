Implement 🎯 jmchilton/galaxy-tool-util-ts#215 - `next_draft_step` work items now show what feeds a `TODO_*` port and which steps consume it, and `validate_draft` rejects a `TODO_*` input port that has no source and no default.

Here is a draft where `second` consumes `first/TODO_mid`, with `next_draft_step`'s `work` list trimmed to its port items:

```diff
- TODO[in.TODO_input]: assign the real wrapper input port name (semantic hint: 'input')
- TODO[out.TODO_mid]: assign the real wrapper output port name (semantic hint: 'mid')
+ TODO[in.TODO_input]: assign the real wrapper input port name (semantic hint: 'input'; sourced from 'reads')
+ TODO[out.TODO_mid]: assign the real wrapper output port name (semantic hint: 'mid'; consumed by 'second/TODO_input')
```

***gxformat2 changes first because it owns the shared expectations.*** Foundry's agent loop acts on these items through `gxwf`, which syncs them from here. In [foundry#668](https://github.com/galaxyproject/foundry/issues/668), a run's brief called a wired port unbound.

***The producer's work item is the only place in the work list to see a consumer.*** `next_draft_step` offers the first step with work in topological order, so `second` isn't offered until `first` is done. Renaming `TODO_mid` means updating `second`'s ref, and nothing in the work list says so today. Of 303 first-offered next-step results on real drafts, 192 now show a `consumed by`.

***`validate_draft` already catches a dangling ref after the rename; this shows the ref before it.***

***Rejecting unwired ports breaks no draft we could find.*** None of the 14,197 `TODO_*` input ports in 337 draft files from Foundry and its run archive (223 distinct, many of them revisions of the same workflows) is unwired or default-only. A port with a default and no source stays valid and prints `no source: default value`. `default: null` counts as no default. `TODO_x: {}` now gets a topology error: `step input "TODO_x" has no source or default; wire the port or remove it`.

***Only `TODO_*` ports in `GalaxyWorkflowDraft` files are affected.*** Concrete input ports with no source still validate.

***`no source: unwired` only appears on drafts that `validate_draft` rejects.*** `next_draft_step` doesn't validate, so it still gives a work list for them.

***This changes work item text, not the model.*** `NextStepResult.work` is still a list of strings, and the new text sits inside the existing parenthetical.

***`consumed by` doesn't list `$link` refs.*** Validation and step ordering don't follow them either. None of the 337 real drafts has `$link` anywhere in a step. A `TODO_*` input port whose only value is `{$link: ...}` counts as unwired, so it now fails.

<details><summary>How edges resolve</summary>

- In-port items list sources in declared order, in every source shape: a bare ref, a list, and `source:` as a string or list.
- Out-port items list consumers as `<step>/<input>`, deduplicated and code-point sorted.
- Refs resolve against input and step labels, the same set validation uses. A ref to a workflow input labelled `a/out` isn't reported as an edge on step `a`'s `out` port. This also corrects `referenced by workflow output`, which had the same bug before this branch.
- Python and TypeScript print identical work items, verdicts and topology errors on 375 real and fixture drafts, covering 51,943 items.

</details>

## Risks

Risks are minimal - this change doesn't lock the project into particular difficult to change choices (a two-way door). Reverting restores the old text and accepts unwired ports again.

<details><summary>Risk Details</summary>

- A draft with a `TODO_*` input port that has no source and no default now fails `validate_draft`. No real draft we checked has one, but drafts outside Foundry and its run archive weren't checked.
- Anything matching exact work item strings sees new text.

</details>

## Context

Paired with [`issue_215_draft_port_edges` on galaxy-tool-util-ts](https://github.com/jmchilton/galaxy-tool-util-ts/tree/issue_215_draft_port_edges), which syncs the fixtures and expectations added here, so this merges first. The issue explains the wider motivation.

## Agentic Checks

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Merged two parallel edge indexes and two renderings of one work item into one of each.</summary>

The refactor leaves output unchanged and removes 9 lines from `draft.py`. Old and new matched in both languages on 375 drafts and 51,943 items. Not acted on: `draft.py` was already over 1,000 lines, and step ordering, the survey's output-source check and the extract cascade still resolve refs against step labels only.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy-tool-util-ts/branches/issue_215_draft_port_edges/thermo_nuclear_review/). Run via Opus 5.5 at high effort.

</details>

### ✅ Second Frontier Model Review

<details><summary>One confirmed bug, fixed: refs to a slash-labelled workflow input showed up as edges on a step port.</summary>

This was a limited pass. Codex's sandbox can't start on this machine, so it reviewed the two diffs and two full source files from its prompt and ran nothing. It reviewed the commits before its own fix and the thermo-nuclear refactor, so it hasn't seen those.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy-tool-util-ts/branches/issue_215_draft_port_edges/codex_review/). Run via gpt-6.1-sol at high effort.

</details>
