# Polish debrief

- CI: fork CI green on `fc70b831522` (only Pulsar packages / CWL conformance skipped). No branch changes during polish.
- Checklist (`GENERAL.md`; workflow list N/A): all items pass, human-read item left for John. Red-to-green re-confirmed: disabling the skip fails `test_split_declared_job_outputs_skips_discovered_datasets`. See [checklist](checklist.md).
- Strengthening round: no development tasks. Description edits only: highlighted that discovered datasets are still verified and that the new helpers add no behavior; reworded the "no functional reproduction" line (unit test feeds the post-completion state directly); softened the legacy-path "never" to the submit-before-run reasoning.
- Scope-widening questions for John (not done): unify `__new_primary_file_` naming with core via `galaxy.util` on `dev` (noted as follow-up in Context); make `populators.py` `DescribeToolExecution.with_output` skip discovered datasets (no observed failure).
- Branch is behind `release_26.2` tip but not conflicting; not rebased.
