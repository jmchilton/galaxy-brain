# Poster pitches: CSHL Biological Data Science 2026

Four pitches for the 44×44 in poster, each with a different thesis. I mined them from John's decks: `foundry-pattern.mdx`, `gcc2026.mdx`, `gcc2026-lightning.mdx`, `foundry-pattern-in-one-minute.mdx` and `foundry-qa.mdx` in `~/projects/repositories/jmchiltondotnet/src/content/slides/` (origin/main `ac69980`). I checked the claims against the repos on 2026-10-29. I did not open the existing posters.

Path shorthand used below:
- `FP` = `foundry-pattern.mdx`
- `GCC` = `gcc2026.mdx`
- `LT` = `gcc2026-lightning.mdx`
- `QA` = `foundry-qa.mdx`
- `ASSETS` = `~/projects/repositories/jmchiltondotnet/public/slides/`
- `RUNS` = `~/projects/foundry-runs/`
- `FDY` = `~/projects/repositories/foundry` @ origin/main `9f83fd55` (2026-10-28)

## What the decks say that the posters missed

1. **The pattern is portable.** There are three Foundries, in three domains, on one shared core (`FP:1110-1584`). The Workflow Foundry is one *instance* of the pattern. It is not the whole idea.
2. **Static typing goes deeper in Galaxy.** Every workflow system validates something, but Galaxy can validate the scientific tool invocation itself (`GCC:376-377`). nf-core/rnaseq has one validation arrow, at the entrance. The Galaxy figure has arrows everywhere (`GCC:349-366`).
3. **"I don't know yet" is first-class.** Under-determination is typed (`TODO_*`, `_plan_*`), validated at the resolution it has reached, and promoted to plain gxformat2 when resolved (`LT:32-116`, `GCC:1002`).
4. **The skill is the binary.** "No serious engineering culture treats the compiled binary as the place you make changes" (`FP:257`). Skills are compiled output, not the source of truth.
5. **Progressive disclosure is a compile-time contract.** Each reference declares `load`, `mode`, `evidence` and `trigger`, and the schema refuses the shortcut (`QA:704-755`). That is what "right-sized skills" concretely means.
6. **The case against "more skills".** Blind regeneration shows that models already hold textbook skills (`FP:488-568`). Hundreds of generated skills are not hundreds of specifications (`FP:1263`).
7. **The failures are the most human part of the story.** "I seeded the Foundry wrong" (`FP:1211`); "Both moved abstraction ahead of evidence" (`FP:1371`); "A better skill mill is still a skill mill" (`FP:1288`).
8. **Hardening leaves receipts.** The TDA Foundry produced upstream PRs and issues, 17 conda recipes, and replication studies (`FP:1443-1508`). The Biopixi ladder grades how far a method has travelled into shared infrastructure (`FP:1428`).
9. **Knowing a caveat is not the same as being gated by it.** `ASSETS/foundry-pattern/knowing-gating.svg` exists but is unused in every deck, and it is the cleanest single picture of "tools decide".
10. **Format 2 is good for agents because it is good for humans** (`GCC:602-619`). This is the tagline for the whole body of work. Going by the brief's description of the existing drafts (I didn't open them), none leads with it.

---

## Pitch 1: `typed-not-guessed`

**Working title:** *Galaxy Type-Checks the Science, Not Just the Pipeline*

**Thesis (12 words):** Galaxy can type-check every scientific tool call before a single job runs.

**Audience hook.** Every genomics attendee has lost a cluster day to a typo in a tool flag. Nextflow, Snakemake and WDL validate *pipeline* parameters, while the flags inside each process stay free-form shell. The hook is a picture they already know: the nf-core/rnaseq metro map with one red "validated here" arrow at the entrance, next to the same analysis in Galaxy with arrows on every station and every track. No Galaxy experience is needed to read it.

**Sections**
1. **Validation has depth.** Every system checks pipeline inputs. Only a typed tool registry lets you check the tool call itself.
2. **Where the types come from.** The Tool Shed serves typed parameter schemas for 10,000+ community tools: names, types, select options, conditionals, collections.
3. **Format 2 makes the types writable.** The string-encoded `.ga` `tool_state` sits beside the same state as readable Format 2 YAML.
4. **Connections carry collection algebra.** `list:paired → paired` with no flatten is rejected statically. A map-over is inferred, not guessed.
5. **Same check everywhere.** CLI, VS Code, browser and CI all use one validator, sub-second on a warm cache, so an agent can repair in a tight loop.
6. **Designed for humans, so it works for agents.** One line, and the QR code.

