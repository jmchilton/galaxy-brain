# #666 summarize-nextflow resolver: six measured extraction defects on nf-core/rnaseq 3.27.0

[Issue](https://github.com/galaxyproject/foundry/issues/666) — opened by scottcain's AI assistant, currently only `needs-triage`. One comment (John's agent, 2026-10-25) adds nf-core/sarek 3.8.1 evidence. No PR or branch addresses it (`gh pr list --search 666` empty).

## Proposed labels

- `roadmap/off`: no `roadmap/main` issue covers the deterministic resolver, and siblings #211, #215 and #216 are already `roadmap/off`. Closest candidate is #66 (Nextflow test fixtures to Galaxy job inputs), but it is a research note and would only cover the fixture items. No parent.
- `priority/mvp`: wrong output with no signal, on the entry point of every NEXTFLOW route. The sarek run had four downstream phases re-read source because of defect 1.
- `work/ready-implement`: every defect that still exists has a located cause below. Defect 1 has one design call, which an agent can make and state in the PR.
- No blocker labels: the code is in this repo.

## Status

`needs_decision` (`needs_decision_labels`, rule 3): labels staged in `issue_tags.md`. Once applied, `queued_implement`.

## Findings

Ran `origin/main`'s resolver (`51338d1d`) statically on both pipelines, with `--no-with-nextflow --profile test`: rnaseq 3.27.0 (`a1fcddd`) and sarek 3.8.1 (`4bd2948`). `resolver.ts` was byte-identical to main in the build used. Both summaries passed bundled-schema validation, so the "silent" claim holds. Line numbers are `packages/summarize-nextflow/src/resolver.ts` at that commit.

| # | Claim | On main | Cause |
|---|---|---|---|
| 1 | Wrapper chosen as primary | Reproduces: `NFCORE_RNASEQ` (1 channel, 65 edges), `NFCORE_SAREK` (15, 110) | `selectPrimaryWorkflow` :1289 ranks by transitive reach |
| 2 | Fixtures dropped, 3 of 10 | Mostly gone: 8 of 10 now kept | Name allowlist `isCandidateInputParam` :2662 |
| 3 | Comments kept in params delta | Reproduces, and worse than reported | `parseParamsOverrides` :2943 reads unmasked text |
| 4 | No `getGenomeAttribute` provenance | Reproduces: 136/136 and 172/172 `nextflow_schema`, 0 expressions | Scan list :916 omits `main.nf` |
| 5 | `pipelines_testdata_base_path` is an asset | Reproduces: 22 assets, empty `used_by` | Missing from `NON_REFERENCE_PARAMS` :1632 |
| 6 | `meta.yml` ports dropped | Reproduces exactly: rnaseq 75/75 output, 35/75 input; sarek 119/119, 97/119 | `parseNamedMetaEntries` :1183 |

Details that change the fix from what the issue proposes:

- **1: the issue's proposed rule fails on sarek.** It asks to rank by invocation count, as the Mold and schema also say, but `FASTQ_PREPROCESS_GATK` (22 calls) outranks `SAREK` (21). The real bug is that `PREPARE_GENOME_*` is called from the wrapper, so the wrapper's reach strictly exceeds `RNASEQ`'s. The `workflows/` preference at :1348 only filters max-reach ties, so `RNASEQ` never competes. The existing test (`test/resolver.test.ts`, `NFCORE_WRAPPERS`) only covers a wrapper that adds no processes.
- **2: the field is gone.** `test_fixtures` was replaced by `test_candidates[].inputs`. Only `hisat2_index` and `salmon_index` are still dropped, because `index` isn't in the allowlist. The issue's "not explained by expression shape" is right; the cause is the param name.
- **3: not minor.** The string flows into `values` (:2555-2558), so the candidate gets a fake input with `path: "null  // transcript_fasta below cannot receive…"`. Stripping the comment isn't enough: a real `null` only skips the `typeof value === "string"` branch, so the profile's URL stays in `inputs[]`. Null overrides must delete the value.
- **4: only the scan list is wrong.** The override the issue asks for already works and is tested (:890-895, `test/resolver.test.ts:1376`). rnaseq has 14 assignments in `main.nf:18-31` and none in the scanned configs; sarek's `getGenomeAttribute` appears only in `main.nf`. Fix: scan the selected entrypoint. Expect the asset count to change, because `isPathTypedParam` :1669 keys on this `source_kind`.
- **5: don't filter on empty `used_by`.** On sarek the empties are `outdir_cache`, `condel_config` and `mastermind_file`. The first is site config; the other two look like real annotation files.
- **6: needs a schema change.** The bundled `nf-core-module-meta.schema.json` already shows `output` as an object keyed by emit and `input` as a list that may hold lists. `ModuleMetaEntry` has `additionalProperties: false` and no `ontologies`, and a flat list has nowhere to keep the emit name.

Two new defects, not in the issue or its comment:

- **A: SHA-pinned fixture URLs are rewritten to URLs that 404.** `normalizeTestDataUrl` :2701 inserts `refs/heads/` before any ref, including commit SHAs. All 15 distinct rnaseq input URLs are affected. Sampled `reference/genome.fasta`: as written 200, as emitted 404. Present since `5b480b6f` (2026-05-02).
- **B: an apostrophe in an nf-test comment breaks block extraction.** `extractBlockAt` :3121 tracks quotes but not comments, and `extractNfTestBlocks` :2873 passes unmasked text. `test.config's` in `tests/salmon.nf.test:204` drops the test at :231, moves its `--keepDuplicates` into the previous test's `params_delta`, and adds a spurious `dynamically-generated` candidate. The dropped test repeats the same comment at :242. All 3 rnaseq `dynamically-generated` files have such comments.

The sarek comment reproduces too:

- 59/59 candidates are `dynamically-generated` with `snapshot: null` and `outputs: []`.
- `outputs: []` is hard-coded at :2398, so it affects every candidate, including 55/55 on rnaseq.
- `snapshot` is null because the generator file has no literal `snapshot(` (:2968).
- The genome input is `path: "testdata.nf-core.sarek"` with `filetype: "sarek"`, because `normalizeCandidatePath` :2673 treats the dotted key as a path.

Not verified:

- That reseating on `RNASEQ` yields the issue's hand-built 63 channels, 155 edges and 21 conditionals.
- Defect B's cause by a minimal one-variable test; it rests on reading the code plus the observed symptoms.
- The other 14 rewritten URLs, or how `--fetch-test-data` behaves on a 404.

Related: #665 (summary lacks publishDir and `ext.args`, separate gap), #215 (subworkflow-level edge view), #534 (concrete pinned fixtures, a possible home for regression fixtures), #673 (source-read posture, which these defects force phases to break).

## Next

Suggested batches, smallest first:

1. Small and independent: 3 (with null deletion), B, A, 4, 5, and the `index` gap in 2.
2. 6, with the schema change and recast.
3. 1, then the sarek generated-test and iGenomes key items.

For 1: prefer `workflows/` candidates before ranking by reach, keep current behavior when none exist, and correct the Mold and schema "most pipeline processes" wording. Add a test where the wrapper calls extra processes.

Questions for John:

- Keep one issue, or split it? The issue itself says "not one fix". Recommend keeping it as the tracker with one PR per batch.
- For 1: `workflow` has no `invocations` field, so demoting the wrapper loses how `RNASEQ`'s `take:` channels are bound. `PREPARE_GENOME_*` keep theirs. Add the field to `workflow`, or accept the loss? Recommend adding it.

Findings posted to the issue 2026-11-07 ([comment](https://github.com/galaxyproject/foundry/issues/666#issuecomment-6708366526)); defects A and B are items 7 and 8 there.

Reproduce: `summarize-nextflow <clone> --no-with-nextflow --profile test --out summary.json`.

Staged labels applied 2026-11-06: +roadmap/off, +priority/mvp, +work/ready-implement.
