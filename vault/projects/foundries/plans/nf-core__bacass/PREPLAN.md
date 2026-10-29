# nf-core/bacass golden-plan pre-plan

Pre-run research, 2026-10-29. Fixture `workflow-fixtures/pipelines/nf-core__bacass`, 2.5.0, pin `76e4b12c`. Scenario: `nextflow-to-galaxy/scenarios.md:41` ("small"). Prior narrowed run: `vault/repositories/foundry/issues/closed/563/runs/bacass-sr-assembly.md`. It covered the short path (fastp, Unicycler, QUAST) on `bacass_short.tsv`: all jobs `ok`, one whole-line GFA assertion error away from green.

## What the pipeline does

Bacterial assembly in three modes, `assembly_type` short/long/hybrid (`workflows/bacass.nf:120-290`):

- Short: `CAT_FASTQ_SHORT` merges runs that share an ID (`:129`), then FastQC + fastp (`FASTQ_TRIM_FASTP_FASTQC`, `:175`).
- Long: NanoPlot/ToulligQC (`:196`), pycoQC (fast5, `:209`), Porechop or Filtlong (`:221-250`).
- Assembly: Unicycler (short/long/hybrid, `:295`), Canu (`:307`), miniasm + minimap2 + racon (`:320`), Dragonflye (`:367`); long-read polishing with Medaka or Nanopolish (`:378-400`).
- Kraken2 contamination check (`:439`); Kmerfinder species ID plus reference download (`:476`). QUAST runs reference-free over all assemblies, or per reference group when Kmerfinder runs (`:509-540`).
- BUSCO `bacteria_odb10` (`:546`). One annotator: Prokka (default, `:563`), Bakta (DB or download, `:582`), DFAST (`:600`) or Liftoff (`:611`).
- Custom MultiQC (`:653-670`).

## Test profile

- `conf/test.config`: `bacass/bacass_short_reseq.tsv`, `assembly_type short`, `prokka_args --fast`, with `skip_kraken2`, `skip_kmerfinder` and `skip_pycoqc` set. Caps of 4 CPUs, 15 GB, 1 h.
- Sheet rows: ERR044595 (1M pairs, about 57 MB per mate), ERR064912 (about 54 MB per mate), and a second ERR044595 run `r-ERR044595_1M_*` (about 29 MB per mate). The duplicate ID exercises run merging; #563 excluded it. Downloads total about 280 MB.
- Reference data in the default path: BUSCO auto-downloads `bacteria_odb10` at runtime, and Prokka uses DBs bundled in its container. Kraken2 (8 GB standard DB) and Kmerfinder (Zenodo tarball) appear only in `test_full.config`; Bakta, DFAST and Liftoff only in their own test configs. Other profiles: `test_long*`, `test_hybrid*`, `test_dfast`, `test_liftoff`, each with an nf-test under `tests/`.

## Resources

- Unicycler (SPAdes) on 1M pairs: about 3-6 GB RAM and 10-25 min per sample at 4 CPUs (`process_high` asks 12 CPU / 72 GB, capped by the test profile). BUSCO and Prokka `--fast` are modest.
- With two samples (three runs), the `planemo test` for this build is the longest of the three. Running it beside another Galaxy test is OK on memory but doubles wall time; avoid overlapping it with CalliNGS's STAR index build if possible.

## Galaxy wrapper outlook (gxwf tool-search, 2026-10-29)

- Present: fastp, FastQC, Unicycler, QUAST (iuc), BUSCO (iuc, plus `busco_fetcher` data manager), Prokka (crs4), Kraken2 (iuc, plus DB data manager), Bakta (thanhlv/iuc, plus DB data manager), DFAST (ufz, plus data manager), Kmerfinder (thanhlv), Liftoff, NanoPlot, Porechop, Filtlong, Canu, miniasm, racon, Medaka, pycoQC, MultiQC.
- Not found: ToulligQC, Dragonflye, Nanopolish consensus (only methylation/eventalign wrappers). Likely drops.
- CAT_FASTQ merging by ID is a collection regroup (Apply rules + concatenate) in Galaxy, not a tool.

## Predicted stall points

- **BUSCO lineage**: the Galaxy BUSCO wrapper reads lineages from a data table filled by a data manager, not from a runtime download. A managed planemo Galaxy has an empty table, and this is the reference/DB chain `workflow-brief-to-galaxy` doesn't dispatch to. Expect a stall or a skipped BUSCO unless the build seeds the data table. Same for Kraken2/Bakta/DFAST if they are in scope.
- Whole-pipeline scope is three modes × four assemblers × four annotators. The brief will likely carry all of them as conditional branches. The build then has to choose which mode the test exercises, and long/hybrid test data (`test_long*`) adds ONT reads plus Medaka.
- Prokka wrapper DB or container size and `--fast` mapping: check them, low risk.
- Kmerfinder → reference download → QUAST-by-reference → Liftoff is a runtime-data-driven fan-out that is hard to express in Galaxy. Expect drops when it's in scope.
- The #563 lesson carries over: `has_line_matching` is whole-line.

## Suggestions

- Ask John: keep "whole pipeline", or narrow to the test-profile path (short reads with merging → fastp/FastQC → Unicycler → QUAST + BUSCO → Prokka → MultiQC; Kraken2/Kmerfinder kept as optional, skipped as in the test)? Narrowing keeps v0 comparable to #563 and the default nf-test.
- Decide BUSCO in tests: seed the BUSCO data table for planemo (data manager or a pre-staged `tool-data`) or accept a skip input, as smrnaseq did with miRDeep2.
- Run second: the wrappers are known good and the DB stall is limited to BUSCO in the default path.

## Recommended run order (all three)

1. CalliNGS-NF: tiny, in-repo data, no DBs, linear. Fast signal on GATK/STAR wrapper behaviour.
2. bacass: wrappers proven in #563. Its seed can overlap CalliNGS's build; its BUSCO data-table question needs an answer first.
3. atacseq: largest and most likely to stall in design (regrouping, mixed PE/SE, many script drops). Run it alone or beside a seed-only phase.