**The one data visual.** `ASSETS/gcc2026/rnaseq-nfcore-arrows.png` and `rnaseq-gx-arrows.png`, side by side. Annotate them with **per-step coverage**: *where* the check happens, not how many parameters there are.

Don't put a parameter count against a parameter count. nf-core/rnaseq's `nextflow_schema.json` is large, so the two numbers could look similar and blur the thesis. That framing also invites the "no registry is a design choice" pushback (`vault/papers/gxwf/tasks.md:98-101`).

- **nf-core side (to compute):** of the N processes in the release that matches the diagram, count how many receive their tool flags as free-form `ext.args` strings in `conf/modules.config`. Those processes are schema-checked only at pipeline-parameter level. Method: list the `withName:` blocks that set `ext.args`, and compare them with the process count from `nextflow inspect`, or the module list in `modules.json`. Not local; fetch the tagged release.
- **Galaxy side (partly computed):** IWC `workflows/transcriptomics/rnaseq-pe/rnaseq-pe.ga` (iwc origin/main `23ccd9915`, 2026-10-29) has **15 tool steps** and **45 input connections into tool steps** (jq, verified). The figure to print is how many of those 15 steps gxwf schema-checks, and how many of the 45 connections. Get both from `npx --yes --package @galaxy-tool-util/cli@1.15.0 gxwf validate rnaseq-pe.ga --connections --strict --json`, reading the `ok`/`skip` fields. **To run.**
- **Sanity bound only:** a rough Python leaf count of raw `tool_state` gives 246 literal parameter values plus 43 connected or runtime values. Raw state can contain stale keys. Not for copy.

The caption says: "Pipeline entrance checked vs. every tool call checked." This is depth, not "Nextflow is bad".

**Pending wording check:** gxwf reports a `skip` count. If the rnaseq-pe run, or `validate-tree` over IWC, shows nonzero skips, change "every" in the thesis to "each".

**Fact sheet**

| Claim | Source |
| - | - |
| "Every workflow system validates something. Galaxy can validate the scientific tool invocation itself." | `GCC:376-377` |
| Typed schemas *served* for 10,000+ Tool Shed tools. Word it as "served", not "validated": it is a community footprint, not a validation footprint. | `GCC:408`; `galaxy-brain/vault/papers/gxwf/manuscript.md:5,146`; caveat at `vault/papers/gxwf/tasks.md:98` |
| "Sub-second on representative workflows once the tool cache is warm." The slide's "milliseconds" (`GCC:410`) is stronger. Quote the manuscript, or time it and print the method. | `manuscript.md:162` |
| Capability table: per-tool parameter validation, Galaxy yes vs Nextflow, Snakemake and WDL no; per-connection validation, Galaxy yes, WDL partial. | `manuscript.md:136-145` (Table 1) |
| nf-core modules hold I/O metadata but no parameter schemas. The manuscript says "roughly 1,300 modules"; the local `nf-core-modules` clone (2026-05-10, not fetched) has 1,815 `main.nf`. Use no count, or recount at origin. | `manuscript.md:146` |
| IWC pe-artic-variation: "Tool state: 25 validated, 0 skipped; Connections: 46 ok, 0 invalid". The structure matches (25 tool steps and 46 input connections by jq), but the gxwf output is **slide text only. To run.** | `GCC:512-518`; `iwc .../pe-artic-variation.ga` |
| Illegal select value `BAMX` caught, with the legal options listed. This is an illustrative example. | `GCC:485-495`; `ASSETS/gcc2026/gxwf-vscode-tool-state-validation.png` |
| Real strict validation result: DengueSeq `tool_state ok 7, fail 0`, connections valid; bacass `ok 6`, connections `ok 6`. Show this as "a real report", not as a success rate. | `RUNS/dengueseq-denv3/dengueseq-denv3-galaxy/galaxy-workflow-validation-result.json`; `RUNS/bacass-sr-assembly/bacass-sr-assembly-galaxy/galaxy-workflow-validation-result.json` |
| IWC corpus: 133 `.ga` workflows on origin/main. The manuscript's corpus results are still `[NUMBER]`. **To compute:** `gxwf validate-tree workflows/ --connections --strict --report-markdown`. | `iwc` `git ls-tree`; `manuscript.md:86` |
| gxwf has 24 subcommands and 10 npm packages. | `manuscript.md:96` |

