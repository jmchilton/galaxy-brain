# Domain review tighten

Run via claude-opus-5-5 at John's request, against [DOMAIN_REVIEW.md](../../../../../agents/wf_foundry/reviewers/DOMAIN_REVIEW.md) and their comment on the `data-table values have rows` case.

## Applied

- §2: replaced the abstract case with IWC `functional-annotation-of-sequences`. InterProScan fixes `database: 5.59-91.0`, and tools-iuc `tools/interproscan/test-data` holds no `fake_db/`. Split off the `or`: the case now has one outcome.
- §2: funcscan case names the pinned fixture and no longer re-lists eval properties.
- §2: dropped the `implement-galaxy-workflow-test` eval preamble line about deterministic properties.
- §3: cut self-defending clauses from `implement-galaxy-workflow-test` and `workflow-brief-to-galaxy-test-plan`, and note rules inlined in `find-test-data` step 6.
- §4: note lost the run evidence paragraph, the failed-form negative example, the Rule/Why table, a pointer section and the second sentence of each Verification Gap.

## Corrected

"Only the Galaxy log gives the reason" was wrong. Red probe rerun 2026-11-06: reason in the log and in the database's `job.info` and `history_dataset_association.info`, absent from `out.json` and `out.html`, and the job record has no reason field. The API's `misc_info` is the HDA `info` per source (`_remap_from("info")`), not read from a live response. Proposal: [upstream_planemo_failed_job_reason.md](upstream_planemo_failed_job_reason.md).

## Row value mismatch

No real fixed-state value matched a wrapper test row with a database behind it. Scanned IWC fixed `from_data_table` values against tools-iuc test `.loc` files, excluding cutadapt adapters and wrappers outside `tools/`:

| Fixture | Fixed value | Wrapper test row |
| --- | --- | --- |
| `annotation-braker3`, `annotation-helixer` OMArk | `LUCA-v2.0.0.h5` | `test` |
| `annotation-maker` BUSCO | `v5` | `busco-demo-db-20230328` |
| `mgnify-*` mapseq | `mgnify_*_from_2023-09-26` | `test_mapseq_db` |
| `functional-annotation-of-sequences` InterProScan | `5.59-91.0` | matches, no database |

Same for `Nanopore-Pre-Processing` Kraken2 (`kalamari` vs `test_entry`) and the committed `UC1_MRSA_Bakta_JBrowse_faithful.ga` at Bakta `1.9.4+galaxy1`: `V5.1_light_2024-01-19` matches, `amrfinderplus_V3.12_2024-07-22.1` doesn't match `amrfinderplus_V3.12_2024-05-02.2`.

So staging for a fixed value means writing a row with the workflow's value over a test database, or reporting a gap. The Mold doesn't say which. UC1 is the case to add once decided.
