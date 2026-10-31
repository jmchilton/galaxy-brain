# Test selection on ad-hoc pipelines falls to defaults and hides input-bearing profiles: CalliNGS-NF tests one replicate

- Target: galaxyproject/foundry (the `summarize-nextflow` Mold, the `nextflow-test-case-selection` research note that owns the policy, and `packages/summarize-nextflow`). Nothing upstream. Foundry tracking needed: yes (this is the Foundry issue).
- Seen in: /home/ubuntu/foundry-runs/prose-nf2wb-callings-2026-10-29, phase 1 (summarize-nextflow, Mold rev 18 at foundry 9f83fd55), 2026-10-29. Ledger ids: `adhoc-input-profile-not-test-candidate` (gap, major), and downstream `workflow-brief-design-expert-test-input-placement`.
- Existing issues/PRs: no duplicate. Related: #67 (closed; profile selection research), PR #528 (selection policy), PR #529 (profile kinds), #211 (from_param via one-hop bindings), #666 (primary-workflow selection; same surface as the CLI's unnamed-workflow gap below). Revision collision: unmerged `jmchilton/summarize-nextflow-reference-assets` (35002353) and `jmchilton/pipeline-run-golden-funcscan` (fe8a0d88, same change) both set rev 19; neither has a PR.

## Symptom
CalliNGS-NF has no nf-test and no `test`-kind profile, so selection fell to `pipeline-defaults`. The defaults read replicate 1 only (`params.reads = rep1_{1,2}`, main.nf:38). Under them every `groupTuple` and multi-`-I` HaplotypeCaller path sees one BAM (phase1-notes.md:17-23). The in-repo `cluster` profile (nextflow.config:47, `reads = rep*_{1,2}`) is the only bundled two-replicate launch. The CLI emitted one candidate (`summary-nextflow.cli.json`). `profile:cluster` (eligible) and `profile:aws` (deferred, s3) appeared only because the LLM pass went beyond the rule. The caller then overrode the selection in the brief (Decisions).

## Root cause
The `test` kind keys only on nf-core input names, and the defaults fallback emits exactly one candidate. An ad-hoc profile that points the pipeline's own data params at other bundled data is classified `container`/`executor` and drops out of selection. The Mold already calls this out as a known limit but has no mitigation for it.

2. **Same shape one tier up (nf-core/bacass whole pipeline, /home/ubuntu/foundry-runs/prose-nf2wb-bacass-full-2026-10-29, ledger `snf-mold-whole-pipeline-scope-test-candidates`).** The tiers are exclusive: when pipeline nf-tests exist, input-bearing profiles are never emitted (Mold `index.md:370`, note `:51`, resolver `:2377-2408` returns before the profile branch). `test_full` is the only configuration enabling Kmerfinder, QUAST_BYREFSEQID and short-read Kraken2, and no nf-test uses it, yet it was added only by hand. `TestCandidate` (schema `:395-400`) has no structured coverage field, so which stages a candidate exercises or skips (no candidate covers CANU, FILTLONG, Bakta, NANOPOLISH, PYCOQC) lives only in free-text `rationale`. Fix: emit `test`-kind profiles not referenced by any nf-test as `deferred` candidates, and add a per-candidate enabled/disabled-stage field derived from `params_delta`. No PR covers it.

3. **Ad hoc sample sheets: the Mold forced `columns: []` when the source declares the header (nf-core/atacseq 2.1.2, /home/ubuntu/foundry-runs/prose-nf2wb-atacseq-2026-10-29, sample-sheet half of ledger `snf-mold-ad-hoc-samplesheet-columns-and-subworkflow-guards`).** Pre-nf-schema nf-core releases run `SAMPLESHEET_CHECK` (`bin/check_samplesheet.py`) and then `.splitCsv(header:true)` on its output (`subworkflows/local/input_check.nf:15-17`). Rev 18's `ad-hoc` branch (`index.md:304`) said `columns: []`, yet the checker states the header (`check_samplesheet.py:55-58`; 4 columns, or 6 under `with_control`). An unwired `assets/schema_input.json` lists the same 6. The CLI emits no sample sheet: atacseq's `input` has no `schema:` keyword, so the 16-11 `definitions` fix alone won't produce one. The correction pass filled the columns by judgment. The guard half of that ledger entry is 16-14. No PR covers either. cutandrun (/home/ubuntu/foundry-runs/prose-nf2wb-cutandrun-2026-10-31, ledger `snf-cutandrun-adhoc-samplesheet-columns-discarded`): same gap; `bin/check_samplesheet.py:90` pins the exact header, an unwired `assets/schema_input.json` adds types and patterns, and the run kept 5 columns against rev 19's `columns: []`. bedb13d4's revision covers it if it records the unwired schema as `schema_path` and names the checker in the description.

