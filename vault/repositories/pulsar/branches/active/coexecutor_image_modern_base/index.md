---
upstream_base_branch: master
pr: 577
child_branches: coexecution_publish_running
related_records:
  - pulsar/branches/coexecution_publish_running
  - pulsar/branches/coexecution_dependency_dir_default
  - pulsar/branches/coexecutor_image_pycurl
---
# Rebuild the coexecutor staging image on a current Python base

- [PR #577](https://github.com/galaxyproject/pulsar/pull/577)
- [View on GitHub](https://github.com/jmchilton/pulsar/tree/coexecutor_image_modern_base)

## Status

Hardened 2026-11-15 at `acde50a`: Codex review (no findings) and thermo-nuclear review (three build fixes); the pycurl commit was folded into the image rebuild commit, whose message no longer says pycurl is opt-in.

Draft PR [#577](https://github.com/galaxyproject/pulsar/pull/577) opened 2026-11-15.

CI for `acde50a` (2026-11-15): unrelated only. Everything else green; unrelated (on base): `Framework tests / Test (3.10, master, directory)` fails with `ImportError: cannot import name 'build_client_manager' from 'pulsar.client'`, as on every recent master run; not rerun.

## Notes

- Built image: `wes-tes/pulsar-pod-staging:0.16.1.dev0-1138cd0` (local only). The demo now runs the child branch's image.
- Commits (2026-11-15): `a3a5b68` (image on python:3.12-slim, pycurl included; formerly `a87897c` + `c4ae861`), `e059842` (read-only root workaround), `e0864e5`, `371d01f`, `acde50a` (thermo fixes: bind-mount wheel install, build-only pip settings, Makefile ordering).
- Review P1 (pycurl dropped, stage-out reads outputs into memory) is fixed in `a3a5b68`, folded in from [`coexecutor_image_pycurl`](../coexecutor_image_pycurl/index.md).
- Design choices for John: dropped CVMFS and Slurm/DRMAA/munge from the image; kept the Conda init behind a `CONDA_INIT` build arg. Whether the Kubernetes coexecution path needs any of the dropped pieces is the open question.
- Demo docs: `~/projects/repositories/galaxy-wes-tes/docs/pulsar-staging-image.md`.

## Review materials

- [Implementation](implementation_debrief.md)
- [Review](review.md)
- [Codex review](codex_review.md)
- [Thermo-nuclear review](thermo_nuclear_review.md)
- [PR description](pr_description.md)