**Reusable assets**
- `ASSETS/gcc2026/rnaseq-nfcore-arrows.png`. This is nf-core artwork under CC-BY, so it needs attribution.
- `ASSETS/gcc2026/rnaseq-gx-arrows.png`
- `ASSETS/gcc2026/gxwf-vscode-tool-state-validation.png`, `gxwf-vscode-select-value-completion.png`, `gxwf-vscode-state-key-completion.png`
- The `.ga` vs Format 2 snippet pair at `GCC:384-403`, re-typeset.

**Deliberately left out**
- DengueSeq as a story.
- Molds and casting.
- The draft format, except one line.
- Agents, beyond one closing line.
- Every Foundry corpus count.

This poster is about Galaxy's type system. The Foundry appears only as "what an agent does with it".

**(a) Transit map.** The nf-core/rnaseq figure already *is* a metro map, so use the metaphor literally.
- **Lines:** two parallel lines run the same RNA-seq journey. The top line is nf-core/rnaseq, redrawn or credited. The bottom line is the IWC rnaseq-pe topology, laid out from `gxwf mermaid rnaseq-pe.ga`.
- **Stations:** tool steps. On the Galaxy line, each station has a turnstile marked with its parameter count, from the gxwf run. On the nf-core line there is a single ticket gate at the FASTQ entrance (nf-schema).
- **Interchanges:** places where the collection type changes shape (`list:paired` → map-over → reduction). Mark the track gauge on each segment.
- **Termini:** "validated before compute".

This is a *comparison* structure, not a journey: two lines, one route. That is a different layout from the other pitches' maps.

**(b) Run receipt.** A receipt of **one `gxwf validate --connections --strict --json` run over IWC `rnaseq-pe.ga`**, pinned to `@galaxy-tool-util/cli@1.15.0`:
- one line item per step: `tool_id@version · N params · PASS`;
- one line per connection, with its collection type;
- subtotal `Connections: N ok, 0 invalid`;
- the punchline total `Jobs run: 0 · CPU-hours: 0`;
- one "VOID" line: a planted `BAMX` typo with the expected values printed, as on the slide.

The command exists (`galaxy-tool-util-ts/packages/cli/src/programs/gxwf.ts`), but this report has **not been run. To run.** A verified fallback is `RUNS/bacass-sr-assembly/bacass-sr-assembly-galaxy/galaxy-workflow-validation-result.json`. It records the exact command (`gxwf validate … --json --connections --strict`, cli 1.13.1), `tool_state ok 6` and `connections ok 6`. The validation passed; that run's later test failed, so print only the validation report.

**Copy budget:** about 300 words. The figure does the arguing.

---

## Pitch 2: `known-unknowns`

**Working title:** *Make "I Don't Know Yet" Checkable: A Draft Format for Agent-Built Workflows*

**Thesis (13 words):** Make "I don't know yet" a typed, checkable state, then burn it down.

**Audience hook.** Anyone who has watched an LLM confidently invent a tool flag knows the failure: a plan that looks finished but isn't. This poster shows a format where the agent is *required* to mark what it doesn't know. A validator checks everything else and skips only the marked gaps, so the gaps get resolved one at a time. A Rumsfeld quote at 3 m will stop people.

**Sections**
1. **Known knowns, known unknowns.** A workflow plan has parts you can fix now (inputs, steps, edges, `when:` guards) and parts you can't yet (tool IDs, versions, ports).
2. **`class: GalaxyWorkflowDraft`.** `TODO_*` sentinels defer explicitly, and `_plan_*` fields carry the intent forward. Show the YAML from `LT:49-69`.
3. **Valid at every resolution.** `gxwf draft-validate` checks what is concrete against real tool schemas and skips what is deferred.
4. **The draft tells you what's next.** `gxwf draft-next-step` picks the next unresolved step, so the format drives the loop.
5. **Promotion.** A fully resolved draft promotes to ordinary gxformat2 with no translation layer.
6. **Rails, not reminders.** Upstream schemas are inherited as contracts and enforced as rails. The model translates and repairs; the tools validate.

**The one data visual.** An **under-determination burn-down chart** from two real runs' per-phase git history, two series per run.
- **DengueSeq** (`RUNS/dengueseq-denv3/dengueseq-denv3-galaxy`, 7 `advance-galaxy-draft-step` commits `80de2f3`…`b82fa5e`):
  - lines containing `TODO`: 46 → 40 → 36 → 29 → 18 → 13 → 5 → 0;
  - `_plan_` lines: 28 → 24 → 20 → 16 → 12 → 8 → 4 → 0.