4. **nf-schema sheets: the row schema is not always the runtime layout (nf-core/chipseq 2.1.0, /home/ubuntu/foundry-runs/prose-nf2wb-chipseq-2026-10-30, ledger `snf-mold-nfschema-sheet-not-runtime-layout`).** The `nf-schema` branch (`index.md:301`) says "`samplesheetToList()` emits columns in property order". chipseq's `input` has `"schema": "assets/schema_input.json"` (`nextflow_schema.json:19`), but only nf-validation's param check reads it. The channel comes from `SAMPLESHEET_CHECK` → `.splitCsv(header:true)` (`subworkflows/local/input_check.nf:13-17`; TODO at `workflows/chipseq.nf:116`), and `check_samplesheet.py:168-178,231` rewrites the sheet: it adds `single_end`, folds `control_replicate` into `control` as `<control>_REP<n>`, and renames ids `<sample>_REP<n>_T<run>`. Same family as item 3, from the other side. Fix: `discovered_via: nf-schema` only when `samplesheetToList`/`fromSamplesheet` consumes the schema; otherwise use item 3's checker-header rule and record the schema as validation-only (or warn that its columns differ from the channel's). Fold into bedb13d4's revision, which edits the same paragraph. No PR covers it.

## Evidence
- Mold (origin/main): `content/molds/summarize-nextflow/index.md:281`: `test` = includes `conf/test*.config` or assigns non-null `params.input`/`samplesheet`. Line 293 states the limit (all 103 corpus `test` profiles are nf-core, none ad-hoc). Lines 368-372: fidelity order; step 3 emits "one `pipeline-defaults` candidate".
- Policy note: `content/research/nextflow-test-case-selection/index.md:51-52` (steps 4-5, same single fallback). Line 88: the array carries input-bearing profiles "or" the defaults fallback.
- CLI: `packages/summarize-nextflow/src/resolver.ts:661-662` `INPUT_DATA_PARAMS` matches only `input|input_paths|samplesheet`. Line 726 sets `test` from it. Line 2421 filters candidates to `kinds.includes("test")`. Lines 2449-2475 return `candidates: [candidate]`, the single defaults entry.
- CLI channel gap: `resolver.ts:1268` skips unnamed `workflow {}` blocks. CalliNGS's entry is anonymous (main.nf:71), so the CLI output has `workflow.channels: []`, warns "no named workflow blocks found", and carries no `from_param` for rev 19 to key on.
- Run output: profiles all `container`/`executor` in both JSONs. The final summary's `profile:cluster` `params_delta` is `{reads: rep*}` only. `cluster` restates `genome`/`variants`/`denylist` at their default values (nextflow.config:46,48-49), so a literal "reassigns" rule would list them as deltas too.

