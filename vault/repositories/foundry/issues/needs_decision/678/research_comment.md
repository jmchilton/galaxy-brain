## Recommendation

Don't add a status. Discovery isn't given what this outcome depends on (no draft, no ports), and it isn't a choke point. The port contract first appears at summarize, and the plan and ports first meet in `implement-galaxy-tool-step`.

- **Discovery:** classify on whether a wrapper runs the executable or operation the need names. `rna_star` is a `hit` or `weak`, never a `miss`.
- **`weak`:** gets confirmed, then goes to summarize. It no longer falls through to authoring.
- **Emitter:** `implement-galaxy-tool-step` appends a blocking ledger entry, and `advance-galaxy-draft-step` step 5 escalates to repair.
- **Authoring:** continues only on a `miss` with no alternate that does the work, and no open blocking entry on the step.
- **Order:** keep this separate from #723 and land it first. A fold (delete the step, move its work into the consumer) isn't expressible until #669 adds deletion.

**This doesn't finish every run yet.** A step repair can't close stays drafty and gets picked again, so today it ends blocked, not with a labelled gap. Section 3 proposes a fix, and it needs a decision.

Line numbers are at `51338d1d`. Short names: `advance`, `implement`, `repair`, `discover` and `author` are each Mold's `content/molds/<name>/index.md`. `ledger` is `content/research/open-requirements-ledger/index.md`.

Limit of this research: the issue doesn't link the run's artifacts, and I couldn't find `galaxy-tool-pin.R7.json` through GitHub code search or in `nekrut/foundry-paper`. Its need text and search history are unchecked. The STAR facts below come from the wrapper.

## 1. Merge into #723, or sequence?

**Sequence.** #723 has six requirements, and it needs a Galaxy-catalog leg and a manifest that don't exist. This issue is one route.

- **#723 needs from this issue:** the capability half of its requirement 2, and a destination for its "capability gap, no UDT" acceptance case.
- **This issue takes from #723:** the part of requirement 4 about found wrappers (removing the weak-hit exception). #723 can widen it to its full invariant later.

Proposed order:

1. **#669, plus a fold clause (section 3).** It gives repair a deletion shape, and it's useful alone for confirmed-absent drops.
2. **This issue.**
3. **#723, split:** discovery evidence, catalog leg, manifest, shared guidance, and the rest of the authoring gate. #655 correction 8 (generic wrapper route) must be reconciled with #723 requirement 3 there.

**#686 conflicts textually, not in design.** It carries #689 (merged into #686's branch, not main), which edits the same lines (`advance:169`, `advance:174`, `repair:92`), and it's built on `advance` rev 7, while main is at rev 10. Its "author, then block" order is fine once `advance:169` means `miss`, because it then fires only when nothing was found. Whichever lands second keeps that meaning.

Other overlaps are rebase noise:

- #545 conflicts and touches `author`, including the frontmatter block this needs.
- #696 edits `repair` frontmatter and several notes, but not the routing text.
- Other open PRs touch these Molds only through regenerated casts.

## 2. Who emits it?

**`implement`, after summarize, with no new status and no change to the schema's shape.** The issue's objection is that `hit` "would have been a lie". `discover` doesn't define it that way: `hit` means recommend pinning (`discover:105`), classified from search and pin resolution (`discover:158`). Fit to the step is checked later. The bug is that a found wrapper was reported as `miss`.

**What discovery reads:**

- A free-text need and two optional hints (`discover:72-76`). It declares no `input_artifacts`, so no draft and no `_plan_in`/`_plan_out`.
- `tool-search`, `tool-versions` and `tool-revisions` only (`discover:22-45`). Search rows carry no ports.
- The schema note assigns wrapper structure to summarize, "not to discovery" (`content/schemas/galaxy-tool-discovery.md:72`).

**Can the need be checked there?** Partly. A need can state formats (`discover:74`), and some runs inspect wrappers anyway: the R7 rationale in the issue, the public ampliseq pin below, and M7 in #655. Discovery can catch a coarse mismatch against what the need says. It can't judge arrangement, because STAR's verdict depends on what the step's consumers accept, which is a draft fact. Sibling reuse and stock tools also skip discovery (`advance:161`, `advance:164`), and #655 corrections 2 and 3 would add more skips. Most wrapper paths reach summarize (`advance:172`).

**When the contract becomes known:** ports at `advance` step 3 (`advance:172`), compared to the plan at `implement:148-149`.

