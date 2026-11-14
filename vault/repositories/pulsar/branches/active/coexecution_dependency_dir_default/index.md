---
upstream_base_branch: master
parent_branch: coexecution_stage_failures
child_branches: coexecution_client_fixes
related_records:
  - pulsar/branches/coexecutor_image_modern_base
  - pulsar/branches/coexecution_stage_failures
  - pulsar/branches/coexecution_client_fixes
---
# Default coexecution apps to no tool dependency directory

- [Open PR](https://github.com/galaxyproject/pulsar/compare/coexecution_stage_failures...jmchilton:pulsar:coexecution_dependency_dir_default?expand=1)
- [View on GitHub](https://github.com/jmchilton/pulsar/tree/coexecution_dependency_dir_default)

## Status

Implemented at `e90a555` during stage 3 of the [GA4GH WES and TES project](../../../../../projects/ga4gh_wes_tes/index.md); verified with docker on a read-only root, not yet end to end through Galaxy.

No PR.

Fork CI not checked yet.

## Notes

- `c0b4e40` is the Pulsar fix; `e90a555` removes the `PULSAR_CONFIG_TOOL_DEPENDENCY_DIR` workaround that `1138cd0` added to the image. Answers P3 4 of the [`coexecutor_image_modern_base` review](../coexecutor_image_modern_base/review.md).
- Doesn't cherry-pick onto master alone: `c0b4e40` conflicts in `submit_util.py` and its test (needs `07051ab` and this branch's parent), and `e90a555` needs `1138cd0`'s Dockerfile.

## Review materials

- [Implementation](implementation_debrief.md)
- Docker check: scenarios D and F of [the verification output](../coexecution_stage_failures/docker_verification/output.md)
