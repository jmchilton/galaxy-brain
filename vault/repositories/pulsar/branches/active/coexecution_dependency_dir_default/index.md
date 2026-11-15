---
upstream_base_branch: master
pr: 580
parent_branch: coexecution_stage_failures
child_branches: coexecution_client_fixes
related_records:
  - pulsar/branches/coexecutor_image_modern_base
  - pulsar/branches/coexecution_stage_failures
  - pulsar/branches/coexecution_client_fixes
---
# Default coexecution apps to no tool dependency directory

- [PR #580](https://github.com/galaxyproject/pulsar/pull/580)
- [View on GitHub](https://github.com/jmchilton/pulsar/tree/coexecution_dependency_dir_default)

## Status

Hardened 2026-11-15 at `e770845` (restacked onto `coexecution_stage_failures` `1302eea`): Codex review (no findings) and thermo-nuclear review (the `none` default now applies only when the app config has no `dependency_resolution`, so a resolvers-only config keeps resolution).

Draft PR [#580](https://github.com/galaxyproject/pulsar/pull/580) opened 2026-11-15, stacked on #579.

CI for `e770845` (2026-11-15, settled): unrelated only. Everything else green; unrelated (on base): `Framework tests / Test (3.10, master, directory)` fails with `ImportError: cannot import name 'build_client_manager' from 'pulsar.client'`, as on every recent master run; not rerun.

## Notes

- `f472a87` is the Pulsar fix and `e770845` keeps resolution a config asks for; `4fd4b12` removes the `PULSAR_CONFIG_TOOL_DEPENDENCY_DIR` workaround that `e059842` (#577) added to the image. Answers P3 4 of the [`coexecutor_image_modern_base` review](../coexecutor_image_modern_base/review.md).
- Doesn't cherry-pick onto master alone: it needs `submit_util.py` and its test from #578/#579, and the Dockerfile from #577.

## Review materials

- [Implementation](implementation_debrief.md)
- Docker check: scenarios D and F of [the verification output](../coexecution_stage_failures/docker_verification/output.md)
- [Codex review](codex_review.md)
- [Thermo-nuclear review](thermo_nuclear_review.md)
- [PR description](pr_description.md)
