---
upstream_base_branch: master
parent_branch: coexecution_dependency_dir_default
child_branches: coexecutor_image_pycurl
related_records:
  - pulsar/branches/coexecution_dependency_dir_default
  - pulsar/branches/coexecution_stage_failures
  - pulsar/branches/coexecutor_image_pycurl
---
# Coexecution client fixes: default staging image tag and queued TES tasks

- [Open PR](https://github.com/galaxyproject/pulsar/compare/coexecution_dependency_dir_default...jmchilton:pulsar:coexecution_client_fixes?expand=1)
- [View on GitHub](https://github.com/jmchilton/pulsar/tree/coexecution_client_fixes)

## Status

Implemented at `75185ac` during stage 3 of the [GA4GH WES and TES project](../../../../../projects/ga4gh_wes_tes/index.md).

No PR.

Fork CI not checked yet.

## Notes

- Two independent commits: `a65f21c` (default image `galaxy/pulsar-pod-staging:0.15.0.0`, never published, becomes `0.15.0.2`) and `75185ac` (TES `QUEUED` maps to `queued`, swapped TES client docstrings).
- Cherry-picks cleanly onto master on its own.

## Review materials

- [Implementation](implementation_debrief.md)
