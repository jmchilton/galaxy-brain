# find-test-data never checks that candidate reads fit the workflow's library protocol: smrnaseq test reads carry 4N ends

- Target: galaxyproject/foundry (`find-test-data` Mold; `nextflow-to-test-data` shares the gap). Nothing upstream: nf-core/smrnaseq's test profile is consistent with its own goal ("check pipeline function", miRDeep2 skipped). Foundry tracking needed: yes.
- Seen in: `~/foundry-runs/prose-wb2g-smrnaseq-v0-2026-10-25` (misdiagnosis + skip) and `/home/ubuntu/foundry-runs/prose-wb2g-smrnaseq-v1-2026-10-29`, phase 6 (find-test-data rev 8, content hash `854238ae…`, foundry `2f8792a6`), 2026-10-29. Ledger id `find-test-data-no-library-layout-check` (gap, major).
- Existing issues/PRs: no duplicate. Searched issues/PRs for find-test-data, adapter, read layout, subset, miRNA, smrnaseq, UMI. Related: #575 (`paper-to-test-data` scoping; cites the same "small is a documented subset" rule), #735 and PR #690 (test-data branch, other concerns), PR #328 and PR #684 (last find-test-data changes), #67 (profile selection research).
- Also seen in atacseq v0 (/home/ubuntu/foundry-runs/prose-wb2g-atacseq-v0-2026-10-29, phase 6, ledger `find-test-data-no-library-layout-check`): the checks ran only because the caller asked for them. They found 76 bp reads where the job uses `read_length` 50, SE elements reusing the PE R1 files, and ~95% of reads mapping to genome.fa.

## Symptom
v0 took the first 100k reads of 3 of the 8 `test`-profile samples. miRDeep2 then failed: two samples exited 2 ("No precursors excised"), one exited 255. The build blamed the data ("low-miRNA 100k subset") and added a `skip_mirdeep` input set to true, "matching the source's `conf/test.config`". v1's brief recorded "almost no miRNA" (5, 0, 3 exact `hsa` mature-prefix hits per 100k). In phase 6, v1 found that the reads carry a random 4-nt block at the insert ends. `hsa` mature prefixes occur at read offset 4 in 566,611 of 2,749,845 Ctl-N3 reads and almost never at offset 0. Under the brief's clip-0 Illumina protocol, 63 of 674,403 Ctl-N2 reads hit `genome.fa` exactly. No subset fixes that. v1 switched to miRNA-enriched subsets of the `test_full` plasma reads (TruSeq small-RNA layout, 50% hairpin inserts).

## Root cause
find-test-data checks candidates only for Galaxy shape and datatype. Its "small is a documented subset" rule says any real-source subset counts as resolved. Nothing asks whether the subset, run under the workflow's own preprocessing parameters (adapter, front/3' clip, UMI or random-N blocks, read length, strandedness), still carries the signal the acceptance criteria test. A head-N subset of the source's own named reads passes every check the Mold names. With no measurement on record, the later miRDeep2 failure could only be read as "no miRNA".

The summary and brief did not miss a protocol param. The selected candidate's `params_delta` records `clip_r1: 0`, `three_prime_clip_r1: 0`, the Illumina adapter and `skip_mirdeep: true`, and the brief carries them. The mismatch is inside the source's test fixture. `conf/test.config` applies `protocol_illumina.config` (clip 0) to reads that look NEXTflex-like. It runs only for "pipeline function" and skips miRDeep2, so the source never notices. The source's NEXTflex test (`test_nextflex`, clip 4/4) uses different reads (`testdata/nextflex/sample*ss.fastq.gz`). No config or profile name could have flagged this. Only inspecting the reads could.