- **bacass short-read assembly** (`RUNS/bacass-sr-assembly/bacass-sr-assembly-galaxy`, commits `1da586d`…`367fc33`, then `draft-extract` at `ad86a85`):
  - `TODO` lines: 9 → 8 → 1 → 0;
  - `_plan_` lines: 12 → 8 → 4 → 0.

Method: `git log --reverse -- galaxy-workflow-draft.gxwf.yml`, then `git show <c>:./galaxy-workflow-draft.gxwf.yml | grep -c TODO` and `grep -c _plan_` (verified 2026-10-29). These are **line counts**, and header comments can contain "TODO". Before print, re-derive the exact counts of unresolved sentinels per commit, either with `gxwf draft-validate --json` or by parsing the YAML for `TODO*` values. Plot the x-axis as "advance step", not time.

Keep pass/fail *off* this chart. bacass's `workflow-test-result.json` says `fail` (graph assertion). The chart shows resolution, not correctness.

**Fact sheet**

| Claim | Source |
| - | - |
| Concrete now / deferred explicitly / intent carried forward. | `LT:32-72`; `GCC:962-1004` |
| `draft-validate` skips deferred parts, "so every intermediate plan is valid at the resolution it has reached". | `LT:93` |
| `draft-next-step` output example (`step 3 filter significant peaks [deferred]`). This is an illustrative example. | `LT:107-112` |
| "A fully resolved draft promotes to ordinary gxformat2 with no translation layer." | `GCC:1002` |
| Loop: `while draft-next-step says draft: advance-galaxy-draft-step; draft-validate --concrete`. | `GCC:1034-1037`; `FP:1058-1060` |
| Commands exist: `draft-next-step.ts`, `draft-validate.ts`, `draft-extract.ts`. | `galaxy-tool-util-ts` origin/main `packages/cli/src/commands/` |
| "Schemas are inherited as contracts and enforced as rails"; "The schema travels with the skill. The deterministic runtime owns the verdict." | `FP:1016,1046` |
| "Turn upstream interfaces into deterministic agent rails"; "The model translates and repairs. Independent tools select, validate, execute, and classify." | `FP:1064,1092` |
| Burn-down series (above). | `RUNS/.../dengueseq-denv3-galaxy` and `RUNS/.../bacass-sr-assembly-galaxy` git history |
| bacass run phases 0–11 as commit messages. | `git -C RUNS/bacass-sr-assembly/bacass-sr-assembly-galaxy log` |
| The DengueSeq *brief* reviewer was John Chilton, a poster author. That was a review of the workflow brief, not of the draft. Only needed if DengueSeq gets named. | dossier §4 |
| Honest counterpoint: "A validated workflow that nobody has run is a strong hypothesis about an analysis. It is not the analysis." | `QA:466` |

**Reusable assets**
- `ASSETS/gcc2026/foundry-mobile-reformat-draft.png`, the draft with solid concrete steps and a dashed deferred overlay. This is the hero image.
- `ASSETS/gcc2026/foundry-mobile-reformat-extracted.png`, the promoted spine.
- `ASSETS/gcc2026-lightning/rumsfeld-unknowns.jpg`. Check its licence before print; prefer quoting the text rather than reproducing the photo.
- `ASSETS/gcc2026/foundry-site-interview-to-galaxy.png`
- Draft YAML from `LT:49-69`, re-typeset.

**Deliberately left out**
- The Foundry pattern, KB, Molds and provenance: one line at most.
- Static-typing comparisons with Nextflow.
- Corpus counts.
- DengueSeq as a story. It is one of two series on the chart, named only in the caption.
- The open-requirements ledger and the recompile loop.

**(a) Transit map.** Use the runs' shared phase names: real stations that several runs pass through.
- **Lines:** three runs, DengueSeq, bacass and demo-qc-trim. Each has a per-phase git log with the same Mold-named phases: `workflow-brief-to-galaxy-interface` → `data-flow` → `compare-against-iwc-exemplar` → `workflow-brief-to-galaxy-template` → `advance-galaxy-draft-step` ×N → `draft-extract`.
- **Track style:** dashed while the draft has unresolved sentinels, solid after.
- **Loop:** `advance-galaxy-draft-step` is a loop track with N stations, one per real commit (7, 4 and 2).
- **Interchange:** `discover-or-author`, where a Tool Shed hit continues and a miss branches to "author wrapper".
- **Terminus:** `class: GalaxyWorkflow` (promotion). End the map *there*. Do not continue to test outcomes.

