# Normal review debrief

The review found nothing must-fix: one should-fix and six nits. I acted on the should-fix and three nits in `05af01c917f`:

- The invalid-key API test no longer uploads a dataset. Normalization runs before any input is handled, so that upload was slow and prone to timeouts for no benefit.
- The 400 message now appends the underlying error. For `9|num_lines` the old message was misleading, since that key is already shaped `<index>|<name>`.
- The unit fixture now reuses `workflow_support.yaml_to_model`, which uses offset ids, instead of a hand-built nested fixture.
- The `step_parameters_by_index` docstring now notes that it can raise `ValueError` as well.

## Not acted on

- **Drop or fold `test_workflow_request_step_parameters_rerun` into `test_run_replace_params_over_default`.** Kept. The issue explicitly proposes it as a top-level baseline. It is also the only test that checks a top-level `seed_source|seed` key (a conditional key containing `|`) survives export unchanged, which is the case where `step_parameters_by_index` must be a no-op.
- **PR description should mention the two behaviour changes.** Deferred to the PR description. Both changes are recorded in `index.md` and the implementation debrief.
- **An unknown inner step id in the export is still a 500 (`KeyError`).** This is #24175 territory, the same as the existing outer `steps_by_id` lookup. #24175 should cover the inner lookup too.

<details><summary>Full review</summary>

See [normal_review_raw.md](normal_review_raw.md).

</details>
