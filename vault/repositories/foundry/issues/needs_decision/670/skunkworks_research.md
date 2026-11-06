# Skunkworks research: `repair-galaxy-draft-topology`

Covers #654, #660, #661, #669, #670. Verified at Foundry `origin/main` `7453431d`, 2026-11-06. Builds on [index.md](index.md) without redoing it. Short names: `repair`, `advance`, `implement`, `apply` and `interview` are `content/molds/<name>/index.md` (`apply-galaxy-workflow-changeset`, `interview-to-galaxy-workflow-changeset`, etc.). `ledger` is `content/research/open-requirements-ledger/index.md`. `route` is `content/patterns/conditional-route-between-alternative-outputs.md`.

## Conclusion

The five issues describe one defect. The Mold believes it is called for one reason (implement found missing evidence), and that its answer is one thing (add a producer, or narrow). In practice it is the only structural editor after settling, so it gets called for everything else. None of the escalations the issues describe is a plain producer insert. Of the 7 repairs in our own runs, 4 remove a step, 1 removes a public output, 1 swaps a guard for a sub-path, and 1 inserts a producer.

Don't add five shapes. Replace the model with a small general contract that reuses the change-set vocabulary, plus a consequence check after every edit. Most of what the issues ask for then follows from a sentence, or isn't needed.

Several claims don't hold. The most useful corrections:

- #661's "correct fan-in isn't in IWC" is wrong. `Functional_annotation_of_sequences` is exactly that shape, and `route` already cites it. The real gap is that repair's bundle doesn't reach the page.
- #661's "3N elements, identifiers repeated" can't happen. `__MERGE_COLLECTION__` defaults to `keep_first` and keys by identifier.
- #654's drift never happened in the run. It is written as "had a key drifted". Our runs show 37 twin pairs with no drift I could find and no tooling.
- #660's split is routinely a design-tier decision. chipseq, atacseq and viralrecon settled it in the template with 0 repairs, and chipseq is planemo green.

### Ranked priorities

1. **Replace the contract (F1), with the `advance` step 5 fix (F5).** Removes a stuck loop and the Mold's self-contradiction, and unblocks #678. Highest because it is the only item that fixes a dead end rather than a risk.
2. **Consequence check after every edit (F2), backed by `gxwf` warnings (U1, U2).** The Mold has no validation step at all today, and removal leaves wreckage that reads `draft valid`.
3. **Evidence rule for repair claims (F3).** The reported scientifically wrong outcome (M9 below the merge) came from a claim about an unresolved wrapper. One rule, reusing the ledger's `step:` delivery.
4. **Make conditional fan-in reachable (F4).** Extend an existing page and add one reference. A wrong merge produces a wrong workflow that passes every gate. Depends on #738.
5. **Real fixtures and a corrected eval (F6).** The Mold is `status: draft`, its references are `hypothesis`, its eval contradicts its body, and its scenarios have no fixtures. Without this nothing above can be checked.

**What would change my mind:**

- A real drifted twin: build D5's diff command and promote parity to an obligation.
- Later runs where repair drops implementable steps (the 10-20 demo run did, before the stock-version fix): tighten or remove the removal path.
- A live Galaxy run showing a hidden promoted output missing from invocation outputs: reinstate the hide rule.
- #318 landing root TODOs before this: move the trigger from ledger entries to draft TODOs.
- More escalations from the test phase than from the loop: post-loop edits may deserve their own Mold rather than a wider trigger.

## Direct answers

### Common root cause

Yes: the Mold's model of why it is invoked. "A step output needs evidence no wired input carries" is encoded in `repair:12,23,92`, `eval.md:11-13`, `ledger:89,154`, `content/research/galaxy-workflow-draft-format/index.md:121,126-128` and `content/meta/glossary.md:105`.

| Real trigger | Issue | Why it doesn't fit |
|---|---|---|
| `--connections` red on an existing edge | #660 | Not implement-time, not missing evidence |
| Wrapper confirmed absent, drop authorized | #669 | `repair:92` excludes it, and nothing else can delete |
| Step subsumed by another tool (`G2_tx2gene`, STAR index) | #669, #678 | Removal, no shape |
| Runtime need: value must vary per run | #670 input | Interface clause `repair:94` |
| Enhancement, nothing broken | #670 output | Not blocking, so truly out of contract |
| User brief after a Galaxy limit | #661 | Tool swap plus fan-in |

