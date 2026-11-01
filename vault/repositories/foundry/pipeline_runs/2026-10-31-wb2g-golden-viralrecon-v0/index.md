# workflow-brief-to-galaxy: golden brief nf-core__viralrecon v0

- Worktree: `~/projects/worktrees/foundry/branch/pipeline-run-chipseq` (`origin/main` `9f83fd55` + local `40fc911d`, `9b2fd539`, `38400847`, `a1d2e24a`, `f766287a`, `f947b792`, and this run's Mold fix `52808616`).
- Run dir: `~/foundry-runs/prose-wb2g-viralrecon-v0-2026-10-31/`; driver notes in its `.bin/driver-notes.md`. Not archived (planemo logs; archive policy needs John).
- Plan: [golden brief](../../../../projects/foundries/plans/nf-core__viralrecon/golden.md) v0, sha256 `4611914b…3cad`, unchanged throughout. planemo master @ `2a815808`, Galaxy release_26.1, `--biocontainers`.
- Findings: [47-54 and 15 updated](../../findings/2026-10-29/README.md).

## Status

Incomplete. The build is split per platform (D1: Galaxy 26.1 crashes a `when`-false model operation on an absent optional collection, finding 47). The Nanopore workflow (139 steps) is green on `test_nanopore` (attempt 6). The Illumina workflow (328 steps, 385 native) has no green run: it ran `test` clean in attempt 7 (415 jobs ok; consensus, variants long table, Pangolin, Nextclade and 34 other outputs match the source md5s). Three test-expectation defects were then repaired and never re-run. On this 14 GiB host the 385-step workflow can't start reliably: Galaxy's web worker needs ~11.5 GB building the run form and timed out starting the invocation (attempts 2, 8, 9; finding 51). Not run on the final workflows: 5 Illumina cases and `test_nanopore_single_no_gff`. Ledgers: 10 open gaps, 9 dropped, 0 surrendered, 5 brief-change recommendations; 35 feedback entries (12 major).

## Eval

| Phase | Result |
|---|---|
| 1 interface | ✅ 7/7 |
| 2 data-flow | ✅ 5/5 |
| 3 iwc-exemplar | ✅ 7, N/A 2; sars-cov-2-pe-illumina-artic-ivar-analysis (Medium) |
| 4 template | ✅ 6/6; 321 steps, then split per platform |
| 5 loop (126 iter) | ✅ draft-validate rc 0 throughout |
| 6 test-data | ✅ 3/3 |
| 7 test-plan | ✅ 6, ❌ 1 (labels bound to the real workflows, as in finding 02) |
| 8 implement-test | ✅ 4, N/A 1 |
| 9 validate | ✅ 3, N/A 1; `--connections --strict` 749/286 ok; missed a comment colour Galaxy rejects (finding 48) |
| 10 run-workflow-test | ✅ Nanopore; ❌ Illumina (not green) |
| 11 debug | ✅ 3, N/A 2 |

Attempts: 1 import rejected (`purple` comment colour); 2 no invocation (run form hung the worker, guard killed planemo at 1.17 GB free); 3 Nanopore, sanitized `map_param_value` default broke the long table (finding 49); 4 Nanopore, one assertion; 5 Illumina, `mc: null` rendered `-mc ''` and NUL-masked the reference (finding 50); 6 Nanopore green; 7 Illumina, 3 test expectations; 8 `test_sispa` killed by the guard before invocation; 9 Illumina `test` solo, invocation request timed out at 300 s (1.58 GB free, 161 sqlite "database is locked"). No kernel OOM in any attempt. Another session's pytest/Galaxy shared the host in attempts 6-8.

Scope: both platforms, both Illumina protocols (gated on `protocol`), iVar (user tool; iuc lacks `--ignore-overlaps`/`-m`) and BCFtools, SPAdes (user tool), Unicycler and minia with BLAST/QUAST/ABACAS/PlasmidID/Bandage, ARTIC 1.7.3 with Clair3. Databases only as pinned history inputs (Kraken2 hs22, Nextclade 2024-10-17, pangolin-data v1.35, Freyja barcodes + curated lineages; Kraken2, Nextclade and Pangolin as user tools because the iuc wrappers read data tables only), pending John's DB decision.

## Misses

- Phase 9 caught none of the three authoring defects Galaxy or the run caught (comment colour, sanitized default, `null` state). Driver rules now carry them (TEST_PIPELINE.md).
- flagstat/idxstats md5s were copied from the source snapshot; Bowtie2 maps 2-14 fewer reads.
- Mold fix `52808616` needs revising: it forbids `null` only on required parameters, but `mc` is optional (finding 50).

## Open for John

Getting Illumina green needs a bigger host or a different managed Galaxy (longer gunicorn timeout, more workers, postgres), or a fully idle host. Untried.
