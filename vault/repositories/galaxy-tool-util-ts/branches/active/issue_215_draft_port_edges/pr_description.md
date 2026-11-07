Fix 🎯 #215 - `gxwf draft-next-step` work items now show what feeds a `TODO_*` port and which steps consume it, and `gxwf draft-validate` rejects a `TODO_*` input port that has no source and no default.

Here are the [issue's two drafts](https://github.com/jmchilton/galaxy-tool-util-ts/issues/215), with `draft-next-step`'s `work` array trimmed to its port items. In the first, `TODO_wired` and `TODO_unwired` read the same. In the second, `second` consumes `first/TODO_mid`, and nothing says so:

```diff
  $ gxwf draft-next-step mixed.gxwf.yml
- TODO[in.TODO_wired]: assign the real wrapper input port name (semantic hint: 'wired')
- TODO[in.TODO_unwired]: assign the real wrapper input port name (semantic hint: 'unwired')
+ TODO[in.TODO_wired]: assign the real wrapper input port name (semantic hint: 'wired'; sourced from 'reads')
+ TODO[in.TODO_unwired]: assign the real wrapper input port name (semantic hint: 'unwired'; no source: unwired)
  TODO[out.TODO_output]: assign the real wrapper output port name (semantic hint: 'output'; referenced by workflow output 'result')

  $ gxwf draft-next-step wired.gxwf.yml
- TODO[in.TODO_input]: assign the real wrapper input port name (semantic hint: 'input')
- TODO[out.TODO_mid]: assign the real wrapper output port name (semantic hint: 'mid')
+ TODO[in.TODO_input]: assign the real wrapper input port name (semantic hint: 'input'; sourced from 'reads')
+ TODO[out.TODO_mid]: assign the real wrapper output port name (semantic hint: 'mid'; consumed by 'second/TODO_input')

  $ gxwf draft-validate mixed.gxwf.yml
- draft valid                                                                       (exit 0)
+ only: step input "TODO_unwired" has no source or default; wire the port or remove it   (exit 1)
```

***The producer's work item is the only place in the work list to see a consumer.*** `draft-next-step` offers the first step with work in topological order, so `second` isn't offered until `first` is done. Renaming `TODO_mid` means updating `second`'s ref, and on `main` nothing in the work list says so. In [foundry#668](https://github.com/galaxyproject/foundry/issues/668), a run's brief called a port "still an unbound sentinel" when the draft already wired it to the previous step's output. Of 303 first-offered next-step results on real drafts, 192 now show a `consumed by`.

***`draft-validate` already catches a dangling ref after the rename; this shows the ref before it.***

***Foundry's proposed drafty-source flag isn't here because it would never print.*** On an acyclic draft, a consumer isn't offered while its producer has a `TODO_*` output, and none of those 303 results has an input port sourced from one. So the edge shows up as the producer's `consumed by`. Cycles are the exception, tracked in [gxformat2#288](https://github.com/galaxyproject/gxformat2/issues/288).

***Rejecting unwired ports breaks no draft we could find.*** None of the 14,197 `TODO_*` input ports in 337 draft files from Foundry and its run archive (223 distinct, many of them revisions of the same workflows) is unwired or default-only, and `draft-validate` gives the same verdict on all of them on `main` and on this branch. The [draft format guide](https://github.com/jmchilton/galaxy-tool-util-ts/blob/main/docs/guide/draft-format.md) already says "Only the boxes are incomplete, never the wiring". A port with a default and no source stays valid and prints `no source: default value`. `default: null` counts as no default.

***Only `TODO_*` ports in `GalaxyWorkflowDraft` files are affected.*** Concrete input ports with no source still validate, and `gxwf validate` on a finished workflow doesn't change.

***`no source: unwired` only appears on drafts that `draft-validate` rejects.*** `draft-next-step` doesn't validate, so it still gives a work list for them.

***This changes work item text, not the JSON shape.*** `work` is still an array of strings, and the new text sits inside the existing parenthetical.

***The issue's optional survey count isn't here.*** The issue says the survey "can" count input ports sourced from a drafty output. Foundry's ask was to separate wired from unwired ports, and rejection settles that: on a draft that validates, every `TODO_*` input port is wired or defaulted. A bare count names no port and drives no decision.

***This doesn't close foundry#668.*** It covers part 2. Foundry's format note and `draft-next-step` CLI page still need to describe the new text.

***`consumed by` doesn't list `$link` refs.*** Validation and step ordering don't follow them either. None of the 337 real drafts has `$link` anywhere in a step. A `TODO_*` input port whose only value is `{$link: ...}` counts as unwired, so it passed on `main` and now fails.

<details><summary>How edges resolve</summary>

- In-port items list sources in declared order, in every source shape: a bare ref, a list, and `source:` as a string or list.
- Out-port items list consumers as `<step>/<input>`, deduplicated and code-point sorted.
- Refs resolve against input and step labels, the same set validation uses. A ref to a workflow input labelled `a/out` isn't reported as an edge on step `a`'s `out` port. This also corrects `referenced by workflow output`, which predates this branch and had the same bug.
- Python and TS print identical work items, verdicts and topology errors on 375 real and fixture drafts, covering 51,943 items.

</details>

## Risks

Risks are minimal - this change doesn't lock the project into particular difficult to change choices (a two-way door). Reverting restores the old text and accepts unwired ports again.

<details><summary>Risk Details</summary>

- A draft with a `TODO_*` input port that has no source and no default now fails `draft-validate` with exit 1. No real draft we checked has one, but drafts outside Foundry and its run archive weren't checked.
- Anything matching exact work item strings sees new text. Foundry's docs describe these items in prose and will need updating.

</details>

## Context

Paired with [`issue_215_draft_port_edges` on gxformat2](https://github.com/jmchilton/gxformat2/tree/issue_215_draft_port_edges), which owns the shared fixtures and `next_draft_step.yml` / `validate_draft.yml` expectations and has to merge first. A later sync from gxformat2's `main` would otherwise drop them. Those fixtures are synced here byte for byte. Related to 🎯 galaxyproject/foundry#668, part 2.

## Agentic Checks

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Merged two parallel edge indexes and two renderings of one work item into one of each.</summary>

The refactor leaves output unchanged and removes 9 lines from `draft.py` and 4 from `draft-checks.ts`. Old and new matched in both languages on 375 drafts and 51,943 items.

Not acted on:

- Both files were already over 1,000 lines, and splitting them is a follow-up.
- Step ordering, the survey's output-source check and the extract cascade still resolve refs against step labels only. A contrived draft with an input labelled `a/out` gets a phantom cycle in ordering.
- Validation and the extract cascade define "has a default" differently on `default: null`.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy-tool-util-ts/branches/issue_215_draft_port_edges/thermo_nuclear_review/). Run via Opus 5.5 at high effort.

</details>

### ✅ Second Frontier Model Review

<details><summary>One confirmed bug, fixed: refs to a slash-labelled workflow input showed up as edges on a step port.</summary>

This was a limited pass. Codex's sandbox can't start on this machine, so it reviewed the two diffs and two full source files from its prompt and ran nothing. It reviewed the commits before its own fix and the thermo-nuclear refactor, so it hasn't seen those.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy-tool-util-ts/branches/issue_215_draft_port_edges/codex_review/). Run via gpt-6.1-sol at high effort.

</details>
