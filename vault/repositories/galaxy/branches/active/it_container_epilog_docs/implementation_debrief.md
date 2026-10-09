# it_container_epilog_docs — implementation debrief

Docs-only branch for galaxyproject/galaxy#13511 (InteractiveTool docker containers outlive stopped jobs). Off `origin/dev` at `4fe00d9e7ab`; commit `b6fcf2d51eb`, pushed to `jmchilton/galaxy`. No PR opened. Pulsar-side bug filed as galaxyproject/pulsar#541.

## Change

New "Cleaning up orphaned containers" subsection at the end of `doc/source/admin/special_topics/interactivetools.rst`:
- Explains Galaxy's `_on_exit` EXIT trap (`container_classes.py`) runs `docker kill` on stop/SIGTERM, so the epilog shouldn't be needed; SIGKILL'd job scripts are the failure mode.
- States usegalaxy.org runs a Slurm epilog as a safety net — confirmed 2026-10-06: infrastructure-playbook `1c7895fe` (2024-11-18) adds `files/slurm/epilog.sh`; `group_vars/meta_jetstream2/vars.yaml` sets `Epilog: /etc/slurm/epilog.sh`.
- Epilog reads `container_name` from `configs/container_config.json` (written by `JobWrapper.container_monitor_command`, ITs only), plus `slurm.conf` lines and caveats (root, `jq`/`docker` on nodes, `docker_host`/`docker_sudo`).

Deviations from main's script:
- Checks both `<WorkDir>/configs/` (Galaxy DRMAA submits from the job dir — matches reporter's working fix) and `<WorkDir>/../configs/` (main's layout; presumably Pulsar submitting from `working`).
- `grep -o 'WorkDir=[^ ]*' | cut` instead of main's GNU-only `sed '\|'` alternation.

## Validation

- Epilog run against stub `scontrol`/`docker`: Galaxy layout → `docker kill abc123`; Pulsar layout → `docker kill pulsar77`; no config → no kill; unset `SLURM_JOB_ID` → exit 0.
- Not run on a real Slurm node; local docker daemon was down.
- `rstcheck` (with sphinx): only pre-existing errors at lines 318/403 (YAML inside `xml` code blocks). Commit hooks passed.

## Background findings (from the #13511 review)

- bash runs the EXIT trap immediately on SIGTERM even with `docker run` in the foreground; adding an explicit `TERM` trap (jmchilton's 2022 suggestion) defers it until the foreground child exits — likely why reporter saw "no effect".
- Pulsar `_psutil_kill_pid` (default path) SIGKILLs the tree with no SIGTERM → trap never runs → orphaned container. Reproduced with a fake docker; Galaxy's `kill_pg` (TERM→KILL) path does run the trap.
- 6bfa842314e (#13557, 22.01) merged the stdout/stderr fifo trap with the container trap but does not explain the 21.09 Slurm report; Slurm case still unexplained.

## Open

- No independent review of the branch yet.
- Doc links #13511 by URL; consider linking pulsar#541 or keeping docs issue-free.
- Not done: Pulsar fix itself, docker `--label galaxy_job_id=...` for orphan reaping, #13511 triage/retitle comment.
