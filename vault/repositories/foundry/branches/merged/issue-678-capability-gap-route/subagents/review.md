# Review: issue-678-capability-gap-route

Reviewed `origin/main` (`94ce4ea2`) to `037cc6f0`. The hand-written commit is `b7fd2980`. I checked `casts/` only for consistency: the 22 ledger copies match `content/research/open-requirements-ledger/index.md`, and the cast schema matches the package JSON. Line numbers are at the branch head.

## Trace: a STAR-index step through advance and repair

1. **Pick.** The step is Deferred, with no entry yet.
2. **Resolve.** Discovery returns `rna_star` as `hit` or `weak`, never `miss` (`discover:109`). `weak` is confirmed (`advance:169`). Nothing sends the step to authoring.
3. **Summarize** `rna_star 2.7.11b+galaxy1`.
4. **Implement.** It appends a blocking entry naming the wrapper (`implement:171`). The `TODO_*` index port stays unbound, so the step stays drafty.
5. **Escalate** to repair. On main, repair's trigger sentence for this class says "an `add-step` carries that output, and the loop resolves its wrapper later" (`repair:118`). For STAR, the added producer is the same index step, so the loop rediscovers `rna_star` and raises the same entry. Each repair closes one entry, so the gate never trips, and the cycle repeats until the cap (P1 1). If repair instead leaves the entry open, step 1's new clause sends the re-pick straight to step 5, which works until the cap. After the cap, the entry is `surrendered`, step 1 only matches `open`, and every later pick runs discovery and implement again and appends a duplicate entry (P2 4, pre-existing).

Nothing routes this step to authoring, but nothing on main or in the branch describes the fold that would close it.

## P1

### P1 1: Repair's only stated outcome for this entry class re-creates the step it blocks

`content/molds/repair-galaxy-draft-topology/index.md:118` (main, untouched) says a chosen wrapper that lacks a declared output is closed by an `add-step` whose wrapper the loop resolves later. That fit the fastqc-zip case, where another wrapper emits the ZIP. When the blocked step is itself the producer and the named wrapper does the work inside its consumers, an added producer goes back through discovery, gets `rna_star` again under this branch's rule, and raises the same entry. The fold (remove the index step, wire the genome FASTA to the aligners, set `geneSource: history`) can be built from `remove-step`, `rewire` and `change-parameter`. But no text points to it, and `repair:138` ("leave an entry open … when a consumer truly needs the removed output") reads against it. The commit message says #753 "made [repair] able to fold or drop the step", but repair never says so.

**Fix:** add one sentence after `repair:118`: "When the entry shows the wrapper does the step's work inside its consumers, remove the step and wire its inputs to them; an added producer for the same work raises the entry again." Add a repair or advance scenario for the STAR fold: the index step removed, the aligners wired to the FASTA, the entry `resolved`, and no new index step.

## P2

### P2 1: Discovery's procedure can't reach the scenario it now claims

`discover-shed-tool/scenarios.md:9-15` expects `rna_star` as `candidate` for "build a STAR genome index". On the live Tool Shed today:

- `star genome index` returns `rna_star_index_builder_data_manager` first, and no `rna_star`.
- `star` returns `pyem_star`, then `rna_starsolo`, with `rna_star` seventh.
- `rna star` returns `rna_starsolo` (59.99) before `rna_star` (40.72).

The new "name the source executable" sentence (`discover:74`) is a hint to the caller in Inputs. The Search step still says "Issue tool-search with the need's keywords" (`discover:117`), and triage has no rule that drops data managers. Under the new rule "a wrapper that runs the named executable is never a miss", the data manager does run `STAR --runMode genomeGenerate`, so the Mold text makes it a valid `hit`.

**Fix:**
- In §1 Search: "When the need names an executable, search for it too."
- In §2 Triage: "Drop data-manager hits (`data_manager_*` repos): they are admin-only and fill a tool data table, not a history dataset a step can consume."

### P2 2: The data-manager claim in the scenario is imprecise

"The index-builder data manager isn't a workflow step" (`discover-shed-tool/scenarios.md:14-15`) is a judge-facing claim, and Galaxy doesn't mark data managers workflow-incompatible (`check_workflow_compatible` in `lib/galaxy/tool_util/abstract_tool.py:395`). What holds:

- Galaxy loads them as hidden tools (`lib/galaxy/tools/data_manager/manager.py:216`) and asserts admin access (`DataManagerTool`, `lib/galaxy/tools/__init__.py:3734`).
- The output is a `rnastar_index2x_versioned` data-table entry that `rna_star`'s `indexed` mode reads, not a history index.

**Fix:** "The index-builder data manager is admin-only and writes a tool data table, not a history dataset, so it isn't the candidate." Make it match the triage rule from P2 1.

### P2 3: A `weak` candidate that confirmation rejects has no exit

`discover:106` and `advance:169` make `weak` never fall through, and "confirm" is undefined. When confirmation rejects the candidate (a help-text-only match for another tool), `implement:171`'s "return to wrapper resolution" leads back to step 2. Step 2 reruns the same discovery and gets the same `weak`, so the loop has no exit.

**Fix (advance:169):** "A `weak` candidate that confirmation shows doesn't run the named work counts as a `miss`." This is consistent with the new `miss` definition.

### P2 4: After the cap, step 1 re-resolves a surrendered step every iteration

Step 1's new clause matches only `open` entries (`advance:159`). Once the cap surrenders the entry, the next pick of the still-drafty step runs discovery, summarize and implement again, appends a fresh entry, surrenders it, and returns. This repeats with no bound and grows the ledger. The same gap exists on main for the other step-1 categories, so it doesn't block this branch, but this branch makes it reachable for every capability gap repair can't fold.

