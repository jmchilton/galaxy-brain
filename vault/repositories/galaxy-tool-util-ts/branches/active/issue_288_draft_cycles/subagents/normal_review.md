# Normal review debrief

Run via Claude Opus 5.5 at default effort. It reviewed both branches together.

The verdict was approve with nits: no P1/P2, and Python and TS agreed on 11 probe drafts. I acted on P3 2, P3 4 and P3 5. In both repos (gxformat2 `021fd1b`, TS `59565c31`):
- Added cycle cases for a slash label, a cycle through a subworkflow step, and list-form steps with an unlabeled index key.
- Added a shared `_source_labels` / `sourceLabels` helper.
- Bumped the changeset to `minor`, matching the earlier unwired-port rejection.

Not acted on:

- **P3 1: refs resolve two ways across draft operations.** Pre-existing. `_walk_draft_steps`, extract's cascade and `_trim_outputs` still resolve via `_split_source_ref` with step labels only, so an input labelled `a/x` shadowing step `a` is handled differently by validate and by extract. This branch narrows the gap (topo moved over). Follow-up.
- **P3 3: duplicate list-form step labels hide a cycle** (and hide the shadowed step from `next_draft_step`). Pre-existing. The fix is a duplicate-label topology error, not a deps union. Follow-up.
- **P3 6: reuse.** Informational. No existing helper fits: TS `connection-validation/topsort.ts` can't be imported from `schema` (wrong dependency direction), and gxformat2 `layout/_sugiyama` works on cytoscape elements and uses a different tie-break. `_step_cycles` is generic and could later name cycle members in `LayoutCycleError`.

<details><summary>Full review</summary>

**Verdict: approve with nits.** I found no correctness bugs, and the Python and TS code agree line by line, including on the edge cases I probed. Everything below is P3. There are no P1 or P2 findings.

## Probes run (Python vs TS, both branches)

I ran 11 scratch drafts through `validate_draft`/`validateDraft` and `next_draft_step`/`nextDraftStep`, plus one shadowing case through extract as well. Output was identical in the two languages every time:
- **List-form steps with no labels:** keys come out as `"1"`/`"2"` once the inputs offset is applied.
- **List-form steps with labels:** detected.
- **Slash labels** (`a` and `a/b`): detected.
- **Cycle through a subworkflow step** (`t` → `sub` → `t`): detected at the outer level.
- **Non-dict step:** no crash.
- **Undeclared port inside a cycle:** reported as both the cycle and the unknown port.
- **Input and step sharing a label `s`** with `in: x: s`: reported as a self-cycle. That matches the "steps win" rule in `check_edge_ref`.
- **Code-point ordering** (`B` < `m` < `z` < `é`): same in both.
- **Cycle inside an embedded concrete `GalaxyWorkflow`:** not reported. That is consistent with every other draft topology check, which only recurses into drafts.

## Findings

- **P3 1: refs resolve two different ways across draft operations.**
  - Validation, port edges, topo and cycles now resolve refs against input and step labels.
  - These still go through `_split_source_ref`/`splitSourceRef`, which only know step labels:
    - Python: `_walk_draft_steps` (:393), `_check_step_cascade` (:962), `_ref_is_dead` (:986), `_trim_outputs` (:1105).
    - TS: `walkDraftSteps`, `checkStepCascade`, `refIsDead`.
  - Reproduced in both languages with input `a/x` and step `a`: `validate_draft` treats `a/x` as the input, while `extract_draft_subset` drops `b` as a cascade of `a`.
  - Nothing tests the topo resolution change. Follow-up plus a shadow fixture.
- **P3 2: tests miss the riskiest parity paths.** Cycle through a subworkflow step, list-form steps (including an unlabeled index key), and a slash-label cycle.
- **P3 3: duplicate list-form step labels hide a cycle.** `deps[label] = step_deps` keeps only the last step with a label. Follow-up: make duplicate step labels a topology error; don't union deps.
- **P3 4: the known-source-labels set is built three times per language.** Fix: a `_source_labels` helper.
- **P3 5: the changeset bump should be `minor`.** The prior `draft-next-step-port-edges` changeset used `minor` for a new rejection.
- **P3 6 (optional): reuse.** No existing helper fits (dependency direction in TS, tie-break and input model in Python's layout). `_step_cycles` is the reusable piece.

## Design choices evaluated (all fine)

- Shared graph with self-edges kept and stripped by topo: equivalent to the old filter, and it removes duplicated code.
- Refs resolve against input and step labels, consistent with `check_edge_ref`.
- Mutual reachability instead of Tarjan: negligible cost at draft sizes, and deterministic.
- One error per cycle per level, at the workflow prefix, sorted, emitted after outputs and before steps in both languages.
- An edge to a known step counts even with an undeclared port; the unknown port is still reported separately.
- Topo drain comment is now accurate.

## Checked and found fine

- gxformat2: 958 passed. TS schema vitest: 5168 passed, `tsc` clean.
- Linters clean in both languages.
- No new imports; the synced fixture and expectations are byte-identical between repos.
- Assertions are exact; the downstream step stays unnamed.
- No docs left claiming cycles go unreported. No security concerns.

</details>
