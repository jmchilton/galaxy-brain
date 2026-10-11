# IWC compatibility audit for Planemo #1723 — 2026-10-11

Result: no current IWC output expectations acquire previously skipped collection type/count assertions from Planemo #1723. The specific compatibility concern is not represented in the current IWC suite.

Audited IWC main `ba4db4f579cb43fe96c08fa16292dd46048e0d53` (fetched from GitHub), against Planemo `b7567c0e181853b2ca1704381a1e2a36dd3a6c53`. Galaxy tool-util parser used: installed 26.0.1, Python 3.12.12. Existing #1723 checker regressions were already verified with actual tool-util 25.1, 26.0.1 and 26.1.

## Scope and evidence

- Scanned all YAML workflow test definitions: 128 files, 146 cases, 247 collection expectations; no parse errors.
- Independently loaded runnable tests through Planemo's real `for_path` / `cases` path: 127 `.ga` workflows, 145 cases, 802 output expectations, 247 collection expectations. The extra `workflows/repeatmasking/Repeat-masking-with-RepeatModeler-and-RepeatMasker-tests.yml` has no matching workflow filename and contributes no extra collection expectation; the active workflow uses `RepeatMasking-Workflow-tests.yml`. No JSON workflow test files were found.
- Compared old/new checker selection for every loaded output, then old `TestCollectionOutputDef.from_dict` versus new `from_yaml_test_format` for type, count, min/max and nested element assertions. Zero changed expectations.
- All 247 collection expectations already contain `element_tests`; 206 also declare `class: Collection`. No top-level `collection_type` or `element_count` assertion occurs in these expectations; all parsed top-level type/count values remain absent on both paths. Input-job collection declarations do not affect output verification and were excluded from the risk calculation.
- The newly added collection-shape check requires `elements`, which the previous verifier already read unconditionally. An invalid shape that crashed before now yields a structured test failure; it does not expose a previously silent successful IWC assertion.

[Audit script](audit_iwc_collection_expectations.py) and [loaded expectation inventory](iwc_collection_inventory_2026-10-11.json).

Reproduce against an IWC checkout:

```sh
PYTHONPATH=/path/to/planemo-collection-output-assertions /path/to/planemo-venv/bin/python audit_iwc_collection_expectations.py /path/to/iwc
```

This is a definition/loader compatibility audit, not a rerun of all scientific workflows. A recent successful IWC CI report ([run 38118576543](https://github.com/galaxyproject/iwc/actions/runs/38118576543), current main) was inspected but contains only the changed multi-sample-binning case and no replayable output-collection payload. It does not establish a fresh full-suite pass on this Planemo branch. A full rerun would not add evidence about newly activated assertions here because none are present, though normal CI remains useful for unrelated runtime regressions.

## Separate existing IWC coverage gap

Five expectations use `attributes: {collection_type: ...}`. The Galaxy parser reads `attributes.type`, or normalizes a top-level `collection_type` into that field. Both old and new Planemo paths silently ignore the current spelling; #1723 does not activate these assertions.

| Workflow | Output | Intended collection type |
| --- | --- | --- |
| [average-bigwig-between-replicates](https://github.com/galaxyproject/iwc/blob/ba4db4f579cb43fe96c08fa16292dd46048e0d53/workflows/epigenetics/average-bigwig-between-replicates/average-bigwig-between-replicates-tests.yml) | `average_bigwigs` | `list` |
| [scrna-seq-fastq-to-matrix-10x-cellplex](https://github.com/galaxyproject/iwc/blob/ba4db4f579cb43fe96c08fa16292dd46048e0d53/workflows/scRNAseq/fastq-to-matrix-10x/scrna-seq-fastq-to-matrix-10x-cellplex-tests.yml) | `Seurat input for gene expression (filtered)` | `list:list` |
| [scrna-seq-fastq-to-matrix-10x-cellplex](https://github.com/galaxyproject/iwc/blob/ba4db4f579cb43fe96c08fa16292dd46048e0d53/workflows/scRNAseq/fastq-to-matrix-10x/scrna-seq-fastq-to-matrix-10x-cellplex-tests.yml) | `CITE-seq-Count report` | `list` |
| [scrna-seq-fastq-to-matrix-10x-cellplex](https://github.com/galaxyproject/iwc/blob/ba4db4f579cb43fe96c08fa16292dd46048e0d53/workflows/scRNAseq/fastq-to-matrix-10x/scrna-seq-fastq-to-matrix-10x-cellplex-tests.yml) | `Seurat input for CMO (UMI)` | `list:list` |
| [scrna-seq-fastq-to-matrix-10x-v3](https://github.com/galaxyproject/iwc/blob/ba4db4f579cb43fe96c08fa16292dd46048e0d53/workflows/scRNAseq/fastq-to-matrix-10x/scrna-seq-fastq-to-matrix-10x-v3-tests.yml) | `Seurat input for gene expression (filtered)` | `list:list` |

Follow-up: normalize these five declarations in a separate IWC change and run those three workflows with real outputs to verify the intended types. Do not interpret this audit as confirming the inferred type against scientific outputs. Record any real mismatch rather than weakening assertions.

A changelog line for #1723 remains appropriate for other consumers whose class-only outputs, top-level collection types, or collection element aliases become checked. No IWC workflow or test was changed in this audit, and no remote comments or test jobs were dispatched.
