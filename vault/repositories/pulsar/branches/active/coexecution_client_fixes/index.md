---
upstream_base_branch: master
pr: 581
parent_branch: coexecution_dependency_dir_default
child_branches: coexecution_stage_out_failures
related_records:
  - pulsar/branches/coexecution_dependency_dir_default
  - pulsar/branches/coexecution_stage_failures
  - pulsar/branches/coexecution_stage_out_failures
  - pulsar/branches/coexecutor_image_pycurl
---
# Coexecution client fixes: default staging image tag and queued TES tasks

- [PR #581](https://github.com/galaxyproject/pulsar/pull/581)
- [View on GitHub](https://github.com/jmchilton/pulsar/tree/coexecution_client_fixes)

## Status

Hardened 2026-11-15 at `77651c5` (restacked onto `coexecution_dependency_dir_default` `e770845`): Codex review (one finding refuted) plus triage fixes (default-image test goes through a real client; `tes_state_is_complete` removed in favor of `is_job_done` on the mapped status). Under 50 lines, so no thermo-nuclear review.

Draft PR [#581](https://github.com/galaxyproject/pulsar/pull/581) opened 2026-11-15, stacked on #580.

CI for `77651c5` (2026-11-15, settled): unrelated only. Everything else green; unrelated (on base): `Framework tests / Test (3.10, master, directory)` fails with `ImportError: cannot import name 'build_client_manager' from 'pulsar.client'`, as on every recent master run; not rerun.

## Notes

- Commits (2026-11-15): `310d729` + `fb304ef` (default image `galaxy/pulsar-pod-staging:0.15.0.0`, never published, becomes `0.15.0.2`) and `6792aa0` + `77651c5` (TES `QUEUED` maps to `queued`, swapped TES client docstrings, one TES state map).
- Possible follow-ups (not in scope): GCP Batch polling maps send `SCHEDULED` to `complete` and lack `SUCCEEDED`; the TES polling client has no `full_status`. `aws_batch.py` docstrings are not swapped (the implementation debrief was wrong).
- Cherry-picks cleanly onto master on its own.

## Review materials

- [Implementation](implementation_debrief.md)
- [Codex review](codex_review.md)
- [PR description](pr_description.md)
