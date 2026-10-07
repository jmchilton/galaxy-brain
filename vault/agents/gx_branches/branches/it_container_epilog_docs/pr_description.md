Toward 🎯 #13511 - document a Slurm epilog that kills InteractiveTool containers left running after their job ends.

`docker run` hands the container to the Docker daemon, so it sits outside the job's process tree and the DRM can't kill it. Galaxy relies on an `EXIT` trap in the job script that runs `docker kill`. When that trap doesn't run, the InteractiveTool keeps running (and holding its port) after Galaxy marks the job finished:

| How the job ends | Trap runs? | Epilog in this PR helps? |
| --- | --- | --- |
| Stopped on a Slurm cluster, or hits its time limit (TERM, `KillWait`, KILL) | ✅ expected, yet #13511 reported containers surviving on 21.09, cause never found | ✅ |
| Stopped under Galaxy's local runner (`kill_pg`: TERM, 1s, KILL) | ✅ if `docker kill` finishes within 1s | 🚫 not a Slurm job |
| Stopped under Pulsar `queued_python` / embedded (`kill_pid`: SIGKILL, no TERM) | 🚫 | 🚫 not a Slurm job; galaxyproject/pulsar#541 |

✅ yes · 🚫 no

usegalaxy.org added this kind of epilog to its InteractiveTools cluster in 2024 ([`infrastructure-playbook` `files/slurm/epilog.sh`](https://github.com/galaxyproject/infrastructure-playbook/blob/main/files/slurm/epilog.sh)), but Galaxy's docs don't mention it. This PR adds a "Cleaning up orphaned containers" section to the InteractiveTools admin docs. It explains the trap, says when containers can escape it, and gives an epilog that reads the container name from the `configs/container_config.json` Galaxy already writes for InteractiveTools. The section also says which runners it works with.

***It's for admins running InteractiveTools under Slurm through a runner that submits from the job directory: Galaxy's `slurm`/`drmaa` runners or Pulsar's DRMAA managers. It's docs only: Galaxy's container cleanup doesn't change, and the doc says the epilog shouldn't normally be needed.***

***It doesn't fix #13511 or galaxyproject/pulsar#541. The epilog only sees jobs Slurm runs, so Pulsar's SIGKILL path still needs a Pulsar fix. On the Slurm side there's no known cause left to fix, and usegalaxy.org needed the safety net anyway, so the docs offer it.***

<details><summary>Epilog in the docs vs. usegalaxy.org's</summary>

- Checks both `<WorkDir>/configs/` and `<WorkDir>/../configs/`:
  - Galaxy's DRMAA runner submits from the job directory (`drmaa.py` sets `workingDirectory` to the job wrapper's working directory).
  - Pulsar's DRMAA managers submit from `<job>/working` (`pulsar/managers/base/base_drmaa.py`) and stage configs into `<job>/configs`.
  - usegalaxy.org's script only handles the Pulsar layout. It's set for the Jetstream2 InteractiveTools cluster, which runs them through Pulsar on Slurm.
- Kills only names matching `^[0-9a-f]{32}$`, the names Galaxy generates (`uuid4().hex`), because the script runs as root.
- Extracts `WorkDir` with `grep -o | cut` rather than a GNU-only `sed '\|'` alternation.
- Drops usegalaxy.org's site-specific `/tmp/slurm_job_*` cleanup and its `PrologEpilogTimeout`, which it had already set for its prolog.
- Always exits 0 and discards output, because a failing epilog drains the node.

Code the doc's claims rely on:
- `TRAP_KILL_CONTAINER` and `DockerContainer.containerize_command` in `lib/galaxy/tool_util/deps/container_classes.py`.
- `JobWrapper.container_monitor_command` in `lib/galaxy/jobs/__init__.py`. It writes `container_config.json` only for tools with entry points, unless `container_monitor` is false, and records `docker_cmd`/`sudo`/`sudo_cmd`/`host` under `connection_configuration`.
- Galaxy's `slurm` runner waits for a failed job to leave `COMPLETING`, when the epilog runs, before it fails the job and deletes its directory (`slurm.py` `_complete_terminal_job`). So `container_config.json` is still there when the epilog reads it.

</details>

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

## Context

Adapted from the Slurm epilog usegalaxy.org runs. The 2022 #13511 thread already suggested a similar epilog as a workaround. Pulsar's SIGKILL-without-TERM stop path is filed as galaxyproject/pulsar#541. Not included here: fixing that, or labelling job containers (`--label galaxy_job_id=...`) so orphans can be reaped without the job directory.

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Nothing. The epilog is silent on purpose, since a non-zero epilog exit drains the node.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? N/A. Docs only, no tests.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A.

## How to test the changes?
- [x] Instructions for manual testing are as follows:

<details><summary>Manual check</summary>

Build the docs (`make docs`) and read "Cleaning up orphaned containers" at the end of `admin/special_topics/interactivetools`.

To exercise the script without a cluster, put stub `scontrol` (prints `WorkDir=<dir>`) and `docker` (echoes its args) on `PATH`. Write `<dir>/configs/container_config.json` with `{"container_name": "0123456789abcdef0123456789abcdef"}` and run the epilog with `SLURM_JOB_ID=1` and its output redirection removed: it runs `docker kill 0123456789abcdef0123456789abcdef`. It does the same with the config at `<dir>/../configs/` (Pulsar layout). With no config, or a `container_name` that isn't 32 hex characters, it doesn't call docker. With `SLURM_JOB_ID` unset it exits 0.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