**Fix:** either make step 1 match `open` or `surrendered` blocking entries on the picked step and return without re-resolving, or name this as a known limitation in the PR description and point to the dead-end question in #678.

### P2 5: The wrapper-choice-mismatch bucket now escalates a missing parameter as blocking

`advance:182` sends every bucket member (wrong datatype, missing parameter, collection shape) to a blocking entry and repair once no wrapper fits. Repair's trigger covers a declared output the wrapper can't produce (`repair:118`). A missing parameter has no structural fix, so repair closes nothing and escalation ends. Before this branch, that case authored a UDT. Under the maintainers' table it is a plain `gap` entry, and the step gets implemented.

**Fix:** "When it lacks only a parameter, drop that setting and append a plain entry. When it can't produce a declared output or take the shape, append a blocking entry naming the wrapper and escalate as in step 5." Then cut "Don't author a replacement for a wrapper that exists." Step 2 already says it.

## P3

### P3 1: Contradictions left on main

None of these blocks the branch, because advance only calls author on `miss`:

- `author-galaxy-tool-wrapper/index.md:67` ("unless discovery evidence is weak or missing") and `:84` ("or when the selected hit was weak enough …") still allow `weak` to author. So do `:15` and `:78` ("nothing acceptable"), `author-galaxy-tool-wrapper/eval.md:31-35` and `scenarios.md:21-27`. The branch leaves them for #773. A standalone author cast still permits authoring on `weak`.
- #773 also adds an `unsuitable` status to `discover-shed-tool/index.md:104-107` and to its author table. That contradicts the decision and conflicts textually with this branch. Ask the contributor to drop the discover hunk and the `unsuitable` rows, and keep the author §1 gate.
- `content/research/galaxy-workflow-draft-format/index.md:125` says implement detects only uncomputable outputs. Add "or that the chosen wrapper can't produce it", matching the ledger change at `open-requirements-ledger/index.md:188`.
- `summarize-galaxy-tool/index.md:186` ("when no acceptable wrapper exists") and `content/pipelines/update-interview-to-galaxy/scenarios.md:256` ("no acceptable Tool Shed wrapper"): optionally change to "on a `miss`".
- `content/research/nextflow-to-galaxy-reference-data-mapping/index.md:95` is the likely origin of the unbuildable index step. Adding "only when the consumer's wrapper accepts a prebuilt index" would prevent it. This is out of scope here.

### P3 2: Implement's port sentence is cryptic

"Bind no port that doesn't carry the output" (`implement:171`) is meant to stop `mapped_reads` being bound as the index.

**Fix:** "Leave that output's `TODO_*` port unbound, so the step stays drafty for repair." The same applies to `implement-galaxy-tool-step/eval.md`'s new property.

### P3 3: Collection shape widens the scope

"or take the step's collection shape" (`implement:171`, and the eval) reaches past #678, and repair's trigger doesn't name it. Cut it, or say why it belongs.

### P3 4: Scenario fixture details

- `discover-shed-tool/scenarios.md:11-12`: Mold inputs have no "source executable" field. Put it in the need text, e.g. need `build a STAR genome index (STAR --runMode genomeGenerate) for the aligner steps`.
- Cut "The rationale may say the wrapper has no index output." It asserts nothing.
- Note that `rna_starsolo` (`iuc/rna_starsolo`) outranks `rna_star`, so the case tests triage, or accept `rna_star` as candidate with `rna_starsolo` as an alternate.

### P3 5: Wording cuts

- `discover:68`: cut "; a `weak` hit is confirmed, not authored around". `:106` says it.
- `discover:106`: "Caller confirms the candidate before pinning; it never falls through to authoring."
- `discover:109`: four sentences, and the last repeats the first. Replace with: "Classify on what a wrapper runs, not on fit: fit depends on the step's ports, which discovery doesn't see, and [[implement-galaxy-tool-step]] checks it after summarize. A wrapper that runs the named executable is never a `miss`."
- `advance-galaxy-draft-step/eval.md:114-117`: "and then rather than guessing a wrapper" is garbled, and "either case" is ambiguous. Replace with: "the skill invokes [[author-galaxy-tool-wrapper]] only on `miss`. Authoring after `weak`, or for a found wrapper that can't serve the step, fails; that wrapper reaches [[repair-galaxy-draft-topology]] through a blocking entry naming it."
- `advance:169`, last sentence: "A found wrapper that can't serve the step goes to repair through implement's ledger entry (step 5)."

### P3 6: Schema package

A description-only change with a `patch` changeset for `@galaxy-foundry/gxwf-foundry` is right. The JSON, the generated `.schema.generated.ts`, the cast copy and the `_verify.json` hash all agree. The cast's `--schema-sha256` changes, so a validator from the current release exits 4 against the recast `discover-shed-tool` until the package is released. Say so in the PR, or release with the merge.

## Verified facts

- In tools-iuc `main`, `tools/rgrnastar/macros.xml` has `@TOOL_VERSION@` 2.7.11b and `@VERSION_SUFFIX@` 1. `@TEMPINDEX@` runs `STAR --runMode genomeGenerate` when `geneSource == 'history'`.
- `rg_rnaStar.xml:234` labels that option "Use reference genome from history and create temporary index".
- `rna_star`'s outputs (`rg_rnaStar.xml:413-435`, plus the `signal_*` outputs) include no index. The scenario's STAR facts hold.
