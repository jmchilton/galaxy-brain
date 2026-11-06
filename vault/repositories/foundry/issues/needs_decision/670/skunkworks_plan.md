# Skunkworks plan: `repair-galaxy-draft-topology`

Plan for #654, #660, #661, #669, #670. Built on [skunkworks_research.md](skunkworks_research.md), whose F/U/D labels it uses. Line numbers are at Foundry `origin/main` `7453431d`, 2026-11-06. Corrected after review: see [skunkworks_plan_review.md](skunkworks_plan_review.md).

## Scope

Replace the Mold's model of itself in one PR: a general contract, a check after every edit, an evidence rule, and real fixtures. Add two small independent content PRs: the conditional fan-in recipe, and nested `in:` keys. Upstream `draft-validate` warnings don't get a branch here, because the shared contract belongs to gxformat2. They get issue text instead. All branches start from `origin/main` and nothing stacks.

John hasn't answered the research's four decisions. Each branch records the default it took, and its PR description must repeat that.

## Branches

| Order | Branch | Repo | Base | Covers | Issues | Source size |
|---|---|---|---|---|---|---|
| 1 | `issue-669-repair-contract` | `galaxyproject/foundry` | `origin/main` | F1, F2, F3, F5 (extract hole and summary), F6, most of F7, plus a gate fix the research missed | Closes #669. Part of #670, #660, #661, #654 | ~220 prose lines, ~700 fixture YAML |
| 2 (any time) | `issue-661-conditional-fan-in` | `galaxyproject/foundry` | `origin/main` | F4, reduced | Part of #661 | ~50 prose lines, ~120 fixture YAML |
| 2 (any time) | `issue-571-nested-in-keys` | `galaxyproject/foundry` | `origin/main` | The #571 part of F7 | Closes #571 | ~15 lines |
| not a branch | Issue text only | `galaxyproject/gxformat2`, then `jmchilton/galaxy-tool-util-ts` | | U1, U2 | Part of #669's "ideally" | |

The second and third touch no file the first edits by hand, except regenerated casts. Whichever lands later reruns `make casts`. Branch 1 adds the `[[galaxy-conditionals-patterns]]` and `[[gxformat2-schema]]` references to repair, so the other two reach repair with no further edit.

## Spot checks

**Failed or needs adjusting:**

| Research claim | Finding | What the plan does |
|---|---|---|
| F6: "Fixtures fall under `make check-fixtures`" | They don't. That check maps by basename to `_verify.json` entries, and no cast declares `galaxy-workflow-draft.gxwf.yml` or `open-requirements.ledger.yml`. | Scenario cases carry a `command:` line, as `advance` scenarios do. |
| F6: run iterations are ready draft and ledger pairs | The pairs exist, but all three drafts checked fail `gxwf draft-validate` at 1.15.0 (exit 1): `fields is only valid on record-typed collection inputs`. Removing `fields:` makes them `draft valid`. | Fixture READMEs record that one edit. |
| F4: "Depends on #738" | Only for the leaf page. Repair can reference the MOC today, as 8 Molds do, and leaves arrive when #738 lands. John decided on 2026-10-31 against explicit leaf references. foundry-lib#139 is merged, but `@galaxy-foundry/cast` 0.13.0 isn't published (npm has 0.12.3) and #738's CI is red. | F4 goes ahead reduced. The decision rule goes on the MOC, the recipe on the leaf. |
| U1: "Size S" in `galaxy-tool-util-ts`, gxformat2 "not checked" | `gxformat2/draft.py` has its own `validate_draft`. Shared expectations (`validate_draft.yml`, synced into the TS repo) assert exact `warnings` counts. | No TS-only branch. Issue text starts at gxformat2. |
| #696 "touches only `repair`'s `related_molds` and the ledger's decision text" | It also edits `related_molds` and the revision on the MOC and draft-format note. | Still rebase noise. |
| F1 and #678: `nextflow-to-galaxy/eval.md:37-41` "must accept" removal | It says "every tool the workflow needs". A removed step isn't needed, so it passes as written. | No edit. |
| F7: widen `implement:161` | Nothing in it becomes false. Widening it is #678's work. | Left alone. |
| #571's comment: the connection key is the label when one is present | True for list-form steps only. On gxwf 1.15.0, map-form steps resolve by map key. | Branch 3 states both. |

**Missed by the research:**

- **The gate contradicts itself.** `ledger:212` requires `open_history` to be strictly decreasing across escalations, and `advance:174` requires each escalation to reduce the count. Sequential one-entry repairs give `[0, 0]`, which trips `ledger:212`. `nf2g-demo-rerun-7-10` did exactly two such repairs. Only the prose reads this: `packages/build-cli` just renders the field. F1 widens the trigger, so this happens more. Branch 1 fixes it.
- **The budget header is often absent.** `rerun-7-10`'s ledger has none, and funcscan's feedback ledger says it took `cap: 5` from the note's example. Branch 1 adds one sentence.

