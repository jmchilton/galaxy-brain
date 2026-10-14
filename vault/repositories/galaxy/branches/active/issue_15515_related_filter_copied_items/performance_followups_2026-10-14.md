# Metadata performance follow-up — 2026-10-14

John requested the additional performance pass recommended by the independent review. The clicked-item lookup and copy-presence check now share one aggregate scan of each association type, keeping the two-statement contract. Aggregation happens independently before combining the two one-row results, so dataset and collection cardinalities cannot multiply each other. Empty histories, missing hids, and an association of each type sharing a hid have explicit behavioral regressions.

The branch was cleanly rebased onto upstream dev `6801a80e2ad` before fresh validation. New implementation changes require a fresh human read. Final commit: `4d82165af62e9faad48326137b5bcf4df1ead0a0`. Pushed to jmchilton only, with an exact lease on `f9b57ed5793cd3e3b929bfcb37daef9e2b880bcb`. The PR remains draft; no draft-state change or review reply was made.

## Ordinary-history comparison

PostgreSQL 18, committed ANALYZE, identical fixtures and assertions, five-run warm wall-time medians. Each size means that many unrelated datasets **and** collections in the clicked history. Original = pre-review base `8ef56943b78`; prior = `f9b57ed5793`; consolidated = final code. Measurements include both metadata and relationship queries. Values are milliseconds.

| Items per type | Early original / prior / consolidated | Late original / prior / consolidated |
| --- | --- | --- |
| 2,000 | 3.735 / 3.188 / 2.63 | 2.896 / 2.919 / 2.423 |
| 20,000 | 4.735 / 5.873 / 4.501 | 4.587 / 5.271 / 4.569 |
| 100,000 | 9.302 / 10.994 / 10.496 | 9.64 / 17.174 / 14.843 |
| 500,000 | 21.172 / 27.978 / 28.526 | 20.877 / 35.623 / 27.369 |

Plans confirm one metadata scan per association type, replacing the two separate lookups per type. Consolidation helps large late clicks, but does **not** eliminate all overhead or guarantee faster early clicks. An interleaved seven-sample recheck at 500,000 per type measured early 19.032 / 25.475 / 23.431 ms and late 18.385 / 31.195 / 21.944 ms, supporting the late-click improvement while illustrating measurement variability. The original lookup also scans history rows using the history index; it was not constant-time.

## Copied-history comparison

Seven-sample medians after two warmups, with prior/final calls interleaved. Fixtures contain copied datasets and collections; early and late inputs each recover exactly their associated output. Every call asserts results, and captured final execution asserts exactly two statements. Original implementation is omitted because it does not implement these copied relationships.

| Copies per type | Early prior / consolidated | Late prior / consolidated |
| --- | --- | --- |
| 2,000 | 11.66 / 11.107 | 12.538 / 12.018 |
| 20,000 | 136.181 / 141.515 | 147.541 / 146.12 |

The 20,000-copy early case increases about 4%; late clicks improve slightly. No substantial copied-history regression is evident. The analyzed final plan spends 3.928 ms in metadata and 168.063 ms in relationships at this size. Candidate-copy ancestry remains the dominant cost. A fresh real `History.copy()` fixture with 250 nonempty output collections and 750 hidden copied elements also returns the asserted relationships in two queries; relationship execution was 6.273 ms (planning 2.042 ms).

These are synthetic, warm development measurements rather than production guarantees. Further improvements such as composite hid indexing or stored copy presence would broaden schema scope. The independent performance-checklist reviewer judged this pass acceptable with documented residual overhead, with no further correctness or performance change required before review.

Reproduce from the Galaxy worktree with `PYTHONPATH=lib`, its virtualenv Python, and `GALAXY_REVIEW_DBURI` targeting a separate disposable PostgreSQL database per script: [ordinary probe](metadata_performance_probe.py), [copied probe](copied_metadata_performance_probe.py), [real-copy probe](populated_collection_probe.py). The first two compare managers loaded from the named Git commits against the live worktree. [Results](metadata_performance_results.json) preserve timings and ordinary metadata plan scans. An initial copied-fixture generation failed due to ambiguous PostgreSQL generate_series parameter types; explicit integer casts corrected the fixture before any reported comparison.

## Validation and CI

- 27/27 manager tests pass (four additional instances for aggregate edge cases).
- 8/8 related-filter real-tool API tests pass on SQLite and 8/8 on PostgreSQL 18.
- All applicable Galaxy pre-commit hooks pass using `.pre-commit-config.yaml.sample`; no unrelated changes.
- Fresh upstream CI on the previous head exposed **six related mypy errors** missed by the previous isolated-file invocation. Fixed SQL expression and select typing, table-name typing, and fixture union narrowing. The correct CI-equivalent invocation from `lib` is `../.venv/bin/python -m mypy . ../test`; it checks 2,516 files and reports no changed-file errors. It still reports four TypeAdapter annotation errors in unchanged `galaxy/tool_util_models/parameter_validators.py` and `parameters.py`. This corrects the earlier type-check evidence; full local mypy is not green.
- Previous-head package CI also reports an unrelated untyped `publickey()` call in unchanged `galaxy/security/ssh_util.py`. Previous API shards passed. New-head upstream CI is pending; prior results do not establish final-head browser or CI success.

John previously requested publication of the local description; that was completed and this performance revision is also reflected in the live PR description. Human-read approval remains unchecked.
