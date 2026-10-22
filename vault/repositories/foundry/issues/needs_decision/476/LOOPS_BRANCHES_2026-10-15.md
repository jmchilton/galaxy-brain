# Loops and branches: controller-owned or bundled? — 2026-10-15

Question (John): do we need loop and branch constructs in the Pi controller, or can they be bundled into one step?

## What the pipelines actually contain

- **Loops.**
  - Five Galaxy pipelines have one loop phase: `advance-galaxy-draft-step`.
    - It is an orchestrator Mold. One call concretizes one drafty step: pick, resolve wrapper, summarize, implement, `draft-validate`.
    - It owns a deterministic oracle, `gxwf draft-next-step`, which reports `draft: false` when the loop is done. On that last call it also writes `galaxy-workflow.gxwf.yml`. So the harness side is `while draft: invoke skill` (`content/meta/harness-pipelines.md`, "Orchestrator-as-contract").
  - The two CWL pipelines loop over three Molds: `summarize-cwl-tool` → `implement-cwl-tool-step` → `validate-cwl`, looping back on red. That's a multi-phase loop with a back edge. `harness-pipelines.md` already says a parallel CWL orchestrator is a tracked follow-up.
- **Branch.** Every `→ GALAXY`/`→ CWL` pipeline except the reviews has one: `test-data-resolution`. The chain is a source-specific Mold → `find-test-data` → `user-supplied`.
  - It isn't really a choice. Both Molds write the same artifact (`test-data-refs`), and the second is meant to fill only the inputs the first left unresolved (`nextflow-to-test-data` description).
  - Contract gap: `find-test-data` does not declare `test-data-refs` as an input, and `test-data-refs` has no schema. So "fill only the gaps" is prose, and "is anything still unresolved?" can't be checked by machine today.
  - `user-supplied` is a human gate. In an unattended evaluation it can only end as "blocked: needs data".
- **Precedent for bundling.** The discover-or-author `[branch]` used to be harness routing. It now lives inside `advance-galaxy-draft-step`, and the Mold owns it.
- **Prose harness today.** Under `--use-subagents` it already splits the two the same way: one subagent per loop iteration, and the whole branch chain in one subagent (`pipeline-*` SKILL.md, Run options).

## Cost evidence (#547)

- One paper→galaxy run: 20 loop iterations, one subagent each.
  - 121 min wall clock; only 6.5% of it was tool execution.
  - About 65 turns per step; 125M cache-read tokens.
- Iterations that reused an already-resolved wrapper took about half as long. That reuse already flows through the draft file (sibling pins), not through conversation memory.

## Options

