---
upstream_base_branch: master
pr: 578
parent_branch: coexecutor_image_modern_base
child_branches: coexecution_stage_failures
related_records:
  - pulsar/branches/coexecutor_image_modern_base
  - pulsar/branches/coexecution_stage_failures
  - galaxy/branches/tes_task_state_polling
---
# Publish running from pulsar-submit --no-wait

- [PR #578](https://github.com/galaxyproject/pulsar/pull/578)
- [View on GitHub](https://github.com/jmchilton/pulsar/tree/coexecution_publish_running)

## Status

Hardened 2026-11-15 at `1a741aa` (restacked onto `coexecutor_image_modern_base` `acde50a`): Codex review (no findings) and thermo-nuclear review (`wait_for_job`/`wait_for_launch` share one polling loop).

Draft PR [#578](https://github.com/galaxyproject/pulsar/pull/578) opened 2026-11-15, stacked on #577.

CI for `1a741aa` (2026-11-15): unrelated only. Everything else green; unrelated (on base): `Framework tests / Test (3.10, master, directory)` fails with `ImportError: cannot import name 'build_client_manager' from 'pulsar.client'`, as on every recent master run; not rerun.

## Notes

- Stacked on `coexecutor_image_modern_base` only so the demo builds one image; `3c27f58` and `1a741aa` touch only `pulsar/scripts/submit_util.py` and a new test, so they can be cherry-picked onto master on its own.
- Fixes the symptom of tesp-api issue #46 ("Galaxy never shows RUNNING") for any TES server.
- Demo image: `wes-tes/pulsar-pod-staging:0.16.1.dev0-07051ab`. Demo note: `~/projects/repositories/galaxy-wes-tes/docs/notes/pulsar-running-status.md`.

## Review materials

- [Implementation](implementation_debrief.md)
- [Review](review.md)
- [Codex review](codex_review.md)
- [Thermo-nuclear review](thermo_nuclear_review.md)
- [PR description](pr_description.md)