**(b) Run receipt.** A receipt of **one run's draft loop**: the DengueSeq `git log --reverse` for phases 4–5, with one line item per `advance-galaxy-draft-step` commit:
- `SHA · step resolved · TODO lines before→after · _plan_ before→after`;
- a running "balance due" column, where unresolved items count down to `0.00`;
- the final line `PROMOTED: class GalaxyWorkflowDraft → GalaxyWorkflow`.

Render it from `git -C RUNS/dengueseq-denv3/dengueseq-denv3-galaxy log` plus the `git show` counts above. That data is verified. Optionally, add a column from a replay of `gxwf draft-next-step --json` at each commit, naming the next step. **To run** (the command exists).

**Copy budget:** about 320 words. The YAML and the chart carry it.

---

## Pitch 3: `skills-are-binaries`

**Working title:** *Agent Skills Are Binaries. Keep the Source.*

**Thesis (12 words):** Don't hand-edit agent skills: compile them from a knowledge base people read.

**Audience hook.** Every lab is now accumulating `SKILL.md` files, and many people have seen repos with hundreds of them. This poster gives the software-engineering answer a bio-data-science crowd already believes: you don't edit the binary. It shows that a model can rewrite textbook skills from memory, so the value lies elsewhere: provenance, and checks that actually fire.

**Sections**
1. **The binary analogy.** Skill = binary, KB = code, casting = compiler, provenance = build log.
2. **Restating the textbook is a commodity.** In blind regeneration, a model rewrote a deleted skill from the topic alone, and the light page came out *better*. Two skills, so it is not a benchmark.
3. **Right-sized: a Mold is one action.** It is a typed reference manifest plus a thin procedure. Each reference declares `load`, `mode` and `evidence`, so progressive disclosure is a compile-time contract.
4. **One note, many skills.** A caveat lives in a single note that many skills cite, so you maintain one source instead of N copies. This is a maintenance-cost claim; don't narrate a recompile event.
5. **An oracle, not a test suite.** `eval.md` properties are run deterministically (`gxwf validate`, `planemo test`). "Not run" counts as a failed trial. One proof point: "A false miss passes every static check". A Tool Shed search for `integron_finder` found nothing, but the wrapper existed, so only an executed oracle can catch that. Frame it as an oracle point, not a loop story.
6. **Every claim has a receipt.** The `_provenance.json` hashes both sides of every reference.

**The one data visual.** A **"one note → many skills" fan-out** from the real cast provenance:
- `galaxy-workflow-testability-design` → 20 casts
- `iwc-test-data-conventions` → 12
- `galaxy-collection-semantics` → 11 (plus 11 for its `.yml` companion)
- `galaxy-data-flow-draft-contract` → 10
- `iwc-shortcuts-anti-patterns` → 9

Method: `jq -r '.refs[]?.src' FDY/casts/claude/skills/*/_provenance.json | sort | uniq -c | sort -rn`, computed 2026-10-29. I skipped the top entry, `open-requirements-ledger` (22), so the ledger doesn't take over again.

A thin side bar shows the aggregate over all 69 casts: **360 reference entries**, of which:
- by load: **226 on-demand vs 134 upfront**;
- by mode: **326 verbatim vs 34 sidecar**;
- by evidence: **223 corpus-observed, 104 hypothesis, 33 cast-validated**.

Entries are per cast, so a shared note is counted once per cast that cites it. Print that next to the figure. The "104 hypothesis" figure is honest and interesting: the system *labels* how much it trusts each reference.

**Fact sheet**

