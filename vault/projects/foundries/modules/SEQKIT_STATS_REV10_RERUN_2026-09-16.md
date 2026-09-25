# Isolated conversion rerun: seqkit/stats, Mold revision 10

## Outcome

The fresh model-backed worker finished in **13 minutes 15 seconds**, with Planemo lint clean and **5/5 Galaxy tests passing against the five upstream output MD5s**. No parent hints or artifact repairs were supplied. The worker artifacts remain untouched.

This is a controlled rerun of the [revision-8 trial](SEQKIT_STATS_TRIAL_2026-09-16.md), not a new held-out module. It evaluates the whitespace guidance from [PR #538](https://github.com/galaxyproject/foundry/pull/538) and the coverage/checksum guidance from [PR #539](https://github.com/galaxyproject/foundry/pull/539). The revised skill contains a small SeqKit command example, but the worker received no previous wrapper, reports, supplemental tests, or failure hints.

| Observation | Revision 8 | Revision 10 |
|---|---|---|
| Usable upstream cases in the final worker wrapper | 1/5 | 5/5 |
| Output verification | One numeric content assertion | All five upstream MD5s |
| Command whitespace failures | Two | None observed |
| Input interface | Multiple data input | List collection, including singleton lists |
| Wall time | 8m 41s | 13m 15s |
| Pi-estimated model cost | USD 0.74 | USD 1.27 |

The changed decisions are consistent with the intended documentation improvements. One stochastic rerun does not establish a success rate or isolate the causal effect of each change; timings also include different diagnostic work and cache state.

## Reproducibility

- Foundry merge: `c39d709453457b8302616b6159f4897262afe5ff`; selected bundle byte-matches the merged bundle.
- Mold revision: `10`; cast adapter: `claude`.
- Selected bundle SHA-256 (harness directory-hash algorithm): `94949835ea59ad0decb6c1d49e48bcd11c2ce2683e8d0293fd09ed16dfa6d4cc`.
- Pi: `0.84.4`; provider/model: `openai-codex/gpt-5.6-terra`; reasoning: `high`.
- Timeout: 3,600 seconds; actual duration: 794,594 milliseconds.
- nf-core/modules pin: `0befdd9db2975ee04a97decc1672a4304387e9a7`.
- Module: `modules/nf-core/seqkit/stats`.
- nf-core/test-datasets pin: `9e3d19ac85b1f62ce3d4ee6df634d61bc5c7656e`.
- Planemo: `0.75.47`; wrapper dependency: SeqKit `2.13.0`.
- Prompt SHA-256: `c0e0f69eb52b2e17054d84db0af7ca6b0f1678cc5b8cbbc648e3691c1963d78e` (unchanged).
- Parent checks confirmed the same engine settings, prompt, timeout, tool list, isolation settings, and declared input hashes as the original trial.
- Isolation: fresh process, context, configuration, dereferenced skill bundle, and staged module; ambient resource discovery disabled. Local mode is **not a filesystem security boundary**. Planemo executed native Galaxy/Conda tests, not containerized tool jobs.
- Run ID: `1e0adf63-68bb-4d0c-add2-6ac47a82a7c2`.

## Worker artifacts and validation evidence

- [Final tool XML](/private/tmp/foundry-pi-run-seqkit-stats-20260916-2/workspace/seqkit_stats.xml)
- [Local macros](/private/tmp/foundry-pi-run-seqkit-stats-20260916-2/workspace/macros.xml)
- [Conversion provenance](/private/tmp/foundry-pi-run-seqkit-stats-20260916-2/workspace/_provenance.yml)
- [Harness run record](/private/tmp/foundry-pi-run-seqkit-stats-20260916-2/run.json)
- [Worker trace](/private/tmp/foundry-pi-run-seqkit-stats-20260916-2/trace.jsonl)
- [Final 5/5 Planemo report](/private/tmp/foundry-pi-run-seqkit-stats-20260916-2/workspace/_planemo_test_report.json)
- [Preserved first 4/5 report](/private/tmp/foundry-seqkit-rev10-audit.aSnrqO/_planemo_test_report.first.json)
- [Preserved failed paired-only retry](/private/tmp/foundry-seqkit-rev10-audit.aSnrqO/_planemo_test_report.paired-retry.json)
- [Final lint log](/tmp/seqkit-planemo-lint-4.log)
- [Final test log](/tmp/seqkit-planemo-test-3.log)
- [Successful worker report-schema check](/tmp/seqkit-schema-validation-2.log)
- [Unchanged supplied prompt](/private/tmp/foundry-seqkit-stats-prompt-20260916.txt)

These are local trial artifacts in temporary directories, not published tools-iwc-lab wrappers. The parent independently validated all three retained test reports against the Foundry report schema and verified final artifact hashes against the harness record:

- XML: `c688059e946d43e30c82c3d79b8126216bfc664c6bb399c171ba36108c586551`.
- Macros: `f9b398d7ed1fac7f23e4b70e20cd66b8612971ec20918c2f4e0d5a9a613541ec`.
- Provenance: `bd3de4b4b200a7e951a4670d792898788b7f822939b540fc1c91fb2f52f7ae7c`.

## Decisions and self-corrections

The initial command already used plain argument lines and explicit `&&` separators. It stages each dataset under its Galaxy element identifier and passes those names explicitly, preserving the TSV's filename column. It retains the source module's `--all` default and does not introduce an unused single/paired selector.

All five real upstream cases were emitted from the outset: `single_end`, `paired_end`, `nanopore`, `genome_fasta`, and `transcriptome_fasta`. The stub-only case was intentionally omitted and documented. The output is registered `tabular` rather than the earlier trial's `tsv`.

The worker needed three Planemo test invocations to converge:

1. The first full run passed four MD5 checks. The paired case repeated `<param name="reads">`, so Galaxy supplied only the second file. Its expected paired MD5 failed; the command itself executed successfully.
2. A paired-only retry used comma-separated URLs in the parameter's `value`; Galaxy tried to resolve them as local test-data filenames and returned HTTP 404. An intermediate attempted multi-location declaration also failed lint.
3. The worker switched the input to a list collection and all test fixtures to named collection elements with individual pinned `location` URLs. The final full suite passed 5/5, without changing upstream expected hashes.

It also corrected an executable-platform mismatch during direct SeqKit diagnostics and an unsupported `--schema` argument when invoking the report validator. macOS remote-fetch file-descriptor warnings appeared, but the fixtures downloaded and the final test suite succeeded.

The final paired command contains both input filenames. Parent XML checks confirmed fixture cardinalities of 1, 2, 1, 1, and 1 and verified that every output MD5 exactly matches its corresponding nf-test snapshot. No backslash-space arguments appear in the successful rendered commands.

## Remaining limitations and next step

The provenance ambiguity persists: `generated.cast_artifact_sha` contains `796060f2091ba7f9ef00305829b599129a09b65643ef11312166b9657dff844c`, the Mold source content hash, not the selected cast bundle hash above. Correct Mold revision and cast adapter were copied. This did not affect the execution tests and was not repaired by the parent.

All five declared real upstream cases now pass, including exact output verification and application of the default `--all` option. This does not grade arbitrary user identifiers, staging-name collisions, explicitly empty additional arguments, all CLI flags, or publication readiness.

The next useful experiment is a new held-out module exercising conditional inputs or multiple outputs. A concise rule for multi-file remote test fixtures is also supported by this trace, but no additional Mold or harness changes were made during the rerun.