**Upgraded:** the F5 hole is reproduced from a run record, where the research had it unreproduced. In `nf2g-demo-loop-repair-2026-10-20`, iteration 007 repaired, left `draft: false`, and wrote no `galaxy-workflow.gxwf.yml`. Iteration 008 extracted only because the driver called again.

**Held:**

- `draft-validate` reports `draft valid` on a dead input, a dead step and a dangling `contains_steps` (1.15.0).
- `Functional_annotation_of_sequences` gates 4 eggNOG steps on one list and joins them with `pick_value` (`pick_style: first`), checked in the `.ga`.
- `keep_first` is the default and `type_source="inputs_0|input"` holds on `release_26.1`.
- `__FILTER_NULL__` exists there, and so does built-in `pick_value`, at `modules.py:2090-2098` rather than `:2119`.
- The repair counts I checked agree for `rerun-7-10`, `stock-version` and `loop-repair`.

## Branch 1: `issue-669-repair-contract`

**Setup.** Repo `galaxyproject/foundry`, base `origin/main` (fetch first, branch from the fetched ref), worktree via `ghwt create foundry issue-669-repair-contract`, push to `jmchilton`, draft PR against `galaxyproject/foundry` `main`. Read `AGENTS.md`, `content/meta/mold-spec.md`, `content/meta/eval-philosophy.md` and `.agents/skills/foundry-documentation/SKILL.md` first. Review checklist: `vault/agents/wf_foundry/reviewers/DOMAIN_REVIEW.md`. Run `pnpm install`. CI runs only once the PR opens.

**Covers.** F1, F2, F3, F5 (extract hole and summary only), F6, and the ledger, draft-format and glossary parts of F7, plus the gate fix above. Closes #669. Part of #670, #660, #661, #654.

**Decision taken by default.**

- Dead end: repair may remove the step, with `kind: dropped` and a cited `because`.
- Interface shrink on narrowing: allowed.
- Late structural fixes: in-loop yes (a sentence in `advance`), test-phase no. Test-phase routing leaves a stale extract after a direct-only repair, so it needs the harness to call `advance` again, plus `harness_notes` in every pipeline and the debug Mold. Repair's trigger doesn't rule out a post-loop call, so nothing is foreclosed.
- Layout split (F8): out of scope. Repair allows `add-step` plus `rewire`, and no recipe is added.

### `content/molds/repair-galaxy-draft-topology/index.md`

Frontmatter:

- `revision: 6`, and `revised` to the commit date.
- `summary`: "Make the smallest structural edit that closes an open blocking entry in a settled Galaxy draft."
- `:15` input description: "whose topology can't support a declared step" becomes "with an open blocking entry".
- `:23` output description: "Edited gxformat2 draft. Each blocking entry addressed is closed by the named edits, and new or replaced steps land at draft tier."
- `:50` ledger purpose: remove "the uncomputable output" and "with a surrender note for the terminal path".
- Add three references:
  - `kind: cli-command`, `ref: "[[draft-validate]]"`, `used_at: runtime`, `load: upfront`, `mode: sidecar`, `evidence: hypothesis`, with a `trigger` (after every edit) and a `verification`. Model it on `advance`'s `[[draft-next-step]]` stanza.
  - `kind: research`, `ref: "[[gxformat2-schema]]"`, on-demand. Trigger: an edit touches `out:` actions (`hide`, `rename`, `change_datatype`) or wires a nested parameter.
  - `kind: pattern`, `ref: "[[galaxy-conditionals-patterns]]"`, on-demand. Trigger: an inserted or rewired step consumes a `when`-gated step's output.
- Add `[[apply-galaxy-workflow-changeset]]` to `related_molds`.
- Don't add `--connections`: #668 owns its packaging.

Body: replace `:92-98`, keeping the length close to today's plus the check list. Direction, close to final and with no semicolons (the prose rule):