| | A. Controller-owned loop and branch (B6 as planned) | B. Bundle each into one worker | C. Bundle into orchestrator Molds (content change) |
|---|---|---|---|
| What changes | `test-pipeline` runs `draft-next-step` itself between iterations and walks the chain on a predicate. | One Pi worker is told to repeat the skill until done, or to run the whole chain. | New Molds own the control flow, e.g. `resolve-test-data`; for CWL, an orchestrator like the Galaxy one. The pipeline becomes linear. |
| Loop fit | Good. The oracle is already deterministic and cheap; the cap comes from the template's drafty-step count plus the ledger's repair budget. | Poor. One session accumulates about 65 turns × N steps of context (1,300 turns at N=20), which risks compaction or overflow. One timeout covers everything; one failure loses every step. | The Galaxy loop body is already this. Folding the loop itself into a Mold gives option B's context problem. |
| Branch fit | Not yet possible: no `test-data-refs` schema, so there's no machine predicate, and the gap-filling input isn't declared. | Works today; it's what `--use-subagents` does. The worker's word decides when to fall through. | Best fit. It matches the discover-or-author precedent and fixes the contract gap where it lives. It changes 5 pipelines and every harness at once. |
| #476 criteria | Meets "distinct worker per loop iteration" and "controller-owned predicates". | Breaks both. | Meets them by making the branch not a harness branch. |
| Observability | One dashboard row per iteration, with per-iteration artifacts, hashes and usage. B4 can cross-check counts. | One row; iterations visible only in the trace. | Same as B for whatever is folded in. |
| Extra controller work | Optional per-iteration outputs (`galaxy-workflow` appears only on the last call). A run-scoped writable tool cache that persists across iterations, beyond declared artifacts; container mode loses it today. Record `iterations`/`selected`. Cost caps (#547). | Almost none. | None in the controller; the Mold authoring is content work. |
| Prose-harness parity | Same split as `--use-subagents` for the loop. | Matches neither the loop nor the default mode. | Every harness gets it. |

## Recommendation

- **Loop: controller-owned (A).**
  - It's the cheap case: a deterministic oracle already exists and the body is one Mold.
  - Bundling it is the expensive case: context grows linearly and failure takes everything.
  - Prerequisites: cost caps, optional outputs on intermediate iterations, and a run-scoped tool cache.
  - CWL multi-Mold loops: skip until a CWL orchestrator Mold exists, rather than building loop-group semantics.
- **Branch: bundle (C, falling back to B).**
  - Fix the contract first: give `test-data-refs` a schema with a per-input `resolved` flag, and have `find-test-data` read the earlier refs.
  - Then either fold the chain into an orchestrator Mold (C), or run the chain in one worker (B) with a deterministic post-check that every input is resolved.
  - `user-supplied` becomes a `blocked` phase status, not a fallback the controller pretends to take.
- **Side option:** start a run at phase N from a frozen earlier run's promoted artifacts (`--from`). This tests phases 9–13 without either construct, and keeps each phase's evaluation independent of upstream noise.

## Decisions (John, 2026-10-15)

1. Bundle the branch in the harness (option B), not as an orchestrator Mold. It's easier and more flexible, and it can still be promoted to a Mold later.
2. We fix the contract ourselves.
   - Done on `origin/feat/test-data-refs-schema` (`4a8f0837`): the `test-data-refs` schema plus `foundry validate-test-data-refs`.
   - All four producers declare it.
   - `find-test-data` takes the earlier refs as an optional input and keeps their resolved entries.
   - `paper-to-test-data` now reads the interface brief and leaves expected outputs to the test plan.
   - Opened as [#684](https://github.com/galaxyproject/foundry/pull/684) on 2026-10-16.
   - 2026-10-16: rebased onto main (after the #561 release and the Workflow Brief pipelines). A Codex review found two real defects, both fixed in `28a2187d`: a resolved collection could pass with elements that carry no data; `paper-to-test-data` required a Galaxy interface that PAPER → CWL never produces.
   - Follow-up: the assembler's generic branch text ("stop at the first that yields acceptable output") doesn't describe filling gaps.

3. 2026-10-16: John chose one worker per branch leg, not one worker for the whole chain. The runner loads exactly one skill per worker, so a whole-chain worker would need runner changes. And the loop comes first: every pipeline's test-data branch sits right after the draft loop, and `--through` can't skip the loop.
   - The loop is up as [#686](https://github.com/galaxyproject/foundry/pull/686). Review fixes are in `5e1c5115` and `9d973a36`. #683 merged 2026-10-19, so #686 was rebased and retargeted to main.
   - 2026-10-19: the stall fix is on `fix/draft-step-blocked-exit` (`327616a1`), stacked on #686 and not opened as a PR yet.
     - Mold: a `TODO` step nothing fits is searched on the Shed, then authored. If that fails, the call records a blocking ledger entry for the step. It also adds a "How a call ends" section, and `repair-galaxy-draft-topology` now accepts the case.
     - Controller: an unchanged draft with an open or surrendered blocking entry for the picked step fails as `loop_blocked`.
     - Gap: the single-skill Pi worker can't invoke the repair Mold. Having the controller launch a repair worker would close it.
     - Rerun of iteration 4 alone (`~/foundry-runs/nf2g-demo-iter4-blocked-exit-2026-10-19/`, 16 turns, $0.25): draft unchanged, a new blocking entry from `advance-galaxy-draft-step` citing its searches, and no partial workflow. The controller would report `loop_blocked`. It didn't visibly try authoring a wrapper.
   - 2026-10-19: the per-leg test-data branch is on `feat/test-pipeline-test-data-branch` (`0a9557a9`), stacked on #686, no PR yet.
     - One worker per leg; it stops at the first leg that leaves nothing unresolved.
     - `branch_contract` fails a leg that writes no refs, drops one, or changes a resolved one.
     - Inputs still unresolved at `user-supplied` end the phase, trial and run `blocked`, a new status the dashboard renders.
     - Not run live: it sits behind the draft loop, which blocks on nf-core/demo.
   - 2026-10-19: subagent reviews of both branches; confirmed findings fixed.
     - Blocked-exit (`e83de78c`): only a blocking entry the call itself appended or changed counts. The ledger is read with `parseOpenRequirements`. The stock-tool branch now falls through to the Tool Shed.
     - Test-data branch (`73943547`): `runLoop` and `runBranch` share a multi-worker phase helper. Unreadable refs are a controller error. Writes record their leg, and the column reads "stopped at".
     - John chose exit code 2 for a blocked run (`121954ca`). A chain with no sentinel still ends blocked. Both branches touch `runLoop`, so the second to land needs a small rebase.
   - Opened 2026-10-19, both stacked on #686: [#689](https://github.com/galaxyproject/foundry/pull/689) (blocked exit) and [#690](https://github.com/galaxyproject/foundry/pull/690) (test-data branch).
     - 2026-10-19: the blocked-exit refinement note was dropped (`8f6ac934`); John prefers fixing the Mold directly.
     - 2026-10-20: #689 merged into #686's branch. #686 was rebased onto main (after #688), head `2e8117a5`; only generated files conflicted. #688 adds open-question `decisions:` to the ledger, which the blocker check doesn't read. #690 was rebased onto that head (`4aeafa7b`), with `ask` renamed to `attempt` in #689's code; build-cli 280 tests.
   - Live run `~/foundry-runs/nf2g-demo-through7-loop-2026-10-16/` (dashboard alongside):
     - Phases 1–6 passed. The draft had 6 drafty steps.
     - Iterations 1–3 passed, at 14–23 turns per call.
     - Iteration 4 stalled on `restore_trimmed_sample_sheet_metadata` (no wrapper found). It reported success with the draft unchanged, so `loop_no_progress` caught it.
     - Totals: 6.26M tokens, $3.37 estimated.
     - Skill finding: the Mold says to fall through to wrapper authoring or open a blocking ledger entry; the agent did neither.
     - The run needed `gxwf` pinned to the workspace 1.13.1 (Homebrew has 1.8.2) via `~/foundry-runs/bin-loop/`.
   - The controller asks `nextDraftStep` before each call and runs one worker per call, ending with the terminal call.
   - Guards: a call that leaves the draft unchanged fails the phase, and `--max-iterations` caps it (default twice the drafty steps, plus the terminal call).
   - A trial's calls share one tool cache. `--max-cost` and `--max-tokens` cap the run.
   - `run.json` records `iterations[]`, and the dashboard counts them.
   - Follow-ups:
     - `run.json` is written once per trial, so a long loop shows no progress mid-run.
     - The per-leg branch on top of #684.
     - A live `--through` run past the loop.

## Seeded runs (`--from`) — 2026-10-20

- Built on `feat/test-pipeline-seed-run` (`6331b97a`), stacked on #690, not opened as a PR. Chosen over a repair worker: the test-data legs read nothing the loop writes, and a repair could at best drop nf-core/demo's uncomputable step.
- `--from <phase-or-skill>` plus `--seed-run <dir>` (and `--seed-trial`, default 1). Seeds are the latest write of each artifact by a phase that passed in the seed run, hash-checked and copied into `seed/`. A selected phase reading an artifact last produced by a phase that didn't pass there is refused. Only phase 1 gets the scenario fixture. `selectPhases` checks only the selected range, so paper-to-cwl's branch is reachable.
- Dashboard: seeded phases read "done · from seed run" (or skipped), seeded writes are marked, and a warning names the seed run.
- Follow-up commit `08921850`: a seed run that was itself seeded passes its seed on, and a seed phase whose skill differs from this pipeline's phase at that number is refused. build-cli 290 tests. PR draft is in the session scratchpad (`pr_seed_run.md`).
- Subagent review (2026-10-20), fixes in `d4a0c56c`, build-cli 293:
  - A chained seed started earlier than its own seed silently dropped an input. Preflight now also refuses a passed producer whose non-optional output the seed has no copy of, reading producers from `declaredOutputs`.
  - `--from 1` with `--seed-run` is refused.
  - The dashboard no longer counts a skipped earlier phase's outputs as missing.
  - A shared `phaseWorkers` helper; seed copies dereference symlinks.
  - Real-seed check: `--from 8` seeds 8 artifacts, `--from 10` is refused (phase 9 never ran).
  - Left as follow-ups: recording what each trial carried in `run.json`, so seeding needn't re-derive it; a chained seed naming only the run it was seeded from; the phase check comparing skill names only.
- Live run `~/foundry-runs/nf2g-demo-branch-seeded-2026-10-20/`, seeded from the 10-16 run, `--from test-data-resolution --through test-data-resolution`: 2m20s, 23 turns, $0.45, exit 2.
  - Phases 1–6 seeded, phase 7 (failed there) skipped, so its partial `galaxy-workflow` wasn't carried.
  - `nextflow-to-test-data` left 7 inputs unresolved; `find-test-data` resolved reads, the skip-trimming flag and the reference FASTA (nf-core test-datasets).
  - Blocked on 4 optional MultiQC inputs (title, config, logo, methods description). Each ref's `reason` says the input "can be omitted" rather than invented.
  - Finding: `test-data-refs` has no way to say "omit this optional input", so the oracle treats it as needing a person. Needs a schema decision: an omitted state the oracle counts as settled, or a rule that optional inputs with no source fixture are resolved as omitted.

## Loop repair worker — 2026-10-20

- On `feat/test-pipeline-loop-repair` (`1f448b66`), stacked on the seed-run branch, no PR; draft in the session scratchpad (`pr_loop_repair.md`).
- A blocked loop call is escalated to a `repair-galaxy-draft-topology` worker. The loop resumes once the repair lowers the open blocking count, and stops `loop_blocked` if it doesn't, or at `--max-repairs` (default ledger `topology_repair.cap`, else 3). Repairs are iterations marked with `skill` and `open_blocking`. The controller doesn't write the ledger's `topology_repair` header; `run.json` counts escalations. build-cli 301.
- Live `~/foundry-runs/nf2g-demo-loop-repair-2026-10-20/` (`--from 7 --through 7`, seeded from 10-16): **the loop finished**. 8 iterations, 23m19s, $2.39. `galaxy-workflow` extracted, and `gxwf validate` passes it (3 tool steps).
  - Both repairs narrowed by removing a step: `explode_and_label_input_reads` (it 1→2) and `restore_trimmed_sample_sheet_metadata` (it 6→7). Each recorded a `kind: dropped` entry.
  - Regression signal: the 10-16 run implemented `explode_and_label_input_reads` with stock `__APPLY_RULES__` 1.1.0 on iteration 1. This run called it unimplementable and the repair dropped it. The blocked exit plus repair made giving up cheap.
  - A blocking entry was left open at the terminal call (`nf-core-demo-fastqc-zip-output-unavailable`, on `fastqc_per_read`), raised by the call that concretized FastQC. It was never escalated and never surrendered, and the controller doesn't check.
- Questions for John: a stricter cross-escalation rule; the default cap; a terminal check for open blockers; whether a narrowing repair should need evidence that the step can't be implemented.

## Stock tool versions — 2026-10-21

- Root cause of the dropped `explode_and_label_input_reads`: a Mold dead end, not cheap giving up. The step had no tool chosen; `gxwf tool-search` can't see built-ins (`'apply rules collection'` → no hits); the stock branch allowed a version only from the plan or a populated cache. 10-20 obeyed and blocked; 10-16 broke the rule by retrying `add` with 1.1.0.
- Fix on `fix/advance-draft-stock-tool-version` (`358ac959`), stacked on #686, no PR; draft `pr_stock_tool_version.md`. `advance-galaxy-draft-step` rev 9:
  - version sources, in order: plan pin, cache, a documented version on a reference page (`galaxy-collection-tools`);
  - a successful `add --tool-version` confirms the version;
  - a `TODO` step checks built-in collection ops before the Tool Shed;
  - the cast now bundles `galaxy-collection-tools`; new eval property.
- Live `~/foundry-runs/nf2g-demo-stock-version-2026-10-21/` (local `tmp/loop-repair-stock-tool-version` = loop-repair + this commit, seeded from 10-16): **passed**. 8 iterations, 24m14s, $2.81. 4 tool steps, `gxwf validate` OK.
  - Iteration 1 implemented the step with `__APPLY_RULES__` 1.1.0, citing the reference page, with no Tool Shed search.
  - Two repairs narrowed, both with evidence: FastQC ZIP output (the wrapper has only html/text), and the trimmed reads' sample-sheet metadata (Apply Rules takes one collection; an upstream gap had already predicted it). No open blocking entries at the end.
  - The FastQC ZIP blocker was escalated this time, unlike 10-20.
- Loop-repair finding: a repair worker wrote the ledger's `topology_repair` header itself, with `cap: 5` (and `escalations: 1` after 2 repairs). The controller re-read `cap` before each repair, so a worker could raise its own budget. Fixed on the loop-repair branch (`562c7edf`): the cap is read once, from the ledger the loop is handed; two new tests, build-cli 303.
- Not checked: the Apply Rules state assumes every row has a second identifier level, which may not hold for unpaired rows.
- Subagent review, both branches, 2026-10-21:
  - Loop-repair (`4fd802e6`): no repair for a surrendered-only blocker, or after the last call `--max-iterations` allows; ledger counts and cap via `parseOpenRequirements`; README corrected; tests pin that repairs don't count toward `--max-iterations` and the consume-side preflight. build-cli 306.
  - Stock-version (`5d6d6123`): the review's "add doesn't confirm the version" was half right. The shed serves Galaxy's declared equivalent on an exact miss (`WORKFLOW_SAFE_TOOL_VERSION_UPDATES`, `lib/galaxy/tool_util/version_updates.py`; `__APPLY_RULES__` 1.0.0–1.1.0), cached under the requested key. Rule now in the `add` CLI note: re-run `add` with the reported version and pin that. `summarize-galaxy-tool` aligned; `galaxy-collection-tools` named for collection ops only.
  - John's decisions (2026-10-21) on the open questions:
    - The default `--max-iterations` adds the repair cap. Built (`7445bdd9`).
    - A repair's progress is judged on its named blockers: it must resolve at least one, and removing one stops. Built (`7445bdd9`), build-cli 309.
    - `cap: 0` stays "unset", so the default of 3 applies.
    - The dashboard's loop ×N keeps counting all iterations.
    - No version source → a non-blocking gap, the draft unchanged, no repair. Built (`d25aaa75`); the controller reports it as `loop_no_progress`.
    - With several cached versions, take the one the plan's parameters need, the newest if several fit. Built (`d25aaa75`, `add.md`).

## Phases 8–10 past the loop — 2026-10-21

- Local `tmp/phase10-combined` (`c4b3ea49`, unpushed): loop-repair + omitted-state merged; README and test-file conflicts kept both sides. build-cli 311, casts and generated checks pass. The stock-version commits are left out: they touch only phase 7, which this run doesn't execute.
- Live `~/foundry-runs/nf2g-demo-phase8-10-2026-10-21/` (`--from 8 --through 10`, seeded from the stock-version run): **passed**, 11m33s, 39 turns, $0.89. This is the first run to reach `implement-galaxy-workflow-test`.
  - Phase 8: `nextflow-to-test-data` left 7 unresolved, and `find-test-data` settled them all.
  - Phase 9: the test plan validated.
  - Phase 10: the test file has no validator in the run record. `gxwf validate-tests --workflow` passes it.
- Not caught by any gate. Each is checked against Galaxy source but not run:
  - Workflow, phase 7: the Apply Rules regex `^(?:fastq_)?([12])$` runs on the second identifier. Galaxy names those `forward`/`reverse`/`unpaired`, and a miss raises (`lib/galaxy/util/rules_dsl.py:50`). So step 1 fails on any input. This confirms the unpaired-rows worry, and is wider than it.
  - Test, phase 10: no `rows:` for a sample sheet whose `sample` column is required. Galaxy's own sample-sheet tests always give `rows`. Correction: "Galaxy refuses it" was wrong for this path. `sample_sheet.py:23` fires only when `column_definitions` is passed, and test staging (`tool_util/client/staging.py`, `create_collection_func`) sends `rows` but never `column_definitions`. Whether an input that declares columns accepts a staged sheet without them is unverified.
  - Test, phase 10: unpaired rows are bare `File`s. Galaxy writes them as `paired_or_unpaired` with one `unpaired` element (`lib/galaxy_test/workflow/split_paired_and_unpaired.gxwf-tests.yml`).
  - Test, phase 10: the expected `SAMPLE*__R1/R2` element names inherit the broken rules.
  - The `implement-galaxy-workflow-test` Mold says nothing about sample sheets or `rows`.
  - Upstream, not fixed: phase 6 (`nextflow-summary-to-galaxy-template`) gave the sample-sheet input `fields: fastq_1/fastq_2`. Galaxy uses `fields` only for `record` collections (`tool_util_models/parameters.py`, `DataCollectionInternalJsonBase`). It's the likely source of the regex.
- Fixes, both pushed, no PRs:
  - `fix/advance-draft-paired-identifiers` (`3c8adb32`), on stock-version. `galaxy-apply-rules-dsl` rev 4 gives a paired level's identifiers. `advance-galaxy-draft-step` rev 10 says so in step 4 for `__APPLY_RULES__`, and bundles the note on demand. New eval property: run the rules over both variants with `rules_dsl`.
  - `fix/workflow-test-sample-sheet-rows` (`79699865`), on omitted-state. `galaxy-sample-sheet-collections` rev 3 gives the test-job form. `implement-galaxy-workflow-test` rev 12 says how to write a sample-sheet input, and bundles the note on demand. New eval property checks `rows` and the row shapes.
  - Rerun on local `tmp/rerun-7-10` (combined + both fixes): `~/foundry-runs/nf2g-demo-rerun-7-10-2026-10-21/`, `--from 7 --through 10`, seeded from 10-16. **Passed**: 10 loop iterations (2 repairs), 41m03s, 234 turns, $4.38.
    - Both fixes held:
      - the Apply Rules step matches `forward`/`reverse`/`unpaired`, and Galaxy's `rules_dsl` runs it without error (scratchpad checker);
      - the test gives `rows` per row, single-read rows are `Collection` + `unpaired`, and `validate-tests --workflow` passes.
    - New, not fixed:
      - Apply Rules names reads by the `sample` column (`add_column_from_sample_sheet_index 0`), not the row identifier. The two `SAMPLE3_SE` rows both map to `SAMPLE3_SE__R1`, so one read replaces the other: 5 FastQC reports where the test expects 6. The new eval property's uniqueness check catches it.
      - The FastQC ZIP blocker was repaired by inserting a producer, not narrowed. The next call couldn't load `author-galaxy-tool-wrapper` in a one-skill worker. It improvised a 640-byte XML wrapper in `/tmp/foundry-fastqc-archive-native.xml` (copied to the run dir), cached it as `source: local`, and pinned `toolshed.g2.bx.psu.edu/repos/foundry/fastqc_archive_native`, which doesn't exist. `gxwf validate` skips that tool state (`fetch failed`). The wrapper isn't a run artifact, so the workflow isn't installable. This is the same one-skill limit the controller solved for topology repair.
      - Phase 6's `fields: fastq_1/fastq_2` is still in the workflow.
      - Phase 9 (`nextflow-test-to-galaxy-test-plan`) mis-mapped a checksum. The snapshot (`tests/default.nf.test.snap:108`) gives `SAMPLE3_SE_sample2_R1` `05dba9…`, and the plan (`galaxy-test-plan.yml:98`) gives `1995fe…`, which is `SAMPLE1_PE_sample1_R2`'s. Phase 10 copied it into `trimmed_reads`.
      - "Passed" is the controller's status. The advance eval counts a fabricated `tool_id` as a failure.
    - Local only: `tmp/phase10-combined`, `tmp/rerun-7-10`, `tmp/loop-repair-stock-tool-version`. PR drafts `pr_paired_identifiers.md` and `pr_sample_sheet_rows.md` are in the session scratchpad.

## Controller-owned authoring — 2026-10-22

John's decisions:
- signal: a `kind: needs_tool` ledger entry;
- the author worker writes the tool inline as the step's `run:`;
- authorings share the repair cap.

- Checked first:
  - `gxwf draft-next-step`, `draft-validate --concrete --strict-state` and `draft-extract` accept an inline `run: {class: GalaxyUserTool}` step (Galaxy's `inline_user_defined_tool.gxwf.yml`).
  - A step with `run:` and TODO ports stays drafty and validates.
  - The ledger is parsed permissively (`run-ledgers.ts`), so a new `kind` needs no package schema change.
  - No pipeline uses `author-galaxy-tool-wrapper` as a phase.
- `feat/test-pipeline-loop-author`, on loop-repair, pushed, no PR; draft `pr_loop_author.md`:
  - `62766fff`: refactor, no behavior change. `repair` becomes a list of escalations (`LoopEscalation`: skill, noun, takes, check, prompt), and the ledger reads move to `blockers`. All 309 existing tests pass unchanged.
  - `e821d362`: authoring. An open `needs_tool` entry for the stalled step escalates to `author-galaxy-tool-wrapper`.
    - It must resolve the entry and leave an inline `GalaxyUserTool` `run:` with no `tool_id`.
    - A step is authored at most once, and authorings count against `--max-repairs`.
    - A version `gap` still stops `loop_no_progress`.
    - The author Mold is rev 6: optional draft and ledger in and out, and a new step 7 places the tool.
    - 8 red→green tests; build-cli 317, root 491.
- `fix/advance-draft-needs-tool` (`8b37372f`), on paired-identifiers, pushed, no PR; draft `pr_needs_tool.md`:
  - `advance-galaxy-draft-step` rev 11 records the need instead of improvising, and treats a step with an inline tool as resolved.
  - The ledger note is rev 6 and documents `needs_tool`. There are 2 eval properties.
- Live rerun: local `tmp/rerun-author` (rerun-7-10 + both branches, build-cli 319), `~/foundry-runs/nf2g-demo-author-7-2026-10-22/`, `--from 7 --through 7`, seeded from 10-16. Controller **passed**: 12 iterations, 32m44s, 219 turns, $4.22.
  - The path works. 3 `needs_tool` entries were followed by 3 author workers (iterations 4, 7, 10):
    - FastQC 0.12.1 HTML+ZIP;
    - MultiQC 1.33 over ZIPs, with `multiple: true`;
    - a Python tool that rebuilds the trimmed sample sheet, with its script in `configfiles`.

    Each next call wired the tool. There are no made-up ids and nothing in `/tmp`, and `gxwf validate` passes 5/5 with 0 skipped. No repairs ran.
  - New problem: authoring is now the easy way out. Each entry rejected an existing wrapper on exact source parity:
    - `devteam/fastqc` for having no ZIP, though its text report feeds MultiQC;
    - IUC MultiQC 1.33 for taking text, not ZIPs;
    - the sample-sheet step, which earlier runs dropped, was authored instead.

    Three unreviewed tools replaced a narrowing. Needs a decision on when an existing wrapper is close enough.
  - The Apply Rules `SAMPLE3_SE` collision is still present.
  - Live-run sections filled in `pr_loop_author.md` and `pr_needs_tool.md`.
- Collision fix, John's pick: `fc9a9dcb` on `fix/advance-draft-paired-identifiers`.
  - `advance-galaxy-draft-step` rev 11 requires mapped identifiers unique per dataset: key on `identifier0`, or add it where a column repeats.
  - `galaxy-apply-rules-dsl` rev 5 names repeating sample-sheet columns in its duplicate-path pitfall.
  - The eval adds two rows that share every column value.
  - Merged into `fix/advance-draft-needs-tool` (`505c2648`, advance rev 12) rather than rebased and force-pushed.
  - `validate-roadmap` now fails on the base commit too: the live GitHub issue hierarchy changed. That's environmental, like `check-vendored`.
  - Rerun `~/foundry-runs/nf2g-demo-collision-7-2026-10-22/` (phase 7, seeded from 10-16) on local `tmp/rerun-author` + the fix. Controller **passed**: 12 iterations, 42m15s, 207 turns, $3.97. `gxwf validate` 5/5. The fix was **not exercised**: no Apply Rules step this time.
    - `explode_and_label_input_reads` was authored instead. Its `needs_tool` claims Apply Rules "cannot conditionally rewrite them to R1/R2 or reject repeated sample-derived output identifiers". The rewrite claim is false: the previous rerun did it with `add_column_regex` replacements. Rejecting collisions was never asked for; the call made it up from the new rule.
    - The authored script repeats the original bug. It reads `"$row_dir/fastq_$mate"` (phase 6's `fields` names) where Galaxy names members `forward`/`reverse`/`unpaired`. It still labels by `${sample}`, and fails the job on a duplicate rather than making names unique.
    - FastQC was authored again for the ZIP; MultiQC used the IUC wrapper this time.
    - Two recurring causes:
      - authoring is the easy way out, and nothing checks an authored tool's runtime behavior;
      - phase 6's spurious `fields: fastq_1/fastq_2` keeps misleading later steps.

## Open questions

1. ~~Is `--from` (seed from a frozen run) wanted as an evaluation feature?~~ Built 2026-10-20 (above), pending John's review.
2. How should `test-data-refs` record an optional input a test should omit? John (2026-10-20): add an explicit omitted state, valid only for optional inputs, which the branch oracle counts as settled.
   - Built on `feat/test-data-refs-omitted` (`ec1ba0b0`), stacked on the seed-run branch, no PR yet; draft in the session scratchpad (`pr_refs_omitted.md`).
   - Schema: `omitted: true` keeps `resolved: false` (so `resolved: true` still promises data), names who omitted it and why, and carries no data. gxwf-foundry gets a minor changeset.
   - Oracle: omitted is settled; a later leg may give it data, not reopen it.
   - Molds: only `find-test-data` (rev 9) omits, after searching, with an eval property. The source legs never omit. `implement-galaxy-workflow-test` (rev 11) leaves omitted inputs unset.
   - Live rerun `~/foundry-runs/nf2g-demo-branch-omitted-2026-10-20/`: **passed**, 3m04s, $0.37. Reads resolved, 6 optional inputs omitted. The reference FASTA, fetched last time, was omitted this time; that's faithful, since the source test passes only a samplesheet and the interface says no-reference is the valid path.
   - Phase 9 seeded from that run (a chained seed, live) `~/foundry-runs/nf2g-demo-test-plan-seeded-2026-10-20/`: **passed**, 2m53s, 7 turns, $0.29. Inherited phases 1–7 plus the branch's `test-data-refs`. The test plan has 4 `unresolved` items and 2 omissions; it reads only `summary-nextflow`, and phase 10 reconciles it against the workflow.
   - The next live phase, 10 (`implement-galaxy-workflow-test`), needs `galaxy-workflow`, which nf-core/demo's draft loop never produced. The loop's blocked step (`restore_trimmed_sample_sheet_metadata`) now gates the rest of the pipeline.
