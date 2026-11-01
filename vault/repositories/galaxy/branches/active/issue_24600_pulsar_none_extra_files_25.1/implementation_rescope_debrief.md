# Re-scope debrief

The first scope evaluation (now in `earlier_drafts/1/scope_evaluation.md`) recommended a modest expansion: keep the code fix and add the sample job conf comment fix from the issue's own Proposed Approach. It recommended keeping the `none` + `remote_metadata: true` and `$__tool_directory__` staging bugs out of scope, since they have a different root cause and are queued in `issues_incubator/incubating/pulsar_none_remote_metadata_unstaged/`.

- The original scope is kept as alt `issue_24600_pulsar_none_extra_files_25.1_alt_original_scope` at `4d18da26fee` ([alts/original_scope.md](alts/original_scope.md)).
- Added commit `bf1ec9728a6`. In `job_conf.sample.yml`, `#default_file_action: none` is commented out again. Its text already said "Uncomment ..."; the XML sample keeps it commented; the uncommented line came from the YAML conversion (`1cdb7b5bcd1`). The per-path action lists in the YAML and XML samples now drop `http` and name the 10 real Pulsar actions. The `galaxy_infrastructure_url1` typo is fixed.
- I didn't change the comment wording beyond that. The XML/YAML parity made "restore the comment marker" a cleaner fix than rewording.
- Re-scope review: [subagents/rescope_review.md](subagents/rescope_review.md). No blocking findings.
- `test_job_configuration.py` (which loads both samples) still passes.