> Topology is settled upstream by the `*-summary-to-galaxy-template` Mold, and the per-step loop doesn't edit it. This Mold makes the structural edits a settled draft still needs. It runs on an open blocking entry in the [[open-requirements-ledger]]: the settled draft can't give a correct run, and a structural edit closes it. A missing wrapper is this case only when the discover-or-author branch is exhausted: no stock, shed or authored wrapper can produce the step's declared output from its wired inputs, or the ledger already records the wrapper as confirmed absent. A tool version missing from a local cache is not absence. Don't search again.
>
> **Edit.** Close each entry with the smallest set of edits, named by change-set kind: `remove-step`, `rewire`, `change-parameter`, `add-input`, `remove-input`, `add-output` / `expose-output`, `add-step`, `replace-tool`. Apply the direct kinds in place. `add-step` and `replace-tool` land at draft tier ([[galaxy-workflow-draft-format]]): concrete topology and edges, wrapper-tier `TODO` for `tool_id` and ports, `_plan_*` carrying intent. A step duplicated from a realized step keeps its pin and `state`, and changes only the key that distinguishes it. Everything the entries don't name stays as it is.
>
> **Interface.** Change the workflow interface only when an entry names that as the remedy or a narrowing requires it. Promote an input with a default equal to the literal it replaces. Expose an output by removing its `hide`, unless the design wants it hidden. Removing an input or output is a narrowing: append a `kind: dropped` entry with its `units` and a cited `because`.
>
> **Claims.** A claim about a step with no resolved wrapper is not a fact. Attach it to that step as a plain ledger entry with `step:` set, and keep it out of `doc:`. "Computable" means the tool's semantics give what the output declares, including element count and identifiers for collections. Reading a pinned wrapper's command block or a consumer's parser is allowed. Picking a wrapper is not. A removal's `because` quotes the primary artifact it rests on: the search run, the wrapper's ports or command block, the semantics rule. Naming the blocking entry is not a citation. If the step isn't fully redundant, narrow it and rewrite its `_plan_*` to the reduced job.
>
> **After every edit:**
>
> 1. Run [[draft-validate]] and fix what it reports.
> 2. Remove what existed only to feed a removed step: compute it by walking every step's `in:` and the workflow outputs, not from the entry's wording.
> 3. Rewrite or remove mentions of removed ids and labels in `doc`, `_plan_*` and comment frames.
> 4. Move a removed step's `rename` or `change_datatype` to the step that inherits its consumers.
> 5. If an edit touched a step with a twin, make the same edit there.
>
> **Ledger.** Mark each entry you close `resolved`, with a note naming the kinds you applied. A repair must leave fewer open blocking entries than it found. Never insert a producer whose own output is uncomputable from what feeds it. When nothing can close an entry against a drafty step, remove the step, append the `kind: dropped` entry, and resolve the blocking entry with a note naming the drop. Leave an entry `open` with a note, for the terminal path, when a consumer truly needs the removed output, when the step is already realized, or when you have no citation for the removal.

Keep the existing citations to [[galaxy-data-flow-draft-contract]], IWC structure and the pattern pages as the sources for deciding the edit. The wrapper-exhausted sentence reuses #686's text, so its later rebase is simpler. F2's sixth item (stale test artifacts) is left out, because no in-loop call meets a test artifact.

### `content/molds/advance-galaxy-draft-step/index.md` (`revision: 11`)

- `:174` step 5:
  - Scope it to "an `open` blocking entry against this step: one that [[implement-galaxy-tool-step]] appended, or one an earlier call or Mold raised". In real runs the entry arrives from a previous call.
  - Replace "insert a producer/sub-path or honestly narrow the output" with "a bounded structural edit".
  - In the budget clause, replace "each escalation must strictly reduce the open blocking-entry count" with "each repair must leave fewer open blocking entries than it found". Keep the cap and surrender text.
  - Replace "Then return" with: "Then run [[draft-next-step]]: if it reports `draft: false`, the repair removed the last drafty step, so continue at step 6, which validates and extracts. Otherwise return, and the next iteration resumes the loop."
- `:159` step 1: after "carry the chosen step id forward", add "If an `open` blocking entry against it already records why no wrapper can serve it, or why its wired inputs can't supply it, go to step 5."
- `:153` intro: "the call that concretizes the last drafty step" becomes "the call that leaves no drafty step".
- `:183` third bucket: "when a structural edit closes it, append a blocking entry naming the defect and escalate as in step 5. Otherwise flag it to the user." Keep "does not unwind prior iterations". Delete the open question.

### `content/molds/advance-galaxy-draft-step/eval.md`

Extend `:100` "the last concretizing call emits the concrete workflow" to also cover a call that ends in `draft: false` because a repair removed the last drafty step.

### `content/research/open-requirements-ledger/index.md` (`revision: 6`)

