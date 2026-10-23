No refactoring of the base branch was performed.

Round 2, after the re-scope. Branch history unchanged: `78ff86441f5` (Baseline tests), `11535a475cd` (#24411 fix), `9e28638711a` (re-scope: name match for mapped requests). Head stays `9e28638711a`; no push. Round 1 report: [earlier_drafts/1/baseline_refactor.md](earlier_drafts/1/baseline_refactor.md).

Candidates considered:
- **`identifier_key` local in `JobSearch._build_stmt_for_hda`.** Same as round 1: one use of `f"{k}|__identifier__"` on `release_25.1`, second use exists only for the fix's NOT EXISTS guard. Stays in the fix commit.
- **Re-scope hoist of the `require_name_match` name conditions out of the `elif`.** Behavior change (name match now applies to identifier requests too), not a refactor. Can't be moved ahead of the fix without changing base behavior.
- **`tool_evaluator=self` on fallback wrappers in `evaluation.py`.** Behavior change (name reads set `consumes_names`). Nothing to extract.
- **`Job.copy_from` comment correction.** Comment-only, but its justification is the baseline `cat1` test plus the fix; it's documentation of the fix's world, not a base refactor. Kept in the re-scope commit.
- **`BaseDatasetPopulator.set_user_address`.** New test helper, only consumer is the re-scope rename test. A possible second consumer is `test_tools.py` `test_model_attributes_sanitization` (raw `put` to `users/<id>/information/inputs`), but that test also re-reads the URL and uses the quoted desc for its own assertions; converting it is test churn on 25.1 with no fix benefit. Not pulled into a refactor commit; dev follow-up at most.
- **Shared `|__identifier__` helper across ~6 sites, unified label predicate, `consumes_names` rename/split.** Real base-applicable refactors, deferred to dev by the re-scope debrief and both thermo-nuclear reviews to keep this 25.1 fix minimal.
- **Test helpers** (`_list_of_existing_dataset`, `_mapped_inputs`, `_copied_from_and_identifier`, `_identifier_single_job_id`). Already in the baseline tests commit ahead of the fix.