**Route to reuse:** `implement:161` already appends a blocking entry, and `advance:174` already escalates on it. `advance:182` isn't the right hook. It's a red `draft-validate` bucket, and a step with no output to bind may never go red. Its targets are also discovery and authoring, which is what #723 objects to.

<details><summary>Evidence: STAR, and what search returns</summary>

Run against the live Tool Shed on 2026-11-06 with the local `gxwf` and `galaxy-tool-cache`. Local `gxwf --version` reports 1.0.0 while the cast pins `^1.15.0`, so search rankings may differ under the pinned version.

- `galaxy-tool-cache summarize` on `rna_star` `2.7.11b+galaxy1` shows both the gap and the reason:
  - Outputs: `output_log`, `chimeric_junctions`, `splice_junctions`, `mapped_reads`, `transcriptome_mapped_reads`, `reads_per_gene`, four `signal_*`. No index.
  - `geneSource` option `history` is labelled "Use reference genome from history and create temporary index".
  - `warnings` is empty, and `parsed_tool` has no command field.
- The wrapper XML confirms it. At tools-iuc `274f6fe0`, `tools/rgrnastar/macros.xml:82-93` defines `@TEMPINDEX@`, which runs `--runMode genomeGenerate` when `geneSource` is `history`. `rg_rnaStar.xml:24` includes it in the job command.
- `gxwf tool-search "star genome index"`: the top hit is `rna_star_index_builder_data_manager`, and `rna_star` isn't returned.
- `gxwf tool-search "rna star"`: `rna_starsolo` 59.99, then `rna_star` 40.73.
- Search row keys: `source`, `toolId`, `toolName`, `toolDescription`, `repoName`, `repoOwnerUsername`, `score`, `trsToolId`, `fullToolId`.

So searching only the need's operation keywords can honestly miss STAR. The need should name the executable, and discovery should search it. `discover` has no plan to read, so `advance:167` has to pass the executable along.

</details>

The entry needs no new fields:

```yaml
- id: <step>-no-index-output
  status: open
  blocking: true
  raised_by: implement-galaxy-tool-step
  step: <index step>
  unmet: "STAR index for the aligner steps"
  missing: "iuc/rgrnastar/rna_star 2.7.11b+galaxy1 has no index output; genomeGenerate runs inside the alignment job"
```

**Fit with #318.** `_plan_todos` isn't on main. Two things need adjusting there:

- Recommendation 3 in #318's research comment sends `miss` and `weak` to authoring. Under this design, `weak` goes to confirmation.
- #318 doesn't want the ledger carrying design issues back up. This adds to that use because step 5 is the path that exists today. It should migrate with the rest of that comment's recommendations, likely as its suggested `repair-topology` kind, raised after summarize.

## 3. Where does a capability gap route?

**Both proposals fit one route.** A labelled gap naming the wrapper is what #723 calls an unresolved requirement, and repair already has a narrow outcome. Two questions pick the row: does a wrapper do the work, and is anything declared lost?

