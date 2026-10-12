# Unposted review draft — request changes

Reviewed `6ea906adf6b4bc3863d1765ba0e3b58fbb2a8f82` on 2026-10-11.

The format-aware lookup addresses the direct-plus-converted-input case Marius raised. The focused runtime/parameter tests pass (31 tests), and additional real-model probes cover collections, DCEs, multiple inputs, and optional inputs. Two small fixes are needed before merging:

1. **P1 — Keep the callback aliases compatible with Python 3.8** (`lib/galaxy/tool_util/parameters/convert.py:613–614`). Both packages still support Python 3.8, where evaluating `list[str]` raises `TypeError: 'type' object is not subscriptable`. The Pulsar package job fails at this exact new alias and reports 130 collection errors. Use the already imported `List[str]` here and for the new nested annotations. A future-annotations import alone does not defer the alias assignment.
2. **P2 — Rename the regression tool's outputs** (`test/functional/tools/implicit_conversion_shared_input_y.yml:17–24`). They currently share both input names. The existing output-history loop skips names present in `incoming`, leaving these new outputs historyless. This is the new fixture's failure in framework CI, and reproduces locally with `GALAXY_TEST_RAISE_EXCEPTION_ON_HISTORYLESS_HDA=1`; the three existing XML conversion siblings pass. Rename the outputs and expected-output keys to distinct names such as `as_fasta_out`/`as_tabular_out`. Renaming only those keys in memory makes the strict test pass. This exposes an existing name-collision behavior rather than an introduced conversion-runtime bug.

The end-to-end test is useful and already has the needed building blocks: it submits the same uploaded fasta to both parameters and checks actual contents and formats. Please retain those assertions when correcting the output names.

## Risks

This is a reversible backend fix with no migration or new API field. Correct input selection is essential for YAML tools, and the shared tool-util package must retain Python 3.8 compatibility. After these corrections, the strict framework test and Pulsar package job should be green before merging.

Delivery: **unposted**. No GitHub review or comment was sent.
