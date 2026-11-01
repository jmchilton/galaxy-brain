# Remote and run-time-fetched reference data have no home: summarize-nextflow ignores a remote `includeConfig` catalogue, and workflow-brief-design has no rule for unpinned data

- Target: galaxyproject/foundry (summarize-nextflow Mold §3 and `summary-nextflow` schema in `packages/summarize-nextflow`; the `workflow-brief-design` research note and the brief Mold's eval). Nothing upstream: nf-core's `master`-tracking catalogue is by design. Foundry tracking needed: yes (this is the Foundry issue).
- Seen in: /home/ubuntu/foundry-runs/prose-nf2wb-viralrecon-2026-10-31, phases 1 and 2 (summarize-nextflow rev 20, nextflow-summary-to-workflow-brief rev 2, worktree `pipeline-run-chipseq` f766287a), 2026-10-31. Ledger ids `snf-viralrecon-remote-config-catalogue-unrecorded` (gap, major) and `brief-viralrecon-runtime-fetched-reference-data-no-rule` (gap, minor).
- Existing issues/PRs: none (searched `includeConfig`, `custom_config_base`, `pangolin`, `unpinned`). Related: #219 (open; reference-data mapping note, iGenomes audit "and `nf-core/configs`"), #666 item 4 (`getGenomeAttribute` provenance), #351/PR #357 (pinned *source* resolution, not data), #665 (follows `includeConfig` for `withName`, local files only), 16 item 11, 08's a1d2e24a verdict (excludes `params.genomes` from the §3 param chain without saying where it goes instead).

## Symptom
1. viralrecon resolves its genome FASTA/GFF, ARTIC primer BED, scheme and Nextclade dataset through `params.genomes`, defined only in nf-core/configs: `nextflow.config:262` includes `${params.custom_config_base}/pipeline/viralrecon.config`, which includes `conf/pipeline/viralrecon/genomes.config`; the base tracks `master` (`:123-124`). The CLI output has no param, warning or `reference_assets` entry for it. The phase fetched both files at nf-core/configs `d1a3f858` on its own judgment, added `genomes` with `source_path: null` (the schema wants a repo-relative path), and put catalogue URLs into `test_candidates[].inputs`.
2. The brief writer met five reference sources that are fetched, unversioned, at run time: `pangolin --update-data` each run unless `--pango_database` (`modules/nf-core/pangolin/updatedata/main.nf:29`), `freyja update` unless barcodes and lineages are both given, a Nextclade dataset downloaded by name, a Kraken2 DB built with `--download-taxonomy`, and the `master` catalogue above, whose primer BEDs point at artic-network `master`. The source's own snapshot still pins Pangolin CSV md5s (`tests/default.nf.test.snap:1088`). The writer invented the handling (propose a supplied, versioned asset; keep the fetch as an alternative; record the probed catalogue commit) and its confidence.

## Root cause
1. Mold §3 (`content/molds/summarize-nextflow/index.md:275`, rev 20) says to follow the root `includeConfig` chain, but not what to do when the target is a URL built from params. The CLI's include expansion drops any interpolated target (`resolver.ts:689`). Every nf-core pipeline has the `nfcore_custom.config` institutional include (`:258`), which carries no science, so the rule must single out the `pipeline/<name>.config` include; in the pinned corpus viralrecon, cutandrun, chipseq and hic have it; viralrecon's is the one this run showed setting `params.genomes` (the others were not fetched).
2. The schema has no non-repo source locator: `Param.source_path` (schema `:102`) and `ReferenceAsset.source_path` (`:499`) are "repo-relative", so a value from a remote config has nowhere to cite its URL and commit.
3. `workflow-brief-design` asks for "relevant source pins" in Sources (`:27`) and "source/reference access" in preflight (`:66`), but has no rule for data whose version is chosen at run time. The brief eval's evidence property doesn't ask which outputs depend on such data.

## Evidence
- Fixture `nf-core__viralrecon` @ 395079f1: `nextflow.config:123-124,258,262`; `main.nf:165-169` (lookup with primer-set descent); `defaultIgnoreParams = ["genomes"]` (`:576`).
- Run: `phase1-notes.md` "Remote genome / primer catalogue" (fetched files with sha256, HEAD sizes), "Reference and lineage databases"; `summary-nextflow.cli.json` has no `genomes`/`custom_config_base`; `workflow-brief.md` Open questions (catalogue medium; Kraken2, Nextclade, Pangolin, Freyja low).
- Resolver: `expandIncludes` skips any target containing `$` (`resolver.ts:689`) and reads only existing local files (`:691`); `GENOME_ATTRIBUTE_CONFIG_CANDIDATES` (`:916-920`) is repo files only.

## Proposed fix
1. Mold §3: when an `includeConfig` target is built from `custom_config_base` (nf-core `pipeline/<name>.config`), record a warning with the URL template and the ref it tracks, and add `params.genomes` (or the catalogue param) with that provenance. With fixture fetching, fetch it at a resolved commit and resolve catalogue-keyed test inputs (this covers 16 item 28's genome key). Say this is the home for what a1d2e24a's revision excludes from the param chain.
2. Schema: add an optional `source_url` (+ `source_ref`) on `Param` and `ReferenceAsset`, or allow a URL in `source_path` when `source_kind` says remote.
3. CLI: emit the warning and the param without fetching; fetch only under `--fetch-test-data`.
4. `workflow-brief-design`: data fetched or chosen at run time is recorded with its fetch mechanism and any probed pin; the default proposal is a supplied, versioned asset, with the fetch kept as the alternative; acceptance criteria name which outputs depend on that data's version. Mirror it in the brief eval's evidence property.
5. Add the viralrecon case to both Molds' `scenarios.md`, plus `changes.md` entries. Cross-link #219.

## Draft issue
**Title:** Remote config catalogues and run-time-fetched reference data have no home in summary-nextflow or the Workflow Brief

nf-core/viralrecon 3.0.0 gets its genome FASTA/GFF, primer BEDs and Nextclade dataset from `params.genomes`, which exists only in nf-core/configs (`nextflow.config:262` includes `${params.custom_config_base}/pipeline/viralrecon.config`, tracking `master`). `summarize-nextflow` follows local `includeConfig` targets only, so the summary has no trace of the catalogue, and the schema's repo-relative `source_path` can't cite a URL or commit. A run had to fetch the config at a pinned commit and decide where to record it.

Downstream, the Workflow Brief had five reference sources whose version is chosen at run time (Pangolin `--update-data`, `freyja update`, Nextclade by name, Kraken2 `--download-taxonomy`, the `master` catalogue), and `workflow-brief-design` has no rule for them.

Proposed:
- summarize-nextflow §3 and CLI: warn on a `custom_config_base` pipeline-config include, with its URL template and tracked ref; record `params.genomes` with that provenance; fetch at a resolved commit only under fixture fetching. Add `source_url`/`source_ref` to `Param` and `ReferenceAsset`.
- workflow-brief-design: record run-time-fetched data with its mechanism and any probed pin; propose a supplied, versioned asset with the fetch as alternative; name the outputs that depend on that version. Matching eval assertion.

Related: #219, #666 (item 4), #665.
