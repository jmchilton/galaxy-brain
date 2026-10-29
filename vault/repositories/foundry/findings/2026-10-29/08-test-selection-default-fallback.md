# Test selection on ad-hoc pipelines falls to defaults and hides input-bearing profiles: CalliNGS-NF tests one replicate

- Target: galaxyproject/foundry (the `summarize-nextflow` Mold, the `nextflow-test-case-selection` research note that owns the policy, and `packages/summarize-nextflow`). Nothing upstream. Foundry tracking needed: yes (this is the Foundry issue).
- Seen in: /home/ubuntu/foundry-runs/prose-nf2wb-callings-2026-10-29, phase 1 (summarize-nextflow, Mold rev 18 at foundry 9f83fd55), 2026-10-29. Ledger ids: `adhoc-input-profile-not-test-candidate` (gap, major), and downstream `workflow-brief-design-expert-test-input-placement`.
- Existing issues/PRs: no duplicate. Related: #67 (closed; profile selection research), PR #528 (selection policy), PR #529 (profile kinds), #211 (from_param via one-hop bindings), #666 (primary-workflow selection; same surface as the CLI's unnamed-workflow gap below). Revision collision: unmerged `jmchilton/summarize-nextflow-reference-assets` (35002353) and `jmchilton/pipeline-run-golden-funcscan` (fe8a0d88, same change) both set rev 19; neither has a PR.

## Symptom
CalliNGS-NF has no nf-test and no `test`-kind profile, so selection fell to `pipeline-defaults`. The defaults read replicate 1 only (`params.reads = rep1_{1,2}`, main.nf:38). Under them every `groupTuple` and multi-`-I` HaplotypeCaller path sees one BAM (phase1-notes.md:17-23). The in-repo `cluster` profile (nextflow.config:47, `reads = rep*_{1,2}`) is the only bundled two-replicate launch. The CLI emitted one candidate (`summary-nextflow.cli.json`). `profile:cluster` (eligible) and `profile:aws` (deferred, s3) appeared only because the LLM pass went beyond the rule. The caller then overrode the selection in the brief (Decisions).

## Root cause
The `test` kind keys only on nf-core input names, and the defaults fallback emits exactly one candidate. An ad-hoc profile that points the pipeline's own data params at other bundled data is classified `container`/`executor` and drops out of selection. The Mold already calls this out as a known limit but has no mitigation for it.

2. **Same shape one tier up (nf-core/bacass whole pipeline, /home/ubuntu/foundry-runs/prose-nf2wb-bacass-full-2026-10-29, ledger `snf-mold-whole-pipeline-scope-test-candidates`).** The tiers are exclusive: when pipeline nf-tests exist, input-bearing profiles are never emitted (Mold `index.md:370`, note `:51`, resolver `:2377-2408` returns before the profile branch). `test_full` is the only configuration enabling Kmerfinder, QUAST_BYREFSEQID and short-read Kraken2, and no nf-test uses it, yet it was added only by hand. `TestCandidate` (schema `:395-400`) has no structured coverage field, so which stages a candidate exercises or skips (no candidate covers CANU, FILTLONG, Bakta, NANOPOLISH, PYCOQC) lives only in free-text `rationale`. Fix: emit `test`-kind profiles not referenced by any nf-test as `deferred` candidates, and add a per-candidate enabled/disabled-stage field derived from `params_delta`. No PR covers it.

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

## Draft issue
**Title:** summarize-nextflow: ad-hoc input-bearing profiles vanish when test selection falls back to pipeline defaults

On ad-hoc pipelines with no nf-test, `test`-kind profiles are only those that set `params.input`/`samplesheet` or include `conf/test*.config` (summarize-nextflow index.md:281, resolver.ts:661). Selection then emits a single `pipeline-defaults` candidate (index.md:372, resolver.ts:2449-2475). A profile that points the pipeline's own data params at other bundled data never appears.

`CRG-CNAG/CalliNGS-NF`: the defaults read replicate 1 only (main.nf:38), so the per-sample `groupTuple` and multi-BAM HaplotypeCaller paths always see one BAM. Only the `cluster` profile (nextflow.config:47, `reads = rep*_{1,2}`) exercises them on bundled data. Downstream test planning cannot see that option.

Proposal:
- Keep the defaults selected. Also emit each profile whose params differ from the defaults on a data-path param (a `from_param` channel, or a path/URL default) as an unselected `eligible` candidate (`deferred` if remote-only), with only the differing params in `params_delta`.
- Update `nextflow-test-case-selection` steps 5 and 88 first, then the Mold, the CLI, `scenarios.md`, and `changes.md`.
- Separately, the CLI skips anonymous `workflow {}` blocks (resolver.ts:1268), leaving `workflow.channels` empty for CalliNGS.

Also: when nf-tests exist, input-bearing profiles none of them uses are dropped (nf-core/bacass `test_full`, the only config enabling Kmerfinder/QUAST_BYREFSEQID), and `TestCandidate` has no structured field for the stages a candidate exercises or skips. Emit such profiles as `deferred` and add a coverage field.

Acceptance: on the CalliNGS fixture the CLI emits `pipeline-defaults` (selected), `profile:cluster` (eligible, `reads` delta only) and `profile:aws` (deferred).