First, check later changesets at the same version (#655 correction 7a). Then:

| Finding after summarize | Example | Route |
|---|---|---|
| Wrong tool picked | | Back to `advance` step 2 with refined criteria. This has no green-path route today, so add one. |
| No wrapper does this work | `vsearch --sintax`, per the rationale of [this ampliseq pin](https://github.com/nekrut/foundry-paper/blob/43660758/workflows/ampliseq/generalization/2026-10-29/foundry/sintax-discovery/galaxy-tool-pin.json) | `miss`; authoring, subject to #723 |
| A wrapper does the work, and a bounded rewire keeps every consumer and promoted output | STAR index; tx2gene inside tximport (#669) | Blocking entry, repair folds |
| A wrapper does the work, a declared output is lost, and no rewire helps | A promoted output the wrapper can't emit | Blocking entry, repair narrows (`kind: dropped`, citing the wrapper) |
| A wrapper does the work and nothing declared is lost | #723's Salmon selector | Plain `gap` entry as the enhancement note; implement the step |

Authoring is never the route in the last three rows.

**What has to change:**

- **Repair's trigger.** `repair:92` excludes "no Tool Shed wrapper picked yet", and `implement:161` excludes "a missing Tool Shed wrapper". STAR is neither. What shuts it out is the positive trigger, which covers only evidence no wired input carries: `repair:92`, `implement:161`, `ledger:89`, `ledger:154`, `content/research/galaxy-workflow-draft-format/index.md:121,128`, `content/meta/glossary.md:105`. All of these widen to "or no existing wrapper can emit it in this arrangement".
- **`advance:169`:** "no acceptable candidate" must mean nothing was found (`miss`), not nothing fits. Otherwise STAR never reaches `implement`.
- **`weak`:** `discover:68` ("or a low-quality hit"), `discover:106` ("confirm or fall through") and `author:84` ("weak enough") all let `weak` author. Remove those clauses, plus "may fall through" in the schema's `status` description.
- **`author:84`, first pass:** no ledger entry exists until `implement` runs, so the issue's exact shape (`miss` with STAR in `alternates`) reaches authoring before any gap is recorded. `author` should stop on an alternate that does the work, and say why each listed alternate doesn't.
- **`author:84`, later passes:** stop on an open `blocking` entry with this `step`. `author` declares only `summary-nextflow` as input (`author:16-18`), so its frontmatter needs the pin, the ledger and the ledger note.
- **`advance:182`:** remove authoring as an exit when the wrapper is the right tool.
- **Repair's insert path:** inserted steps go back through discover-or-author (`repair:96`). A STAR index step inserted there would `miss` into a UDT, or re-raise this same entry. An inserted producer must name an existing wrapper in `_plan_context`, or the entry stays open.

**Fold isn't expressible today.**

- The shapes are producer, sub-path and narrow (`repair:96`). The output contract is additive (`repair:23`), and the closure notes have no deletion (`content/molds/repair-galaxy-draft-topology/eval.md:11-13`). #686 doesn't add one.
- #669 lacks moving the deleted step's inputs to the consumer, and its orphaned-input rule (correction 3) would record those as dropped. A fold needs an exception.
- `repair:94` and `repair-galaxy-draft-topology/scenarios.md:21-23` keep realized steps fixed. The picker is topological, so a consumer is usually still drafty. A concrete consumer still needs a stated rule.
- For STAR the summary is enough to decide a fold. In general the command may be needed (#669 correction 4).

**The dead end.** Surrender leaves the entry open and doesn't touch the step (`repair:98`, `ledger:180`). `draft-next-step` stays `draft: true` while a drafty step remains, and `advance:159` extracts only at `draft: false`. #689's description says so directly: "The loop can't skip a blocked step." So "written into the final artifact as a labelled gap" (`ledger:180`) can't happen for such a step, and how surrendered entries surface is still open (`ledger:229`).

The surrender case also has a gate problem. The count doesn't drop, which trips `ledger:212`, while `repair-galaxy-draft-topology/eval.md:11-14` expects `surrendered` with the count falling.

Two ways out:

- **Repair deletes the step and records `kind: dropped` (recommended).** It stays in Foundry, reuses the ledger's existing kind, and builds on #669. `content/pipelines/nextflow-to-galaxy/eval.md:37-41` needs to accept it, since it only allows a pinned changeset or an authored wrapper. A consumer that truly needs the output still ends the run blocked, which is honest.
- **A skip in `nextDraftStep`.** This is an upstream change in `@galaxy-tool-util/schema`, and the output would still need somewhere to carry the gap.

For the "unresolved workflow requirement" #723 asks for, this means a `dropped` or `gap` entry. Stop only when correctness depends on a brief change (`ledger:120`).

**Caveats:**

- **Fold has a cost.** The index is rebuilt in every alignment job, so mapped over samples it would be built once per sample (inferred from `@TEMPINDEX@`, not measured). Repair should record that as a `decisions` entry.
- **The design tier may create this step.** `content/research/nextflow-to-galaxy-reference-data-mapping/index.md:95` asks for a workflow-tier build step above about 3 rebuilds. No wrapper emits a STAR index to history, so that rule plausibly produces this unbuildable step (R7's origin isn't traced). `:95` should add "only if the wrapper accepts a prebuilt index". `:102` expects discovery to surface rebuild capability, and should point at summarize.
- **Budget.** Each gap spends a `topology_repair` escalation (`ledger:196-212`), and the rnaseq run reached "escalation 8 of 8" (#670).

## 4. Name

Moot, since no status survives. The outcome is carried by the blocking ledger entry and the `hit`/`weak` pin. Prose should say "capability gap", #723's term.

If this status is kept anyway, prefer `unsuitable`: `capability-miss` reads as a kind of `miss`, the confusion this issue reports. Separately, if the enum grows for another reason, #723's "inconclusive" fits better, since search failure is something discovery can actually observe.

## Unresolved

- **Dead end:** delete and record `kind: dropped`, or skip upstream? And should a required index with no consumer to fold into end the run blocked, not as a UDT?
- **Automated runs:** under #686's controller, a STAR-style step ends `loop_blocked` with no fold, because the worker runs one skill and can't invoke repair (#686 names a repair worker as the fix). The route above works only for a harness that can run repair.
- **Classification:** "a wrapper does this work" is a judgement call, and `_plan_out` is free text. Expect some misclassification until plan fields are structured.
- **Broken wrappers:** #723's invariant blocks authoring whenever a corresponding tool exists, while `discover:106` treats deprecated repos as `weak`. #723 should say whether a broken or deprecated wrapper is an exception.
- **Budget:** should capability gaps share the `topology_repair` budget?

<details><summary>Change list for an implementer</summary>

**Schema: description text only, no enum or shape change.**

- `packages/gxwf-foundry/src/schemas/galaxy-tool-discovery/galaxy-tool-discovery.schema.json:19` says `weak` "may fall through" and `miss` means "no usable wrapper". The cast loads this schema upfront and verbatim (`discover:46-53`), so that text is a runtime instruction. Reword `miss` to "no wrapper found that does this work".
- Routine costs: `sync-schema.mjs` regenerates `galaxy-tool-discovery.schema.generated.ts` at prebuild, `make casts` refreshes the copied schema and the hash in `casts/claude/skills/discover-shed-tool/_verify.json`, and the published `@galaxy-foundry/gxwf-foundry` needs a changeset.
- Release the package with the recast. The validator exits 4 on a hash mismatch (`content/cli/foundry/validate-galaxy-tool-discovery.md:23`).

**Validator fixtures: none.** `discover-shed-tool` has no `examples/`. Optional strengthening: a rejection test for `miss` with a candidate in `packages/gxwf-foundry/test/galaxy-tool-discovery.test.ts`, which today only tests `hit` without one.

**Molds (bump `revision` and `revised`):**

- `discover`: `:68`, `:105-107`, `:115` (search the executable the need names), `:133` (drop data-manager hits, since a workflow step wouldn't pin one), `:158-160`, `:176`.
- `implement`: `:41`, `:159-161`.
- `advance`: `:134`, `:167` (pass the executable), `:169`, `:174`, `:182`, `:185` (add the green-path return to step 2).
- `repair`: `:12`, `:23`, `:92`, `:96`, `:98`, on top of #669.
- `author`: `:15`, frontmatter inputs, `:67`, `:84`.
- `content/molds/summarize-galaxy-tool/index.md:186`.

**Notes:**

- `ledger:39,89,154,188`
- `content/research/galaxy-workflow-draft-format/index.md:121,125,126,128`
- `content/research/nextflow-to-galaxy-reference-data-mapping/index.md:95,102`
- `content/meta/glossary.md:27,105`
- `content/meta/harness-pipelines.md:60,97`
- `content/meta/content-model.md:101-104`
- `content/schemas/galaxy-tool-discovery.md:51,66`
- `content/cli/foundry/validate-galaxy-tool-discovery.md:33-34`

**Evals (`## Property:` in `eval.md`, `## Case:` in `scenarios.md`):**

- `discover`: new property. A `miss` whose alternates or rationale name a wrapper that does the work is a failure. New case: a STAR index need naming STAR yields a `rna_star` candidate.
- `implement`: new property and case. A capability gap yields a blocking entry citing the pin, with no invented port.
- `advance`: narrow `eval.md:109-116`, adjust `:128-135`, add a routing property and case.
- `repair`: extend `eval.md:11-13`, add a fold property and case, and settle `:11-14` with the dead-end decision.
- `author`: revise `eval.md:27-35` and `scenarios.md:21-27`.
- `content/pipelines/nextflow-to-galaxy/eval.md:37-41`, per the dead-end decision.

Live eval runs are opt-in through `npm run test-skill`; it isn't part of `make check`.

**Regenerate and gate:**

- `make casts`. The ledger note is copied into 22 skill bundles, so expect a wide diff. Never hand-edit `casts/`.
- `make assemble-pipelines`, `make generated`, then `make check`.
- Add the changeset for the schema text. The content changes don't need one (`.changeset/README.md`).

</details>