## Evidence
- Mold (worktree = origin/main for this file, rev 8): `content/molds/find-test-data/index.md:84` (step 1, target shape is collection shape plus datatype only). Line 86: step 3 matches "against the required shape". Line 88: step 5, a subset "is **resolved**", with prep only "row-subset by key, column/sample split". Line 89: step 6, a ref carries URL, shape, datatype, hash and prep, with no content measurement. No line mentions adapter, clipping, UMI, read length, strandedness or signal.
- `content/molds/nextflow-to-test-data/index.md:74-77`: maps declared fixtures by role and shape only.
- Research notes: `iwc-test-data-conventions`, `galaxy-workflow-testability-design` and `iwc-workflow-testability-survey` have no content-fitness guidance. `nextflow-test-case-selection/index.md:62` tells the agent to surface stages the `test` profile disables. The brief did that for miRDeep2, but nothing links "disabled stage" to "this fixture may not carry its signal".
- Source: `conf/test.config:27` (samplesheet `v2.0/samplesheet.csv`, Clone1/Clone9 `C*-N*` reads), `:32` `skip_mirdeep = true`, `:39` includes `protocol_illumina.config`. `conf/protocol_illumina.config:3-5` sets clip 0/0 and adapter `TGGAATTCTCGGGTGCCAAGG`. `conf/protocol_nextflex.config:3-5` sets clip 4/4 and the same adapter. `conf/test_nextflex.config:19,25,33` uses its own samplesheet and also skips miRDeep2. `docs/usage.md:14` documents the nextflex protocol.
- Summary: `summary-nextflow.json` `test_candidates[0].params_delta` holds the values above. `test_selection.rationale` notes that the test profile disables miRDeep2.
- Runs: v0 `run-summary.md:39-43,81,105` (skip added, OQ5 unmet). v1 `workflow-brief.md:111-123`, `run-summary.md:29,80`, and `test-data-refs.json` `refs[0].fixture.provenance` (offset measurements and the `test_full` choice).

## Proposed fix
1. find-test-data: add a step between 3 and 5, "Check the data fits the workflow's preprocessing". For read inputs, sample a few thousand reads from each candidate. Measure them against the brief's library parameters: adapter position, leading/trailing random-N or UMI blocks, insert-length distribution, strand. Also check for the expected feature hits (reference prefixes at the post-clip offset). Record the measurement in the ref's provenance.
2. Amend step 5: a subset must keep the signal the acceptance criteria need. When head-N doesn't, select on content (as v1 did) or switch sources. Add a rule: a downstream failure on a fixture with no recorded fitness check is a fixture suspect before it is a "no signal" finding.
3. When the source's own test profile skips a stage the brief keeps, flag the source fixture as unproven for that stage and run the step-1 check before using it. Add the same one-line check to `nextflow-to-test-data` step 3.
4. Add a smrnaseq case to `scenarios.md` and keep `eval.md` abstract (one check: "ref records a layout/signal measurement for read inputs"). Bump the revision and add a `changes.md` entry.

## Draft issue
**Title:** find-test-data: check that candidate reads fit the workflow's library protocol and carry the tested signal

`find-test-data` resolves a candidate when its Galaxy shape and datatype match (index.md:84-89), and treats any documented subset of a real source as resolved (step 5). It never checks the data against the workflow's own preprocessing: adapter, front/3' clipping, UMI or random-N blocks, read length, strandedness. It also never checks that the subset still carries the signal the acceptance criteria exercise.

nf-core/smrnaseq: the `test` profile's reads (`samplesheet/v2.0/samplesheet.csv`) carry a random 4-nt block at both insert ends. `conf/test.config` runs them under `protocol_illumina.config` (clip 0) and skips miRDeep2, so the source never notices. A wb2g build took head-100k subsets. miRDeep2 failed with "No precursors excised", and the build concluded "no miRNA in the data" and added a skip. A later build measured `hsa` mature prefixes at offset 4 in ~20% of reads and ~0 at offset 0, and switched to content-selected `test_full` plasma reads.

Proposal:
- Add a fitness step: sample the reads and measure layout and expected feature hits under the brief's parameters, then record the result on the ref.
- Require subsets to keep the tested signal; otherwise select on content or switch sources.
- Treat downstream failures on unchecked fixtures as fixture suspects.
- Mirror a one-line check in `nextflow-to-test-data`.
- Add the smrnaseq case to `scenarios.md`.
