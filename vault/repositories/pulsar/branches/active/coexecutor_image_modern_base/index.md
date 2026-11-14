---
upstream_base_branch: master
child_branches: coexecution_publish_running
related_records:
  - pulsar/branches/coexecution_publish_running
  - pulsar/branches/coexecution_dependency_dir_default
  - pulsar/branches/coexecutor_image_pycurl
---
# Rebuild the coexecutor staging image on a current Python base

- [Open PR](https://github.com/galaxyproject/pulsar/compare/master...jmchilton:pulsar:coexecutor_image_modern_base?expand=1)
- [View on GitHub](https://github.com/jmchilton/pulsar/tree/coexecutor_image_modern_base)

## Status

Implemented at `1138cd0` during stage 2 of the [GA4GH WES and TES project](../../../../../projects/ga4gh_wes_tes/index.md); the image ran real Galaxy TES jobs in the demo.

No PR.

Fork CI for `1138cd0`: pulsar, Deploy and zizmor green; Framework tests were still running at hand-off.

## Notes

- Built image: `wes-tes/pulsar-pod-staging:0.16.1.dev0-1138cd0` (local only). The demo now runs the child branch's image.
- Before any PR, reword `1138cd0`'s message: it says the tool executor waits forever on a read-only root, but `pulsar-submit` exits 1, the TES task ends `EXECUTOR_ERROR`, and the Galaxy job stays queued. Stage 3 re-checked this (the `1138cd0` image with `PULSAR_CONFIG_TOOL_DEPENDENCY_DIR=dependencies` under `docker run --read-only -w /` exits 1 with `OSError: [Errno 30] Read-only file system: '/dependencies'` while the app is built) and tried the amend plus a rebase of the child, but the session's permission settings blocked it. Proposed message: second paragraph ends "...that raises OSError while the Pulsar app is built, before pulsar-submit stages anything: pulsar-submit exits 1, the TES task ends in EXECUTOR_ERROR without running the tool or pulsar-finish executors, no status is published, and the Galaxy job (which does not poll TES) stays queued." Rebasing would also renumber the stacked children.
- Review P1 (pycurl dropped, stage-out reads outputs into memory) is fixed on the top-of-stack branch [`coexecutor_image_pycurl`](../coexecutor_image_pycurl/index.md); fold it into this branch at the next rebase.
- Design choices for John: dropped CVMFS, Slurm/DRMAA/munge and pycurl from the image; kept the Conda init behind a `CONDA_INIT` build arg. Whether the Kubernetes coexecution path needs any of the dropped pieces is the open question.
- Demo docs: `~/projects/repositories/galaxy-wes-tes/docs/pulsar-staging-image.md`.

## Review materials

- [Implementation](implementation_debrief.md)
- [Review](review.md)
