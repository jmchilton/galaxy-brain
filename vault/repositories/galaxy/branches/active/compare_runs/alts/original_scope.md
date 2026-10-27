# Original scope

Branch `compare_runs_alt_original_scope` at `548c8bebcc3` on `jmchilton`.

The branch as hardening iteration 1 left it, before the re-scope: all of plan.md (modes 1–3, three endpoints, table, All runs tab, `/comparisons`, entry points), Phase 5 polish (two-row diff, filters, CSV/TSV export, changed-cell highlight, batch job pager), test challenges and the Codex fixes (multi-dataset list cells, input-step values, all-version output-label facet).

The working branch adds the [scope evaluation](../scope_evaluation.md)'s "finish the abstractions" expansion on top: second consumers for `totalMatches` and `useExecutionJobs`, `?keys=metadata_<name>` through `serialize_metadata(included=)`, a `versions` filter on `output_runs`, and an "Other runs of this tool" link on DatasetDetails.