The second half of the root cause sits outside the Mold. `advance:183` says earlier-step defects go "to the user" and cross-step rework "belongs at the harness level", and `debug-galaxy-workflow-output` only recommends. So nothing owns a structural fix found late. Our driver hand-edits (chipseq R1/R2, hic R3, cutandrun R2); scottcain's run forced it through this Mold, up to escalation 10.

### Shapes or a general rule?

A general rule. `interview:65` and `apply:80` already name every requested shape:

| Requested shape | Change-set kinds |
|---|---|
| Deletion, drop | `remove-step` |
| Fold into consumer | `remove-step`, `change-parameter`, `rewire` |
| Input promotion | `add-input`, `change-parameter`, `rewire` |
| Port promotion | `expose-output` |
| Split/duplicate/merge | `add-step` (several), `rewire` |
| Fan-in | `add-step`, `rewire` |

`apply:80-81`'s direct-versus-deferred split is the rule repair needs. `apply` itself can't serve the loop: it takes a reviewed change-set and a concrete workflow. Reuse the vocabulary, not the Mold.

The rule, in substance (not final wording):

- **Trigger:** an open blocking entry. Blocking widens to "the settled draft can't give a correct run, and a structural edit closes it".
- **Edit:** the smallest set of change-set kinds that closes the entry, named in its resolution note. Direct kinds apply inline; `add-step` and `replace-tool` land at draft tier. A step duplicated from a realized step keeps its pin and state, with only the discriminating key changed.
- **Interface:** may grow when the entry names that as the remedy: an input defaulted to the literal it replaces, or an output with its `hide` removed. It may shrink only as a narrowing with `kind: dropped` and a cited `because`.
- **Claims:** F3.
- **Afterwards:** F2.

Nothing caps region size. The entry bounds the scope, and the escalation cap bounds the repetition.

### The #670 record's questions

1. **Does repair own interface edits?** It owns any interface edit a blocking entry names as its remedy, in both directions. Input promotion qualifies. Non-blocking output promotion doesn't: the record's reading stands, and the absent gate is just a symptom of being out of contract. It stays a plain open entry. #332's finalize step is its natural home if built, so note it there rather than building a route now.
2. **Hide rule?** Drop the MUST NOT and don't add a `gxwf` check. Keep it as the second half of `expose-output` ("remove `hide` unless the design wants it hidden"), matching `content/pipelines/update-interview-to-galaxy/scenarios.md:52`. Evidence in D3.
3. **Split?** No. #670's parts land in the contract change; nothing needs its own issue. Research together: done here.

### Decisions needed from John

