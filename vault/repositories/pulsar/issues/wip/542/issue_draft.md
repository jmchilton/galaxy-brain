# Galaxy's Docker `trap _on_exit EXIT` replaces Pulsar's job-script EXIT handler, so cvmfsexec `mountrepo` unmount never runs for Docker jobs

Agent-to-agent issue draft. Found 2026-10-06 while polishing `gx_branches` `it_container_epilog_docs` (#13511 docs); reproduced the same day with real Galaxy + Pulsar code (repro below). **The bug is a Galaxy/Pulsar interaction and the Pulsar side is unreleased, so the filer should decide galaxy vs pulsar repo** (see "Where to fix"). Pulsar `origin/master` `017b0aa`, Galaxy `dev` at `4fe00d9e7ab`.

## Symptom

Pulsar job running a Docker-containerized Galaxy tool, with Pulsar's cvmfsexec in `mountrepo` mode: the job script's EXIT handler that runs `<job>/.cvmfsexec/umountrepo -a` never fires. The CVMFS repos mounted for the job stay mounted after it exits. Non-container jobs, Singularity jobs and namespace mode are unaffected.

## Cause

- Pulsar `e3a1b49` (natefoo, 2026-08-06, part of #475 "cvmfsexec native support"; **not in any release**; latest release 0.15.15 is 2026-07-13) added `ExitHandlers` / `exit_handler_setup` to `pulsar/managers/util/job_script/__init__.py`. The job script template (`DEFAULT_JOB_FILE_TEMPLATE.sh`) now renders `_galaxy_on_exit() { ... }; trap _galaxy_on_exit EXIT` near the top, before `$command`. cvmfsexec `mountrepo` mode adds `umountrepo -a` to it (`cvmfsexec.add_exit_handlers`). The commit message says cvmfsexec "now only *adds* its unmount to the handlers rather than clobbering the trap slot".
- Galaxy's `DockerContainer.containerize_command` (`lib/galaxy/tool_util/deps/container_classes.py` ~L510-525) emits `_on_exit() { docker kill <name> &>/dev/null }` followed by `TRAP_KILL_CONTAINER = "trap _on_exit EXIT"` (L41). `command_factory.build_command` puts this at the top level of the command line that Pulsar substitutes into `$command`, unwrapped, in `mountrepo` mode (`cvmfsexec.wrap_command` is a no-op for `mountrepo`). So it runs in the same shell after Pulsar's trap and **replaces** it. Bash keeps a single EXIT trap.
- Namespace mode wraps the command in `cvmfsexec ... -- /bin/bash -c '...'`, so Galaxy's trap lands in the inner shell and Pulsar's outer trap survives. It also registers no exit handlers.
- Singularity's `containerize_command` sets no trap. Galaxy's streaming-stdout fifo trap (`CommandsBuilder.capture_stdout_stderr(stream_stdout_stderr=True)`, `command_factory.py` ~L366) would clobber it the same way, but only k8s/GCP Batch runners stream; the Pulsar runner uses the default `False`.

## Repro (2026-10-06)

Render a real Pulsar job script around Galaxy's real Docker command, then run it with stub `docker` and stub `umountrepo` that log their calls. The `mountrepo` preamble was replaced by `echo MOUNTED`, since it needs a real cvmfsexec.

```python
# render.py <galaxy lib> <pulsar src> <job dir>   (run with a Galaxy venv python; pulsar src = git archive origin/master pulsar)
import sys
sys.path[:0] = [sys.argv[1], sys.argv[2]]
job = sys.argv[3]
from galaxy.tool_util.deps.container_classes import DockerContainer
from galaxy.tool_util.deps.dependencies import AppInfo, ToolInfo, JobInfo
from pulsar.managers.util import cvmfsexec
from pulsar.managers.util.job_script import job_script, ExitHandlers

ji = JobInfo(f"{job}/working", "/tools", job, f"{job}/tmp", f"{job}/home", "pulsar", set())
c = DockerContainer("busybox", AppInfo(container_image_cache_path=job + "/cache"), ToolInfo(), {"docker_enabled": True}, ji, None)
galaxy_command = c.containerize_command("echo tool-ran")
cfg = cvmfsexec.parse({"mode": "mountrepo", "path": "/opt/cvmfsexec", "repositories": ["data.galaxyproject.org"]})
handlers = ExitHandlers()
cvmfsexec.add_exit_handlers(handlers, cfg, job)
print(job_script(working_directory=f"{job}/working", metadata_directory=f"{job}/metadata",
                 command=cvmfsexec.wrap_command(cfg, galaxy_command),
                 exit_handler_setup=handlers.render(), cvmfsexec_setup="echo MOUNTED", shell="/bin/bash"))
```

The rendered script has `trap _galaxy_on_exit EXIT` at line 33 and Galaxy's `trap _on_exit EXIT` at line 135. With stub `docker`/`<job>/.cvmfsexec/umountrepo` on PATH:

```
-- as rendered
DOCKER inspect
DOCKER run
DOCKER kill          <- Galaxy's trap ran; umountrepo never called
-- control: Galaxy's `trap _on_exit EXIT` line removed
DOCKER inspect
DOCKER run
UMOUNT -a            <- Pulsar's handler ran
```

## Where to fix

- **Pulsar (before the next release):** in `mountrepo` mode with exit handlers, run `$command` in a subshell, `( $command )`, so embedded traps stay local. Alternatively `ExitHandlers` could document/guard against embedded traps. Lowest-risk, and the code is unreleased. Watch signal behaviour: a SIGTERM to the job script should still reach the subshell.
- **Galaxy:** make `containerize_command` chain any existing EXIT trap instead of replacing it. For example, capture `trap -p EXIT` before setting its own and run it from `_on_exit`. Keep `CommandsBuilder.capture_stdout_stderr`'s `TRAP_KILL_CONTAINER` string replacement working. That fixes it for any future job-script-level EXIT handler too (Galaxy's vendored `lib/galaxy/jobs/runners/util/job_script/` has no exit handlers yet, but would hit the same thing if `ExitHandlers` is synced over).
- Probably both: Pulsar subshell now; Galaxy chaining as the general fix.

Tests: Pulsar has `test/cvmfsexec_test.py`, which could render a job script with a command containing `trap ... EXIT` and assert `umountrepo` still runs (stub scripts, as above). Galaxy: `test/unit/app/jobs/test_command_factory.py` already exercises container commands; add a case running the generated script under a pre-set EXIT trap and asserting both fire.

## Related

- galaxyproject/galaxy#13511 (IT containers outliving jobs; same `_on_exit` trap) and galaxyproject/pulsar#541 (Pulsar `kill_pid` SIGKILLs, so the trap never runs). Same trap, different failure.
- Not checked: whether any Galaxy job-script feature other than Docker sets an EXIT trap in the Pulsar `$command`.