| Claim | Source |
| - | - |
| "No serious engineering culture treats the compiled binary as the place you make changes." | `FP:257`; `foundry-pattern-in-one-minute.mdx:17` |
| Binary/code/compiler/build-log analogy. | `FP:197-220` |
| KB, Mold (kind, load policy, placement), Cast (scoped, isolated, frozen), Provenance. | `FP:95-193` |
| Blind regeneration: 2 skills; spine and defaults reproduced verbatim; decision-grade page 85–90% recovered; light page "the blind version was better"; more validity caveats than the original; citations reproduced but unverifiable. Say "two skills" on the poster. | `FP:488-568` |
| "Restating canonical knowledge is a commodity. Traceable, check-backed knowledge is not." | `FP:589-592` |
| "Skills are the wrong source of truth": six failure modes. | `GCC:655-686` |
| Hundreds of skills are not hundreds of specifications: never run, inputs undefined, no test path. | `FP:1263-1280` |
| `trigger` is required when `load: on-demand`, and `verification` when `evidence: hypothesis`. | `QA:724` |
| Progressive disclosure as a compile-time contract. | `QA:750` |
| Cast bundle layout: `SKILL.md`, `_provenance.json`, `_required_tools.json`, `_verify.json`, `references/`. | `QA:789-797`; verified in `FDY/casts/claude/skills/discover-shed-tool/` (which also has `_feedback.md`) |
| 56 Molds, 69 casts (56 Molds + 13 pipeline harnesses), 51 `eval.md` and 46 `scenarios.md` across `content/`. The slide's 47/47/7 (`QA:542`) is stale. Footnote the date. | `FDY` origin/main `9f83fd55` `git ls-tree`; dossier §4 corpus table |
| Reference stats and fan-out (above). | `FDY/casts/claude/skills/*/_provenance.json` |
| False miss: `integron_finder` returned no hits, while `integron finder` scores 34.60 → `iuc/integron_finder` changeset `5429646e486d`. Closed by `decision: eval-add`, a new `eval.md` property and a recast. | `FP:1754-1785`; commit `73af1f62` (2026-06-17) changed `eval.md` (+11), the Mold and `_provenance.json` |
| Orbit companion study: a rule given only in the prompt was followed in 0/15 graded runs, with open-weight models. Attribute it to Baker et al. 2026 (doi:10.64898/2026.10.26.761864), never to the Foundry. | dossier §3.5 |
| Pinecone Nexus independently converges on the same diagnosis. Optional. | `FP:288-295` |
| Only one cast target exists today (`casts/claude`). "Targets change the package" (`FP:631-638`) is a design property, not a shipped multi-target fact. | `FDY` `git ls-tree casts/` |

**Reusable assets**
- `ASSETS/foundry-pattern/foundry-machine.svg`. This is the hero. Its text already reads "the receipt a model cannot regenerate".
- `ASSETS/foundry-pattern/knowing-gating.svg`, beside the Orbit 0/15 line.
- `ASSETS/foundry-pattern/circle-sorting.svg`, small, for the "commodity" section.
- `ASSETS/foundry-pattern/foundry-skills-install.png`. Its counters are stale (7/47/47), so re-screenshot or crop them out.
- Mold frontmatter and reference YAML from `QA:637-716`.

**Deliberately left out**
- Galaxy-specific workflow detail, DengueSeq and the draft format. Galaxy is the example domain, named once.
- Other Foundries.
- **The recompile narrative:** the hash-change story, PR #701 and the "fix → recast" loop. It had a big role on the earlier posters. One line at most.
- The **names of other skill repos.** bioSkills has 562 `SKILL.md` at origin (2026-08-15) and ClawBio has 110 (2026-10-29). Calling named projects "skill mills" on a CSHL poster is risky. Use the unnamed framing "repos with hundreds of generated skills", or omit it.

**(a) Transit map.** A map of knowledge flowing into skills.
- **Lines:** reference kinds, drawn as six lines whose widths match their counts: research (217), schema (65), cli-command (34), pattern (33), cli-tool (9), prompt (2).
- **Stations:** notes. The busiest stations are the shared notes from the fan-out.
- **Interchange:** *Cast*, the single big station every line passes through. Each line changes style there, from on-demand (dashed) to upfront (solid), following that reference's `load`.
- **Termini:** individual skills, such as `discover-shed-tool` and `validate-galaxy-workflow`.
- **Inspection gates:** an `eval.md` check on the approach to each terminus.

This is a *convergent* network, many lines into one hub, not a journey.

**(b) Run receipt.** A receipt of **one cast**: `FDY/casts/claude/skills/discover-shed-tool/_provenance.json` (verified).
- **Header:** `MOLD discover-shed-tool · rev 5 · content_hash 05c99cba…` · `commit 63a3f9cf…` · `cast_at 2026-09-13`.
- **Line items:** one per `refs[]` entry, as `kind · load · mode · evidence · src_hash → dst_hash`.
- **Footer:** `cast_history` rev 1–5 as prior transactions.
- **"Terms and conditions":** `_required_tools.json` (gxwf `^1.15.0`, `availability_check`) and `_verify.json` (validator with a pinned schema sha256).

Render from the file itself, not the slide. The slide's commit `0f259e8…` (`QA:815`) is out of date.

**Copy budget:** about 380 words. This pitch argues more, so it gets the most text.