1. **Dead end** (open from #678): when nothing can close an entry, should repair remove the step with `kind: dropped`? Recommend yes, requiring the cited `because` from `ledger:74`. `content/pipelines/nextflow-to-galaxy/eval.md:37-41` must then accept it.
2. **Late structural fixes:** route test-phase structural defects through repair, or keep driver hand-edits? Recommend repair, for the ledger trail. It costs a trigger sentence and one line in the debug Mold. A direct-only repair leaves `draft: false` and a stale extract, so the harness must call `advance` once more.
3. **Mixed layouts:** IWC has separate `rnaseq-pe` and `rnaseq-sr` workflows and 0 uses of `__SPLIT_PAIRED_AND_UNPAIRED__`. Our runs split inside one workflow. Should Foundry document that split (F8)? This is an expert call, not a count.
4. **Interface shrink on narrowing:** allow it (recommended; repairs already do it), or forbid it and leave dead inputs?

## Bucket 1: implement here (Foundry)

### F1. Replace trigger, output contract and interface clause

- **From:** #669 corrections 1-2, #670 corrections 1-2, #660 correction 1, #678's fold.
- **Holds:** yes, more widely than claimed. `repair:92` (trigger), `repair:23` (additive contract), `repair:94` (interface), `repair:96` (three shapes), `eval.md:29-32`, `scenarios.md:21-23`.
- **The interface clause is already false in practice.** `nf2g-demo-stock-version` removed public output `fastqc_zip_archives`; `nf2g-demo-rerun-7-10` retargeted `trimmed_reads`; funcscan rewired workflow outputs. A narrowing can't avoid this.
- **Also from #678:** the dead end. A step repair can't close stays drafty, `draft-next-step` keeps picking it, and the labelled gap at `ledger:180` can't happen. Removal is the honest exit.
- **Matters:** stuck loop, and an agent told to do the impossible improvises. **Size:** S for `index.md` (the body stays about the same length).
- **Take, don't rewrite:** #686 and `fix/advance-draft-needs-tool` carry the same `repair:92,98` text (branch exhausted is this case; a narrowing records `kind: dropped`).

### F2. Consequence check after every edit

- **From:** #669 correction 3 and 4d, #654 correction 1b, part of #670 correction 3.
- **Holds:** yes. The Mold has no `cli-command` reference, its cast has no `references/cli/`, and the body never says to validate, though `eval.md:46-48` requires a valid result.
- **Reproduced (local gxwf 1.15.0):** one draft with an unconsumed input and a step nothing consumes, and another with a `contains_steps` entry naming a missing step, both report `draft valid` with no warnings.
- **The check, in order:**
  1. Run `draft-validate`. It already catches missing output sources.
  2. Remove what existed only to feed a removed step, computed from the draft, not trusted from a brief.
  3. Rewrite or remove mentions of removed ids in `doc`, `_plan_*` and comment frames.
  4. Move a removed step's `rename` or `change_datatype` to whichever step inherits its consumers.
  5. If an edit touched a step with a twin, make the same edit there.
  6. If test artifacts already exist, append a plain entry naming what the interface change made stale.
- **Add references:** `[[draft-validate]]` (upfront) and `[[gxformat2-schema]]` (on demand, for `out:` actions, `:56`). Add `--connections` only after #668 packages it.
- **Matters:** green and wrong. A required dead input breaks the run form. Unedited twins silently diverge. **Size:** S.

### F3. Evidence rule for repair claims

- **From:** #660 correction 2, #661 correction 1 (shape clause), #669 correction 4a-c.
- **Holds:** `repair:98`'s guard is graph-level, and nothing in the Mold sets a bar for claims about drafty steps. I couldn't check M5c's `doc:`, but the chipseq run independently supports the premise: its `featureCounts` lanes differ on `pe_parameters`, and it needed two steps.
- **Rule:**
  - A claim about a step with no resolved wrapper is not a fact. Attach it as a plain ledger entry with `step:` set, and keep it out of `doc:`. `ledger:148` already makes the later Mold read it, so no new field or status is needed.
  - "Computable" means the tool's semantics give what's declared, including element count and identifiers for collections.
  - Reading an already-pinned wrapper's command or a consumer's parser is allowed at repair time. "Do not resolve wrappers" (`repair:96`) means don't pick one.
  - A removal cites its primary artifact; if the step isn't fully redundant, narrow it instead.
- **Related:** #647 is the same failure at template tier. Don't try to fix it here.
- **Matters:** wrong workflow. **Size:** XS (3-4 sentences).

### F4. Conditional fan-in: extend `route`

- **From:** #661 correction 2.
- **Holds in part:** repair can't reach the recipe.
  - `repair:28-83` references the collection and tabular MOCs, not `galaxy-conditionals-patterns`.
  - #570 means MOCs are cast without their leaves (repair's cast has MOCs only). #738 fixes that but is draft and needs foundry-lib#139 released.
- **Doesn't hold:** `route` exists, with aliases for this exact case (`route:7-9`) and pick-style guidance. Its exemplar (`route:33`) gates 4 eggNOG Mapper steps on one input collection and joins them with `pick_value`.
- **Must be added to the recipe, which #661 lacks:**
  - Equal arms only. funcscan's repair proved `pick_value` maps element-wise and can't take unequal lists (`pick-value-list-shape-mismatch`). For unequal arms use `__FILTER_NULL__` then `__MERGE_COLLECTION__` `keep_first`, verified by cutandrun's driver probe on Galaxy 26.1 (finding 21). `galaxy-conditionals-patterns.md:57` currently says only that the corpus has no use.
  - Mapped skipped steps leave null elements (funcscan; `galaxy-collection-tools:248`).
  - Choose `only` when exactly one arm must run, per `route` itself. #661 proposes `first_or_error`, which has 0 corpus uses.
  - Built-in `type: pick_value` exists on `release_26.1` (`lib/galaxy/workflow/modules.py:2119`), and DOMAIN_REVIEW §5 prefers it. Add it to the verification fixture rather than assert it.
- **Matters:** wrong workflow, no gate catches it. **Size:** S, plus a mapped case in `verification/workflows/conditional-route-between-alternative-outputs/`.
- **Overlap:** finding 21 proposes edits to the same pages. Combine them.

### F5. `advance` follow-through

- **Step 5 hole (new, from reading):** `advance:174` says "Then return". Only step 6 (`advance:175`) extracts when the call made `draft: false`. A repair that removes the last drafty step returns with no extract, and a `while draft` harness never calls back. Narrowing can already hit this; removal makes it likely. Not reproduced. **Matters:** run ends with no workflow. **Size:** XS.
- **`advance:174`'s repair summary** ("insert a producer/sub-path or honestly narrow") needs to match F1. **Size:** XS.
- **#654 correction 2, smaller form:** `advance:161` reuses only identity. Add: when the plan names a concrete sibling, start from its `state` and `out` and change only what the plan's delta names. **Matters:** preventive. **Size:** XS.
- **#654 correction 3b:** if the plan defers to a sibling that is still drafty, implement this step from the wrapper and let the sibling copy later. `draft-next-step` is confirmed step-local with a code-point tie-break (`galaxy-tool-util-ts` `packages/schema/src/workflow/draft-checks.ts:860`). **Matters:** rework only. **Size:** XS.

### F6. Eval and scenarios

- **Contradiction, in no issue:** `eval.md:11-15` requires entries to end `surrendered` with the count falling and none left `open`. `repair:98`, `ledger:180` and `scenarios.md:29-31` say leave it open, since only the terminal sets `surrendered`. Fix the eval.
- **Revise:** `eval.md:20-24` (a copied pin isn't fabricated), `eval.md:29-32` and `scenarios.md:21-23` (interface unchanged except what the entry names).
- **Add properties:** resolution names change-set kinds; nothing dead or stale after removal; no claim about an unresolved step in `doc:`.
- **Scenarios must name real fixtures** (DOMAIN_REVIEW §2). All four cases are abstract and `scenarios.md:3-4` is a flagged preamble, so touching the file means fixing them. Candidates, as draft and ledger pairs:
  - `foundry-runs/nf2g-demo-rerun-7-10-2026-10-21` (removal and producer; the iterations keep their input artifacts);
  - funcscan's tool swap, if its pre-repair draft can be recovered: `CHECKPOINTS.txt` lists the commit (`3e5c5e1`), but `.checkpoints.git` isn't on this machine;
  - a small hand-made promotion case.
- **Size:** M, mostly the fixtures. Fixtures fall under `make check-fixtures`.

### F7. Propagate the wording

- Widen `ledger:89,154`, `galaxy-workflow-draft-format:121,126-128`, `glossary:105` and `implement:161`. This is #678's list, so land them together or sequence explicitly.
- Add #571's `|`-joined `in:` key and label-key sentences to `gxformat2-schema`, since input promotion of `refGenomeSource|genomeSAindexNbases` depends on them and F2 makes that note reachable.
- **Size:** S to write. Expect a wide recast: the ledger note is in 22 bundles.

### F8. A layout-split pattern (depends on decision 3)

- **From:** #660 correction 1a-b. Move it upstream of repair rather than making it a shape.
- **Holds:**
  - `merge_collection.xml:87` takes `type_source="inputs_0|input"`.
  - Runs need a flatten before merging (chipseq `flatten paired-end reads for FastQC`).
  - The downstream extent rule is real: chipseq and atacseq both duplicate through peak calling, and chipseq through featureCounts.
- **Why a pattern:** data-flow Molds currently derive this alone. A `structurally-verified` page, with chipseq as evidence, would stop the problem at design time. **Matters:** prevents the biggest repair. **Size:** S-M. Not in the top five because repair doesn't depend on it.

## Bucket 2: implement upstream

### U1. `draft-validate` warnings for dead inputs and dead steps

- **Repo:** galaxy-tool-util-ts, `packages/schema/src/workflow/draft-checks.ts` (`warnings`, `:405`, `:453`, `:506`).
- **From:** #669 correction 3's "ideally". Reproduced as missing.
- **Warnings, not errors.** IWC scan (format2 corpus at `deafc4876`): 7 of 916 inputs across 2 of 120 workflows, and 7 of 2,612 steps across 4 workflows, including legitimate plot-only `dada2` steps. A low false-positive rate, but not zero.
- **Matters:** turns F2 into a deterministic check. **Size:** S, plus pin bump. Not checked: gxformat2's Python side.

### U2. `draft-validate` warning for a dangling `contains_steps`

- **Repo:** same file. Reproduced above. **Matters:** untidy unless Galaxy import objects (not checked). **Size:** XS. Bundle with U1.

### U3. Reaching a wrapper's command block

- **Holds:** `ParsedTool` has no command field (`lib/galaxy/tool_util_models/_models.py:750`, inputs, outputs and help only). The Tool Shed raw-file URL returned HTTP 403 with an HTML page for me (2026-11-06). #669's account of a frameset page fits.
- **Owner:** #648 already covers what `summarize` drops, and the fix spans Galaxy and galaxy-tool-util-ts. Add this as evidence there, not a new effort. Until then, F3 lets repair read the wrapper from its source repository.
- **Matters:** slower removal decisions. **Size:** M-L. Not this effort.

### U4. Skip semantics in Galaxy's collection-semantics spec

- **Holds:** #661 wants this in `galaxy-collection-semantics`, but that note is vendored from Galaxy at a pinned SHA, so Foundry can't edit it. The file is `lib/galaxy/model/dataset_collections/types/collection_semantics.yml`.
- **Matters:** low once F4 lands. **Size:** S. Optional; John's call.

## Bucket 3: don't implement

| | Request | Why not |
|---|---|---|
| D1 | Named shapes for promotion, split, deletion, fan-in (#660, #669, #670) | The change-set kinds cover them all. Shapes would multiply with each run. |
| D2 | Non-blocking output promotion in repair, with a "promoted set by name, connections unchanged" gate (#670) | Out of contract: nothing was broken. For blocking entries the existing count works. |
| D3 | "MUST NOT carry `hide: true`" and a `draft-validate` check (#670) | IWC: 54 promoted outputs with `hide` in 18 of 120 workflows by my format2 count (the record's native count is 171 in 26), and 4 of them are asserted by IWC tests, which implies a hidden output stays reachable. Our 11 final workflows promote 0 of 199 hidden ports, so the mistake doesn't arise without a rule. |
| D4 | `draft-next-step` tie-break on plan-text references (#654 3a) | Would make a pure observer parse free prose. F5's sentence handles it. |
| D5 | `gxwf draft-show-step` / `draft-diff-steps` (#654 4) | No observed drift (evidence below). The agent can read YAML. The cost is small, so reopen on one real drifted twin. |
| D6 | "Standing obligation that survives closure", a fourth failure bucket, flatten-and-assert (#654) | Ceremony for a risk two sentences cover. A plain entry with `step:` delivers it. The stale-entry case is F2's mention sweep. |
| D7 | Budget rules: fan-out charging, no charge for fixing an earlier repair, contention reporting (#660) | Escalations are the unit, and #318 moves the budget. The run passed its cap through out-of-contract use, which F1 sorts out. |
| D8 | New `conditional-branch-fan-in` page and "evidence tier: not IWC" (#661) | Duplicates `route`, and the tier claim is false. |
| D9 | Test plan and test data as repair's declared artifacts (#670 correction 3) | Tests come after the loop in every pipeline. Only a post-loop edit meets them, and a plain entry covers it. |
| D10 | "Pruning the interface is out of scope" for orphaned inputs (#669 correction 3) | Leaves a dead input users must fill. Remove it with `kind: dropped` when the removal caused it (decision 4). |
| D11 | Assert promoted outputs by name because `draft-extract` drops them (#670) | Per the record, `draft-validate` already fails on a missing source. |

<details><summary>Evidence: twin prevalence and drift (D5, F5)</summary>

Leaf diff of `state` over layout-labelled pairs in final drafts:

- chipseq, 25 pairs; atacseq, 12 pairs. All share tool and version.
- 34 pairs differ in 0-2 leaves: the layout key, `BAM`/`BAMPE`, a connected `format`, or a paired-only flag (`filter paired-end library alignments`, `coverage bedGraph`).
- 3 pairs differ in 4-9 leaves, on layout-specific settings (`bamtools filter` thresholds twice, `featureCounts` `pe_parameters`). They look deliberate. I didn't audit them against the source.

viralrecon has a layout split too, but my label match found no pairs, so this rests on two runs. The issue reports no actual drift; its M4b check passed.

</details>

<details><summary>Evidence: repairs in our runs (F1)</summary>

From the final ledgers in `~/projects/repositories/foundry-runs`. The `nf2g-demo` runs share a seed, so these aren't independent.

| Run | Repair |
|---|---|
| `nf2g-demo-loop-repair-2026-10-20` | Removed `explode_and_label_input_reads`; removed `restore_trimmed_sample_sheet_metadata` |
| `nf2g-demo-stock-version-2026-10-21` | Narrowed FastQC (public output removed, edge rewired); removed the restoration step |
| `nf2g-demo-rerun-7-10-2026-10-21` | Removed the reconstruction step, output retargeted; inserted `fastqc_archive_per_read` |
| `prose-wb2g-funcscan-v0-2026-10-26` | Replaced 4 `pick_value` guards with `__FILTER_NULL__` plus merge |

The other 10 `prose-wb2g-*` and 3 `prose-nf2g-*` ledgers record no Mold-driven repair. Their structural fixes were driver hand-edits, listed in each `run-summary.md`.

</details>

<details><summary>Evidence: <code>__MERGE_COLLECTION__</code> and the 3N claim (D8, F4)</summary>

Galaxy `dev` `65e6daff233`:

- `lib/galaxy/tools/merge_collection.xml`: `keep_first` is `selected="true"`.
- `lib/galaxy/tools/__init__.py:4245` defaults to it, `:4283` skips a seen identifier, and `new_element_structure` is a dict keyed by identifier.

So under the default, N elements come from the first arm: all nulls when that arm is skipped. That's still wrong, so "select, don't concatenate" stands, but the failure differs from #661's. 3N is possible only with a `suffix_*` option, and then identifiers differ rather than repeat. Identifiers can never be "repeated three times". `galaxy-collection-tools:159` already warns about this default. Code reading only.

</details>

## Collisions

- **#686** (conflicting, built on `advance` rev 7) and **`fix/advance-draft-needs-tool`** (not a PR, `advance` rev 13) both edit `repair:92,98` and `advance:174`. The branch also adds a `needs_tool` kind and "How a call ends". Compatible by design; they conflict only as text. Don't wait for them. Reuse the sentences.
- **#696** touches only `repair`'s `related_molds` and the ledger's decision text. Rebase noise.
- **#678** is the closest dependency. Its route needs F1, and its own research orders #669 first. Decide them together.
- **#318:** F1 doesn't depend on root TODOs. If they land, the trigger moves with them.
- **#332:** gains non-blocking output promotion as a candidate, nothing more.
- **#571:** absorbed by F7 unless it lands first. **#668:** owns `--connections`; F2 waits on it. **#578:** the test-side reason for input promotion, unaffected. **#738/#570:** F4 needs them for the cast.

## Not verified

- **The source run's artifacts weren't found.** GitHub code search for three of its ledger ids returned nothing. `nekrut/foundry-paper` has `workflows/rnaseq/`, but the one ledger I opened is empty and I didn't establish it's the same run. All of that run's numbers, M9's `doc:` text, the subread line citations and the 3N observation remain the issues' claims.
- **No live Galaxy.** Merge behaviour, hidden outputs and step 5 come from code reading, IWC test files or run records. I didn't confirm IWC CI is green on the 4 hidden-output tests. Merge code was read on `dev`, not `release_26.1`.
- **Galaxy 500 on connecting a conditional's test parameter** (#661's context, and the reason for the three-branch Salmon) wasn't checked. If it's real it may be worth an upstream issue, which would remove the need for that topology.
- **Corpus numbers:** my IWC snapshot has 120 format2 workflows; the record cites 133. Different views, not reconciled.
- **Tooling:** reproductions used `galaxy-tool-util-ts` `packages/cli/dist` reporting 1.15.0, on minimal hand-written drafts.
- Sizes are rough, and #670's labels now appear on GitHub, so its `issue_tags.md` may be stale.
