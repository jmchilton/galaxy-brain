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

Implemented at `c4ae861` during stage 2 of the [GA4GH WES and TES project](../../../../../projects/ga4gh_wes_tes/index.md); the image ran real Galaxy TES jobs in the demo. Restacked 2026-11-14 by the coordinator (John authorized force-pushes): `1138cd0`'s message reworded, the pycurl commit folded into `coexecutor_image_modern_base`, the CI test fix carried through the stack. Pre-restack SHAs in debriefs and evidence are historical.

No PR.

Fork CI for `c4ae861` not checked yet (pre-restack `1138cd0`: pulsar, Deploy and zizmor green).

## Notes

- Built image: `wes-tes/pulsar-pod-staging:0.16.1.dev0-1138cd0` (local only). The demo now runs the child branch's image.
- Commits: `a87897c` (image on python:3.12-slim), `92935e4` (read-only root workaround; reworded from `1138cd0` to say `pulsar-submit` exits 1, the TES task ends `EXECUTOR_ERROR` and the Galaxy job stays queued), `c4ae861` (pycurl, formerly branch `coexecutor_image_pycurl` `4ccfb64`).
- Review P1 (pycurl dropped, stage-out reads outputs into memory) is fixed by `c4ae861`, folded in from [`coexecutor_image_pycurl`](../coexecutor_image_pycurl/index.md).
- Design choices for John: dropped CVMFS and Slurm/DRMAA/munge from the image; kept the Conda init behind a `CONDA_INIT` build arg. Whether the Kubernetes coexecution path needs any of the dropped pieces is the open question.
- Demo docs: `~/projects/repositories/galaxy-wes-tes/docs/pulsar-staging-image.md`.

## Review materials

- [Implementation](implementation_debrief.md)
- [Review](review.md)