## Proposed fix
Keep the defaults selected (they run, and `cluster` adds Singularity plus `executor = 'crg'`, nextflow.config:43,53). Add the input-bearing profiles as unselected candidates:
1. Policy note, step 5 and line 88: alongside the defaults candidate, list every profile whose params differ from the entrypoint defaults on a data-path param, as `eligible` (or `deferred` when the data is remote-only). This note owns selection, so the rule belongs here first.
2. Mold step 3: cite the note. Say "differs from the default", not "reassigns", and put only the differing params in `params_delta`. Define "data-bearing" as a `from_param` channel or a param whose default is a path/URL. The second covers params passed straight to processes, such as `genome` (main.nf:75-78).
3. CLI: in the defaults branch, compare each profile's params (`candidateParamData`) with `pipelineDefaultParams` and keep the keys that `testDataRefs`/`isCandidateInputParam` (resolver.ts:2642) accept. This needs no channel extraction, so it is not blocked by the unnamed-workflow gap. Separately, parse the anonymous entry workflow (resolver.ts:1268), so `workflow.channels` is populated (relates to #666 item 1). Test: CalliNGS fixture gives three candidates: defaults selected, cluster eligible, aws deferred.
4. Move the concrete case to `scenarios.md`: extend its CalliNGS fallback case (line 141). Keep `eval.md` abstract (PR #300 split). Add a `changes.md` entry.

## Local Mold fix 0d8daf0e
Revise. The direction is right, and it matches what the LLM pass did by hand. Three problems:
- It is not sufficient. It skips the policy note, `changes.md` and `scenarios.md`, and "reassigns" over-matches.
- It has no CLI counterpart.
- It collides with rev 19 on `summarize-nextflow-reference-assets`.
Whichever branch merges second takes rev 20. Rebase this onto that branch, or onto main after it merges, and renumber the frontmatter, cast `_provenance.json` and Dashboard row. Ship it as one PR with the CLI change, so the Mold and CLI agree. Proposed branch: `issue-<n>-adhoc-input-profile-candidates`.

## Local Mold fix bedb13d4 (atacseq) and rev-19 sequencing
bedb13d4 on `pipeline-run-atacseq` is summarize-nextflow rev 19. Its `ad-hoc` branch recovers columns from a checker's expected header or a literal `splitCsv(header: [...])`, and it adds an llm-judged eval property. Verdict: keep, with revisions.
- When the header is conditional (atacseq `HEADER` depends on `with_control`), take the widest list and mark the extra columns `required: false`, naming the flag. As committed, "emit those columns … in that order" doesn't say which list to use.
- Accept an unwired `assets/schema_input.json` as corroboration, as the ledger expected.
- Put the atacseq case in `scenarios.md` and add a `changes.md` entry. The eval stays abstract, which it already is.
- No CLI counterpart is needed in this PR. Note in the Mold that the CLI emits no ad hoc entry, so the LLM pass adds it.

## Local Mold fix 9b2fd539 (chipseq)
9b2fd539 on `pipeline-run-chipseq` is also summarize-nextflow rev 19: §1 ranks the primary workflow by direct calls (`index.md:265`), §6 records config `ext.when` closures as `conditionals[]` (`:354`), plus two deterministic eval properties. Verdict: keep, revised and split.
- Primary selection: the wording is right, but the eval property is `check: deterministic` and the CLI still fails it (16-16, #666 item 1). Ship it in the CLI selection PR, not alone.
- `ext.when`: right rule, but it packs the config path and selector into the `guard` string and sets `branch: default`, which 16-14 already flags as misleading. Prefer a structured source on `Conditional` (16-19, fix 15); until the schema has one, say the prefix is a stopgap. Its eval is deterministic with no CLI support yet, so mark it llm-judged or land it with the CLI change.
- Both halves lack the chipseq case in `scenarios.md` and a `changes.md` entry.

## Local Mold fix a1d2e24a (cutandrun)
a1d2e24a on `pipeline-run-chipseq` (on top of 9b2fd539) calls itself rev 20. §3 now follows the `includeConfig` chain for params and records guarded config-time derivations (cutandrun `conf/flowswitch.config` `run_*`, `params.callers`) as `source_kind: computed` with each guard verbatim in `source_expression`, plus one deterministic eval property (ledger `snf-cutandrun-config-derived-flow-params`; CLI half is 07 cause 3). Verdict: keep, revised.
- The rule is right and the schema already has `computed`/`source_expression`, but the CLI never emits `computed` (`parseParams` writes only `nextflow_schema`, resolver `:883`), and the run's own corrected summary fails the property (derivations in `description`, `params_block`). Mark it llm-judged, or land it with 07 fix 3.
- "Follow the root `includeConfig` chain and read every `params { }` block" also reaches `conf/test*.config` through `profiles {}` and the conditional `conf/igenomes.config` catalogue. Exclude profile-scoped includes (they are `params_delta`) and `params.genomes`.
- State evaluation order: `flowswitch.config` is included after `profiles {}` (`nextflow.config:346`), so profile and command-line params feed the derivations and a candidate's effective `run_*` can differ from the default. The run could not verify this (no Nextflow).
- The eval names nf-core/cutandrun; move the concrete case to `scenarios.md`, keep `eval.md` abstract (PR #300 split), and add a `changes.md` entry. Its eval hunk is anchored on 9b2fd539's `ext.when` property, so expect a conflict when it moves ahead of 9b2fd539.

## Rev sequencing (19 onward)
Five unmerged changes claim rev 19 or 20: `summarize-nextflow-reference-assets` (35002353, §6.5; the same change is fe8a0d88 on `pipeline-run-golden-funcscan`), 0d8daf0e (this finding), bedb13d4 (atacseq), 9b2fd539 (chipseq, rev 19) and a1d2e24a (cutandrun, rev 20 on top of 9b2fd539). Their index.md body hunks are disjoint (`:265`/`:354` for 9b2fd539, `:275` a1d2e24a, `:301` bedb13d4, `:361` reference-assets, `:371` 0d8daf0e; `:354` and `:361` are close, so check the rebase). Their eval.md hunks are disjoint except a1d2e24a's, whose context is 9b2fd539's property. Conflicts otherwise arise only in the frontmatter `revision`, `_provenance.json`, `Dashboard.md` and the re-cast `SKILL.md`. Sequence:
1. reference-assets as rev 19. It is oldest, and the funcscan branch already carries it. Funcscan then rebases and drops fe8a0d88.
2. bedb13d4 (revised, plus item 4's nf-schema clause and the cutandrun `schema_path` note) as rev 20. It is Mold-only and small.
3. a1d2e24a (revised, eval llm-judged) as rev 21. Mold-only; if its eval stays deterministic, it moves to ride with 07 fix 3 instead.
4. 0d8daf0e as rev 22, in one PR with its CLI change.
5. 9b2fd539 as rev 23, split: the `ext.when` half (Mold-only once the eval is llm-judged) may go before 0d8daf0e; the primary-selection half rides with the #666 CLI fix.

Each step renumbers the frontmatter, re-casts the bundle, regenerates the Dashboard and runs `make check`. Mold gap (2), subworkflow guards in `conditionals[]` (16-14), also touches §6.5's `reference_rebuilds` (the PREPARE_GENOME index builders), so that work should follow step 1.

## Draft issue
**Title:** summarize-nextflow: ad-hoc input-bearing profiles vanish when test selection falls back to pipeline defaults

On ad-hoc pipelines with no nf-test, `test`-kind profiles are only those that set `params.input`/`samplesheet` or include `conf/test*.config` (summarize-nextflow index.md:281, resolver.ts:661). Selection then emits a single `pipeline-defaults` candidate (index.md:372, resolver.ts:2449-2475). A profile that points the pipeline's own data params at other bundled data never appears.

`CRG-CNAG/CalliNGS-NF`: the defaults read replicate 1 only (main.nf:38), so the per-sample `groupTuple` and multi-BAM HaplotypeCaller paths always see one BAM. Only the `cluster` profile (nextflow.config:47, `reads = rep*_{1,2}`) exercises them on bundled data. Downstream test planning cannot see that option.

Proposal:
- Keep the defaults selected. Also emit each profile whose params differ from the defaults on a data-path param (a `from_param` channel, or a path/URL default) as an unselected `eligible` candidate (`deferred` if remote-only), with only the differing params in `params_delta`.
- Update `nextflow-test-case-selection` steps 5 and 88 first, then the Mold, the CLI, `scenarios.md`, and `changes.md`.
- Separately, the CLI skips anonymous `workflow {}` blocks (resolver.ts:1268), leaving `workflow.channels` empty for CalliNGS.

Also: when nf-tests exist, input-bearing profiles none of them uses are dropped (nf-core/bacass `test_full`, the only config enabling Kmerfinder/QUAST_BYREFSEQID), and `TestCandidate` has no structured field for the stages a candidate exercises or skips. Emit such profiles as `deferred` and add a coverage field.

Also (nf-core/atacseq 2.1.2): the Mold's `ad-hoc` sample-sheet branch said `columns: []`, although the `SAMPLESHEET_CHECK` script declares the header (`bin/check_samplesheet.py:55-58`, plus 2 columns under `with_control`). Recover the columns from a checker's declared header, a literal `splitCsv` header, or an unwired `assets/schema_input.json`, with conditional columns marked `required: false`.

Also (nf-core/chipseq 2.1.0): the `nf-schema` branch assumes the row schema's property order is the channel layout, but chipseq's schema only validates the param; the channel is `check_samplesheet.py`'s rewritten sheet (adds `single_end`, folds `control_replicate` into `control`, renames ids). Use `nf-schema` only when `samplesheetToList`/`fromSamplesheet` consumes the schema.

Acceptance: on the CalliNGS fixture the CLI emits `pipeline-defaults` (selected), `profile:cluster` (eligible, `reads` delta only) and `profile:aws` (deferred).
