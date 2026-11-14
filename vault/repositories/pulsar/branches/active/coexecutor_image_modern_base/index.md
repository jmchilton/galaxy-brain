---
upstream_base_branch: master
child_branches: coexecution_publish_running
related_records: pulsar/branches/coexecution_publish_running
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
- Before any PR, reword `1138cd0`'s message: it says the tool executor waits forever on a read-only root, but `pulsar-submit` exits 1, the TES task ends `EXECUTOR_ERROR`, and the Galaxy job stays queued (the amend and force-push weren't done).
- Design choices for John: dropped CVMFS, Slurm/DRMAA/munge and pycurl from the image; kept the Conda init behind a `CONDA_INIT` build arg. Whether the Kubernetes coexecution path needs any of the dropped pieces is the open question.
- Demo docs: `~/projects/repositories/galaxy-wes-tes/docs/pulsar-staging-image.md`.

## Review materials

- [Implementation](implementation_debrief.md)
