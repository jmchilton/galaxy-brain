# Codex review

Acted on finding 1. I dropped the referenced-name filter (and its `post_job_action_replacement_parameters` helper). `effective_replacement_dict(step)` now resolves every runtime replacement, as before the branch. The implementation diff shrank to about 25 lines. Re-ran the framework (15), API (15) and unit tests: green.

Not acted on:
- Finding 2 (a mapped expression *collection* into a subworkflow text input renders as an HDCA repr). This predates the branch. Fixing it needs a per-job replacement dict, keyed by each job's element, which is new plumbing in `ToolModule.execute`'s iteration loop. Recorded as a follow-up for scope evaluation.

<details><summary>Findings (codex exec, read-only, brief = issue only)</summary>

1. **P2, CONFIRMED** (`run.py` effective_replacement_dict). Filtering to `${...}` names found in the PJA arguments broke second-order substitution. `RenameDatasetAction._gen_new_name` (post.py:174) expands `#{input}` *before* `${k}`, so an input dataset named `${label}` used to resolve to the label's value. With the filter it stays literal. Contrived, but it was a behavior change on a release branch.
2. **P2, NEEDS-DECISION / follow-up** (`run.py:656`). A subworkflow text input fed by a mapped expression tool holds an HDCA. `replace_expression_json_dataset` leaves collections alone, and one dict is shared across all jobs, so per-element renames get `<HistoryDatasetCollectionAssociation(...)>`. This predates the branch.

Coverage note: codex ran focused resolver checks only; no API/framework suites.
</details>