---

## Pitch 4: `your-edge-here`

**Working title:** *A Foundry for Your Field's Edge: Agents, Knowledge, and Checks Beyond Galaxy*

**Thesis (12 words):** Models already know the textbook. Build a Foundry for your field's edge.

**Audience hook.** This is the only pitch that isn't about Galaxy, which suits a CSHL crowd working in assembly, population genetics and ML. The same pattern ran in three domains: workflows, statistical genomics, and topological data analysis for structural bioinformatics. It produced replications, upstream bug reports and conda recipes, and one instance was an instructive failure. Attendees can apply it to their own subfield on Monday.

**Sections**
1. **Inside the circle vs. the edge.** A frontier model writes established knowledge well, and progress happens at the dent. Use Matt Might's figure, with its CC BY-NC licence, or `circle-sorting.svg`.
2. **One small core, three big applications.** Show the three rings diagrams: the pattern at the center, foundry-lib around it, and the domain supplying the "meaning of correct".
3. **Derive abstractions from a second application.** Fresh agent context breaks that rule. "Both moved abstraction ahead of evidence."
4. **I seeded the Foundry wrong.** The Statistical Genomics Foundry tried to do four jobs, and "a better skill mill is still a skill mill".
5. **Hardening leaves receipts.** The TDA Foundry reports replications as reproduced, partially reproduced and inconclusive. It filed upstream PRs and issues and built 17 conda recipes. A paper becomes a guarded Mold.
6. **Installing is a measurement.** The Biopixi ladder runs L0 → L4, and a citation audit runs on every build.

**The one data visual.** The **three `foundry-rings-*.svg` side by side**: one shared core, three different outer rings. Under them, a 3 × 12 dot matrix of foundry-lib packages against Foundries, from each repo's `package.json` (verified 2026-10-29):
- Workflow Foundry uses **9 / 12**;
- Statistical Genomics uses **9 / 12**;
- TDA uses **12 / 12**. Only TDA adds `audit-base`, `audit-citations` and `source-note`.

Method: grep `@galaxy-foundry/<pkg>` in every `package.json` at each repo's origin/main. The matrix makes "share converged mechanics, keep domain meaning local" (`FP:720`) countable.

**Fact sheet**

| Claim | Source |
| - | - |
| "A pattern for pushing into a domain with agents… not a turnkey solution or one-size-fits-all infrastructure." | `FP:1570-1581` |
| "Knowledge about a domain… should reflect the structure of the domain itself." | `FP:1580-1582` |
| Inside the circle, AI-generated skills are mostly fine; progress happens at the dent. | `FP:309-468` |
| "Share converged mechanics. Keep domain meaning local." | `FP:720` |
| foundry-lib has 12 packages (`audit-base`, `audit-citations`, `cast`, `content-reader`, `kind-manifest`, `kind-schema`, `license-policy`, `reference-contract`, `site-kit`, `source-note`, `tag-registry`, `wiki-links`). | `foundry-lib` origin/main `packages/` |
| Adoption matrix 9/9/12. | `package.json` in `foundry`, `statistical-genomics-foundry`, `topological-data-analysis-bioinformatics-foundry` (remote `jmchilton/bio-topo-foundry`) |
| Derive abstractions from a second application; fresh context breaks the equivalence; the second Foundry diverged at every level. | `FP:1138-1203` |
| "I seeded the Foundry wrong"; four jobs at once; "A better skill mill is still a skill mill". | `FP:1211-1305` |
| "Both moved abstraction ahead of evidence" (foundry-lib extracted early; one-prompt bootstrap). | `FP:1358-1371` |
| TDA upstream: petls-pytorch#1 merged and released; TopoQA#1 open; PETLS#2 open (licence). | `FP:1449-1460`. Re-check status at print |
| 17 local conda recipes, 12 verified, staged-recipes#34367 submitted. | `FP:1464-1469`; 17 recipe files in TDA `content/recipes/`. Re-check the PR at print |
| Replications: TopoQA reproduced (with caveats), TopoMetry partially reproduced, HiPoNet inconclusive (67.27% vs 90.90%). | `FP:1498-1500` |
| `score-docking-poses` Mold: "A prediction, not measured DockQ or biological validation." | `FP:1519-1525` |
| TDA corpus (`.md` files): 35 environments, 24 packages, 17 recipes, 7 methods, 6 papers, 3 replication experiments, 1 Mold. | TDA origin/main `content/*` |
| Citation audit: now **104 resolved, 0 mismatched, 98/104 verified against a described work**. The slide's 78/78 (`FP:1852`) is stale. The 3 wrong DOIs it caught are historical. | TDA `audit/citation-audit.md`; `FP:1873-1889` |
| Fabricated-reference base rates: 1 in 277 PubMed papers (early 2026, CITADEL, Topaz et al., *Lancet*); 1 in 20 NeurIPS 2025 papers. Third-party figures; cite them. | `FP:1799-1806` |
| Biopixi L0–L4; "L1–L3 decidable from the lockfile; L4 needs observation." | `QA:855,880`; `biopixi-ladder-infographic.svg` |
| "Installing is a measurement" (unsolvable closures, `cmake <4`, name collisions). | `QA:897-902` |