- Entry shape's `blocking` comment and `:89`: blocking means the settled draft can't give a correct run and a structural edit closes it. Keep the computability gap as the common case, and keep its "validation cannot see" clause. Name the others: wrapper confirmed absent, step subsumed by another tool, value that must vary per run, validation failure on an edge an earlier step settled.
- `:154`: same condition.
- `:180`: replace "no producer is discoverable, the output cannot be honestly narrowed". A step that stays drafty never leaves the loop, so repair removes it and records the drop. The dropped entry stays `open`, and the terminal writes it into the final artifact.
- `:188-190` role section: match the wider trigger.
- `:196-212` budget:
  - `open_history` stays the post-repair count, so the dashboard doesn't change. The gate becomes "a repair must leave fewer open blocking entries than it found", compared with the count it started from, because entries raised between escalations can raise the count again. Tripping ends escalation as the cap does.
  - Answering an entry against a step an earlier repair inserted by inserting another producer also trips the gate. The old gate stopped that chain, and the per-repair comparison wouldn't.
  - Fix the `# must be strictly decreasing` comment.
  - Add: the orchestrator creates the header at the first escalation with `cap: 5` unless the run sets another.

Leave the `topology_repair` location alone (#318).

### `content/research/galaxy-workflow-draft-format/index.md` (`revision: 5`) and `content/meta/glossary.md`

- Format `:121`, `:125-128`, and glossary `:105`: same widening. Repair is "reactive (an open blocking entry triggers it)". Remove "one producer step, a small sub-path, or honest narrowing" as an exhaustive list.

### `content/molds/repair-galaxy-draft-topology/eval.md`

Remove the preamble at `:3-6`. Properties:

- **Every addressed entry is closed or left open with a note** (replaces `:8-15`). `resolved`, with a note naming change-set kinds, or `open` with a note. The Mold never sets `surrendered`. Open blocking entries fall across the repair unless it reports none closable. Fixes the contradiction with `ledger:180`.
- **Added steps are draft-tier or copied** (revises `:17-24`). A concrete `tool_id` on an added step appears only when copied from a realized step in the same draft.
- **The repair stays local** (revises `:26-32`). Interface and realized steps change only where a named entry requires it.
- **A narrowing is recorded.** A removed public input or output, or cut source work, has a `kind: dropped` entry whose `because` quotes a primary artifact. A `because` that only names the blocking entry, or rests on a tool version missing from a local cache, fails.
- **A removal leaves nothing dead or stale** (`llm-judged`). No input or step that existed only to feed the removed step, no mention of its id or label in `doc`, `_plan_*` or comment frames, and no lost `rename`.
- **No claim about an unresolved step in `doc:`** (`llm-judged`).
- **No convergence-defeating producer.** Keep `:34-41`, updating the wording, and add the chain: no new producer answers an entry against a step an earlier repair inserted.
- **The draft stays loop-consumable.** Keep `:43-48`, and name `gxwf draft-validate` as the oracle.

### `content/molds/repair-galaxy-draft-topology/scenarios.md` and `examples/`

Remove the preamble (`:3-4`) and all four abstract cases. DOMAIN_REVIEW §2 requires this once the file is touched. Each example directory holds `galaxy-workflow-draft.gxwf.yml`, `open-requirements.ledger.yml` and a `README.md` giving its source and any edits. Drafts must pass `gxwf draft-validate`. Run root below is `~/projects/repositories/foundry-runs`.

| Example | Source | Case and expectation |
|---|---|---|
| `fastqc-zip-no-port/` | `nf2g-demo-rerun-7-10-2026-10-21/trial-001/phase-007-advance-galaxy-draft-step/iteration-004/workspace/inputs/`, `fields:` removed | "Wrapper has no port for a public output". `nf-core-demo-fastqc-zip-wrapper-output` ends `resolved`. Either an `add-step` at draft tier with `fastqc_zip_archives` retargeted to it (as that run did), or the public output removed with `kind: dropped` citing the wrapper (as `nf2g-demo-stock-version` did from the same seed). Other steps' `tool_id`, `tool_version` and edges unchanged. |
| `fastqc-zip-no-port/repaired.gxwf.yml` | The same iteration's `workspace/galaxy-workflow-draft.gxwf.yml`, `fields:` removed | "Repaired draft re-enters the loop". `command: gxwf draft-next-step repaired.gxwf.yml`, expect `draft: true` and `step: ["fastqc_archive_per_read"]`. |
| `sample-sheet-restore-last-drafty/` | `nf2g-demo-loop-repair-2026-10-20/trial-001/phase-007-advance-galaxy-draft-step/iteration-007/workspace/inputs/`, `fields:` removed | "Repair removes the last drafty step". `nf-core-demo-trimmed-reads-metadata-carry-forward` ends `resolved` and open blocking entries fall from 2 to 1. `restore_trimmed_sample_sheet_metadata` gone, `trimmed_reads` retargeted, no mention of its id or label left, including the comment frame. `gxwf draft-next-step` reports `draft: false`. Driven through `advance`, `galaxy-workflow.gxwf.yml` is written in the same call. |
| `dupradar-wrapper-absent/` | Hand-built from #669's account: `M19_dupradar`, feeder input `P4_dupradar_strandedness_param`, MultiQC edge `TODO_dupradar`, a frame and a `doc` mention, with the blocking entry listing the zero-result searches | "Confirmed-absent wrapper". Step, feeder input, edge, frame entry and mention all gone. `kind: dropped` with the searches as `because`. |
| `star-sa-index-input/` | Hand-built from #670: twin STAR steps with `genomeSAindexNbases: 14` in `state`, and a blocking entry naming input promotion as the remedy | "Value must vary per run". One `add-input` defaulted to 14, both twins wired by `refGenomeSource\|genomeSAindexNbases` with the literal gone, nothing else changed. |

Say in each README that the real pairs share a seed, and that the hand-built ones are synthetic. Keep `eval.md` free of these names. Funcscan's swap can't be used, because `.checkpoints.git` isn't on this machine.

### Generated

`make casts`, `make generated`, `make assemble-pipelines`. Never hand-edit casts. Expect a wide recast: the ledger note is in 22 bundles and the draft-format note in 6.

Commit in three steps, so a reviewer can skip the last: contract sources, then eval with scenarios and fixtures, then regenerated output.

### Red to green

No gate runs a Mold, so evidence comes in three forms, all recorded in the PR description:

1. **Oracle, no agent needed.** Apply the old `eval.md:29-32` and `scenarios.md:21-23` to `repaired.gxwf.yml` against its input: the real, correct repair fails because `fastqc_zip_archives` moved. It passes the new oracle. Apply old `eval.md:11-15` to `ledger:180`'s surrender rule for the contradiction.
2. **Run record.** `nf2g-demo-loop-repair` iteration 007 ended `draft: false` with no extract. That's the F5 red, already on disk.
3. **Agent runs.** `/test-mold repair-galaxy-draft-topology` on `dupradar-wrapper-absent` and `star-sa-index-input`, each with the base cast (`git show origin/main:casts/claude/skills/repair-galaxy-draft-topology/…`) and the branch cast, in fresh subagents. Then drive `advance`'s branch cast on `sample-sheet-restore-last-drafty` and confirm the extract. Report property tables. These are single runs of a stochastic agent, so say so.

### Verify

```sh
npx --yes --package @galaxy-tool-util/cli@1.15.0 gxwf draft-validate <each fixture draft>
npm run cast -- repair-galaxy-draft-topology --target=claude --check
make check
```

`check-vendored` and `check:planemo-cli` can fail on this machine only. Note them, don't fix them.

### Collisions

- **#686, `fix/advance-draft-needs-tool`:** both edit `repair:92,98` and `advance:174`, and #686 already conflicts. Don't wait. This branch reuses their sentences, so whichever lands second resolves text only. Their `needs_tool` kind and "How a call ends" are compatible.
- **#696:** `related_molds` and revision lines, plus its ledger decision text. Rebase noise.
- **#678:** unblocked by this branch (removal, fold, dead end). Its emitter, `weak` and `author` changes stay with it, and so does `implement:161`.
- **#318:** the budget header stays put. If root TODOs land first, the trigger moves to them.
- **#668:** no `--connections` here.
- **#571:** branch 3 adds the key text. The STAR fixture's entry names its key, so this branch doesn't depend on it.

### Risks

- A looser contract may let repair drop implementable steps, as the 10-20 demo run did before the stock-version fix: an empty cache was its evidence, and the blocking entry was its citation. The guards are the cache sentence, a `because` that must quote a primary artifact, and `ledger:170`'s reopen rule. If later runs show drops, tighten the removal path.
- At the escalation cap a step can still stay drafty. Stopping there is #686's "How a call ends", not this branch's.
- The hand-built fixtures are synthetic evidence. #669's and #670's own run artifacts weren't found.

### Draft PR Summary

> Replaces `repair-galaxy-draft-topology`'s contract. The Mold assumed one trigger (missing evidence) and one answer (add a producer, or narrow), yet 4 of the 7 repairs in our runs removed a step. It now runs on any open blocking entry a structural edit can close, and names its edits with the change-set vocabulary. It checks for dead inputs, dead steps and stale mentions after every edit, and it won't state a claim about an unresolved wrapper as fact. `advance` now extracts when a repair removes the last drafty step, which a real run showed it didn't. The convergence gate no longer trips on two sequential single-entry repairs. The eval stops contradicting the Mold, and the scenarios use real run fixtures.
>
> Closes #669. Part of #670, #660, #661, #654.
>
> **Decisions taken by default, for John to confirm:** repair may remove a step that can't be closed, with `kind: dropped` and a cited `because`. The interface may shrink on a narrowing. Structural defects found in the loop route through repair, while test-phase defects don't (that needs harness changes). The layout split pattern is out of scope.

## Branch 2: `issue-661-conditional-fan-in`

**Setup.** Repo `galaxyproject/foundry`, base `origin/main` (fetch first, branch from the fetched ref), worktree via `ghwt create foundry issue-661-conditional-fan-in`, push to `jmchilton`, draft PR against `galaxyproject/foundry` `main`. Read `AGENTS.md`, `verification/README.md` and `.agents/skills/foundry-documentation/SKILL.md`. Run `pnpm install`.

**Covers.** F4, reduced. Part of #661. It stays open until branch 1 and #738 land.

**Decision taken by default.** None of the four. Note for John: this uses `pick_style: only` where #661 proposed `first_or_error`, following the page's own guidance.

**How it handles #738.** It doesn't wait. The recipe goes on the leaf page. The rule that picks a recipe goes on the MOC, which repair's bundle gets through branch 1's reference. When #738 lands, the leaf arrives with no further edit. Don't add an explicit leaf reference to any Mold: John decided against that on 2026-10-31.

### `content/patterns/conditional-route-between-alternative-outputs.md` (`revision: 5`)

- Add aliases such as "conditional fan-in" and "when-gated fan-in". Add the new test to `verification_paths`.
- Add a section on mapped branches, carrying only what the page lacks:
  - A `when`-gated step mapped over a collection still produces its implicit collection, with a null element for each skipped job. A merge must select per element.
  - Arms mapped over the same collection: `pick_value` maps element-wise and gives one element per input, identifiers kept. Exemplar: `genome_annotation/functional-annotation/functional-annotation-of-sequences/Functional_annotation_of_sequences`.
  - Arms mapped over different collections: `pick_value` can't take them. Use `__FILTER_NULL__` on each arm, then `__MERGE_COLLECTION__` with `keep_first`. Real shapes are in `prose-wb2g-cutandrun-v0-2026-10-31/galaxy-workflow.gxwf.yml` under `~/projects/repositories/foundry-runs`.
  - Pitfall: `__MERGE_COLLECTION__` directly on gated arms keeps the first arm's elements under its default. That means all nulls when that arm is skipped. State only what the verification test shows.
- Built-in `type: pick_value`: DOMAIN_REVIEW §5 prefers it, and `:47` already points at it. If the mapped test passes, present it first for new work. If it fails, write upstream issue text instead of prose (§1), and keep the Tool Shed spelling.
- Cite evidence through `verification_paths` and `iwc_exemplars`. No survey mechanics or counts in new prose.

### `content/patterns/galaxy-conditionals-patterns.md` (`revision: 5`)

- `:50`: add the decision rule. Same collection, `pick_value`. Different collections, filter null then merge. A step that consumes a gated step's mapped output sees nulls.
- `:57`: replace "found no IWC use" with what the verification shows, and link the route page. The sentence stops being about absence.

From finding 21 (`vault/repositories/foundry/findings/2026-10-29/21-when-gate-expressions.md`), take only the unequal-branch merge. Negated and compound gates and gate-only inputs stay with that finding, because they're unrelated to repair.

### `verification/workflows/conditional-route-between-alternative-outputs/`

Add `route-mapped-fan-in.gxwf.yml`, `route-mapped-fan-in.gxwf-test.yml` and tiny `test-data/`. Extend the `README.md`. Test cases, using `class: Collection` with `element_tests`:

1. Equal arms, each arm selected in turn: `element_count` N, identifiers kept, right contents.
2. The same through built-in `type: pick_value`.
3. Unequal arms through filter null then merge: the live arm's elements only.
4. Direct merge on gated arms: assert what Galaxy really does. This turns the research's code reading (`dev`, no live run) into a checked fact on `release_26.1`.

### Verify

This is new verification of claims, so there's no red on the base. The red is the missing recipe, shown by #661.

```sh
cd verification/workflows/conditional-route-between-alternative-outputs
uvx --from planemo==0.75.47 planemo lint route-mapped-fan-in.gxwf.yml
uvx --from planemo==0.75.47 planemo test route-mapped-fan-in.gxwf.yml --galaxy_branch release_26.1
cd -
make casts && make generated && make check
```

Take the planemo version from `content/cli/planemo/index.md`, in case it moved. `check-vendored` and `check:planemo-cli` can fail on this machine only.

### Collisions

- **#738:** cast regeneration only.
- **#696:** revision and `related_molds` lines on the MOC. Noise.
- **Finding 21:** a future section on the same MOC, no overlap.
- **Branch 1:** recast only, either order.

### Risks

- Case 2 or 4 may not behave as the code reading says. Then the page follows the test, and the PR says what changed from the research.
- `planemo test` boots Galaxy, so it's slow. If it can't run here, say so in the PR and don't claim the recipe as verified.

**Size.** ~50 prose lines, ~120 lines of workflow and test YAML. The MOC recasts into 8 bundles.

### Draft PR Summary

> Extends the route pattern to mapped `when`-gated branches, which it didn't cover. A gated step mapped over a collection leaves null elements, so a fan-in must select per element. Arms over the same collection use `pick_value`, and arms over different collections use `__FILTER_NULL__` then `__MERGE_COLLECTION__`. A new verification workflow checks each shape on `release_26.1`, including what a direct merge really does, which differs from #661's account. The maps-of-content page carries the rule now, and the full recipe reaches repair's bundle when #738 lands.
>
> Part of #661.

## Branch 3: `issue-571-nested-in-keys`

**Setup.** Repo `galaxyproject/foundry`, base `origin/main` (fetch first, branch from the fetched ref), worktree via `ghwt create foundry issue-571-nested-in-keys`, push to `jmchilton`, draft PR against `galaxyproject/foundry` `main`. Read `AGENTS.md` and `.agents/skills/foundry-documentation/SKILL.md`. Run `pnpm install`.

**Covers.** The #571 part of F7, including the issue's later comment. Closes #571.

**Decision taken by default.** None.

### `content/research/gxformat2-schema/index.md`

Bump the revision. In "Output names and connections" (around `:50-56`):

- **Nested keys.** A step's `in:` key addresses a parameter nested in a conditional or section with a `|`-joined path, and a repeat instance with `_N`. Examples from checked workflows: `input_type|i` (Functional_annotation_of_sequences), `style_cond|type_cond|pick_from_0|value` (the route verification workflow).
- **Connection keys.** The step part of `source` and `outputSource` depends on the step form. In list form it's the step's `label` when present, otherwise its `id`. In map form it's the map key.

Reproduced on gxwf 1.15.0: list-form references by `id` fail with `references unknown step`, list-form references by `label` validate, and map-form references by key validate with both `id` and `label` present. Before writing the connection sentence, check gxformat2's own resolution (`gxformat2/draft.py`, `_split_source_ref`). If the two disagree, that's an upstream bug: drop the sentence and write issue text (DOMAIN_REVIEW §1).

### `content/molds/implement-galaxy-tool-step/index.md`

Bump the revision. Add `[[gxformat2-schema]]` as `kind: research`, on-demand. Trigger: wiring a parameter nested in a conditional or section, or a draft whose steps carry both `id` and `label`. This is the Mold that does the binding, per #571.

### Verify

Paste the three `gxwf draft-validate` reproductions into the PR. `make casts && make generated && make check`. `check-vendored` and `check:planemo-cli` can fail on this machine only.

### Collisions and risks

- **#678** later edits `implement`: frontmatter noise.
- **Branch 1:** adds repair's reference to the same note. Recast only.
- Low risk.

**Size.** ~15 lines, plus a small recast.

### Draft PR Summary

> Documents how a step's `in:` key addresses a nested parameter (`|`-joined paths), and what a connection's step part refers to in list and map forms. Agents had been inferring these, and one run hit 96 topology errors on the second. `implement-galaxy-tool-step` now carries the note, on demand.
>
> Closes #571.

## Upstream: U1 and U2 as issue text

**Why no branch.** `validate_draft` exists twice: `gxformat2/draft.py` and `galaxy-tool-util-ts` `packages/schema/src/workflow/draft-checks.ts`. Shared expectations in `validate_draft.yml`, synced from gxformat2, assert exact `warnings` counts on shared fixtures. New warnings in the TS repo alone diverge from that contract, and `vault/agents/workflow_libs/AGENTS.md` says to keep them aligned. Done properly, it's a gxformat2 PR, a sync, a TS PR, a release and a Foundry pin bump. That doesn't fit a plan one person reviews for one Mold, and no Foundry branch needs it: branch 1's check computes these from the draft.

**Owner.** The `workflow_libs` agent. Push remotes and bases are in its project settings: gxformat2 to the `jmchilton` fork from `origin/main`, and `galaxy-tool-util-ts` to `origin` from `origin/main` (`origin` there is the upstream `jmchilton/galaxy-tool-util-ts`). The TS repo needs a changeset. Foundry's pin is `^1.15.0` in `package.json`, plus `@1.15.0` in `content/cli/gxwf/index.md` and `content/cli/galaxy-tool-cache/index.md`.

**Draft, not posted, for `galaxyproject/gxformat2`:**

> **Title:** `validate_draft`: warn on unconsumed inputs, unconsumed steps and dangling `contains_steps`
>
> `validate_draft` reports a draft as valid when an edit leaves dead structure behind. On `gxwf` 1.15.0, a draft with a workflow input nothing consumes, a step nothing consumes, and a comment frame whose `contains_steps` names a missing step reports `draft valid` with no warnings. Foundry's `repair-galaxy-draft-topology` removes steps and has to compute this by hand. A required dead input is what a user meets on the run form.
>
> Add three warnings, not errors:
>
> - A workflow input with no consumer. Consumers are any step `in` source (including an input used only by a `when`), any `outputSource`, and a `${label}` placeholder in an `out:` `rename`.
> - A step with no consumer and no workflow output. Plot-only steps are legitimate, so word this as something to check.
> - A `contains_steps` entry matching no step. Match against the map key, `id` and `label`: real drafts list labels.
>
> Apply them per scope, including nested subworkflows. Corpus check, as warnings: 7 of 916 inputs across 2 of 120 IWC format2 workflows, and 7 of 2,612 steps across 4 workflows, including `dada2` plot steps.
>
> Add fixtures and `validate_draft.yml` expectations here, so `galaxy-tool-util-ts` picks them up through `sync-workflow-expectations`. Existing expectations on `warnings` counts may need revisiting.

**TS follow-up, not posted, for `jmchilton/galaxy-tool-util-ts`:** "Port gxformat2's `validate_draft` dead-structure warnings to `draft-checks.ts` after syncing expectations. Add a changeset." After release, a Foundry pin bump updates `content/cli/gxwf/draft-validate.md`, and `eval.md`'s removal property can become `deterministic`. Branch 1's prose stays.

## Cut

| Item | Why |
|---|---|
| F5's sibling-copy and forward-reference sentences (#654 corrections 2, 3b) | No observed failure: 37 twin pairs and no drift. `advance` is loaded every iteration, so each sentence costs every run. Principle 7 says grow a note from observed failures. One real drifted twin reopens this, with D5. |
| F2's sixth item (stale test artifacts) | Unreachable once test-phase routing is out. |
| Test-phase routing through repair (decision 2) | Needs the harness: `advance` has to run again, and `harness_notes` and the debug Mold change. Driver hand-edits continue. |
| F8 layout split | Expert call, per John's instruction. |
| TS `draft-validate` branch (U1, U2) | See above. |
| U3, U4 | U3 belongs to #648. U4 is optional, and low value once branch 2 lands. |
| `implement:161` and the pipeline eval edit | Neither becomes false. `implement` belongs to #678. |
| Funcscan's tool-swap fixture | Its pre-repair draft isn't recoverable here. |
| Finding 21's gates and gate-only inputs | Not related to repair. Keep them for that finding. |
| Promoting the Mold's `status` or references' `evidence` | Their `verification` needs run evidence this effort doesn't produce. |
| D1-D11 | Rejected by the research. D2, D3 and D9 are the ones #670's author will look for, so branch 1's PR description should say why in a sentence each. |

## Open risks

- Every default may be overturned. Dead end and shrink are one paragraph each in branch 1, so reversing them is small.
- Branch 1 will conflict with #686 and `fix/advance-draft-needs-tool` whichever lands first. That cost is known and text-only.
- `nf2g-demo` fixtures share one seed and one small pipeline. A later rnaseq-scale run is the real test, and the source run for these issues was never found.
- The repair `summary` and body change what agents do, and no gate proves it. Only the `/test-mold` runs show behaviour, and those are single runs.

## Done

The effort is done when:

- All three branches are draft PRs from `jmchilton` against `galaxyproject/foundry`, with `make check` green apart from the two known local failures.
- CI has run on each.
- Each PR description carries its defaults and evidence.
- Branch records and `MY_BRANCHES.md` lines exist per `vault/agents/_shared/GENERIC_IMPLEMENTATION.md`.
- The gxformat2 and TS issue text sits in this record, unposted.

John merges. Nothing here undrafts or merges itself.

| Issue | After merge | Why |
|---|---|---|
| #669 | Closed by branch 1 | Trigger, deletion, sweep and evidence bar all land. Its `gxwf` survey lines were an "ideally", and they move to the upstream text. |
| #670 | Open, John's call | Input promotion and blocking port promotion land. Non-blocking output promotion (D2), the hide rule (D3) and test artifacts (D9) are rejected, not done. Recommend closing with that explanation, and noting output promotion on #332. |
| #660 | Open | The trigger and rejoin evidence land. F8 is an expert call, and the budget request (D7) is rejected. |
| #661 | Open until #738 lands | The shape clause and recipe land, but the leaf page isn't in repair's bundle until then. Close after that. |
| #654 | Open, John's call | Only the twin-edit clause lands. Recommend closing with the drift evidence, to reopen on one real drifted twin. |
| #571 | Closed by branch 3 | |
| #678 | Open, next | Unblocked. Its route and `weak` changes are next. |