**Reusable assets**
- `ASSETS/foundry-pattern/foundry-rings-galaxy-workflow.svg`, `foundry-rings-statistical-genomics.svg`, `foundry-rings-tda-bioinformatics.svg`. These are the hero.
- `ASSETS/foundry-pattern/foundry-concentric-responsibilities.svg`
- `ASSETS/foundry-pattern/circle-sorting.svg`; `phd-zoom.jpg` (Matt Might, CC BY-NC 2.5, credit required)
- `ASSETS/foundry-pattern/biopixi-ladder-infographic.svg`, `biopixi-mark-transparent.png`
- `ASSETS/foundry-pattern/foundry-lib-homepage.png`

**Deliberately left out**
- Galaxy workflow internals: gxwf, the draft format, typing and DengueSeq. The Workflow Foundry is one ring, labelled "the first instance".
- Orbit and Hokken.
- Any claim of benchmark success: replications are reported with their honest verdicts.

**(a) Transit map.** A network with one trunk and three branches.
- **Trunk:** the pattern itself, with stations KB → Mold → Cast → Check.
- **Shared stations:** the 9 foundry-lib packages that all three Foundries use. These are real, from `package.json`.
- **Three lines:**
  - Workflow, terminating at "gxwf + Planemo";
  - Statistical Genomics, with a terminus at "critique today / calibration target". After the "seeded wrong" station, add a **transfer** to the TDA line labelled "stepped back: new repository" (`FP:1312-1318`). The reset carried on in the TDA Foundry; don't draw it as a closure.
  - TDA, terminating at "locked environments + replication". Only this line serves the `audit-citations` and `source-note` stations.
- **Branch line:** Biopixi's L0 → L4 leaves the TDA line, with its terminus at "observed BioContainer". It connects to Galaxy's tool-requirements line as an interchange (`QA:918-925`).
- **Empty dashed fourth line:** "your domain". This is the call to action.

**(b) Run receipt.** A receipt of **one TDA citation-audit run**: `topological-data-analysis-bioinformatics-foundry/audit/citation-audit.md`, plus `audit/provider-evidence.json`. It is verified and committed, and the deck notes it carries no timestamp, so it diffs cleanly.
- **Line items:** one per cited identifier, as `source file:line · DOI · resolved work · ✓`.
- **Totals:** `resolved 104 · mismatched 0 · unverifiable 6`.
- **Footer:** "re-run weekly by `citation-audit.yml`; `pnpm validate` replays offline".
- **Optional "corrections" stub:** the three historical wrong DOIs (`FP:1876-1885`).

A different structure would also work: three short receipts side by side, one per Foundry, each a different artifact. Workflow: a cast `_provenance.json`. Statistical genomics: one referee cast, e.g. `statistical-genomics-foundry/casts/claude/skills/audit-batch-design-validity/_provenance.json` (exists; 11 audit casts with provenance at origin/main). TDA: the citation audit. That shows "same pattern, different meaning of correct".

**Copy budget:** about 400 words. This pitch has the most sections and the least shared vocabulary, so keep every section to two sentences.

---

## How these pitches differ

| | Center of gravity | Hero figure | Galaxy's role | DengueSeq |
| - | - | - | - | - |
| `typed-not-guessed` | Topics 2, 3: types and Format 2 | nf-core vs Galaxy arrows, plus counts | the subject | absent |
| `known-unknowns` | Topic 6: the draft format | burn-down chart from two runs' git history | the substrate | one series, caption only |
| `skills-are-binaries` | Topics 4, 5, 7: compiled, right-sized skills and oracles | one note → many casts fan-out | the example domain | absent |
| `your-edge-here` | Topics 1, 7: the pattern across domains | three rings and a foundry-lib matrix | one instance of three | absent |
