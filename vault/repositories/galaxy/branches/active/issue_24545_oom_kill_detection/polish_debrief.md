# Polish debrief — `issue_24545_oom_kill_detection`

Run via claude-opus-5-5. Head `958fa86948d`.

- Wrote [pr_description.md](pr_description.md) (follows Galaxy's PR template), [pr_titles.md](pr_titles.md) and [pr_tags.md](pr_tags.md).
- Added a real-kernel demo ([demo/real_kernel_oom_demo.md](demo/real_kernel_oom_demo.md)). In Docker with cgroup v2 and `--memory=128m`, a Galaxy job script with the check on ran an OOM-killed pipeline and exited 0. It printed the probe line, which `oom_kill_job_messages` turned into an `Out of memory error` message.
- Strengthening round, one fresh subagent working read-only. It checked every claim, including "both integration tests fail on dev"; all hold. Acted on:
  - The sample job conf comment claimed Pulsar destinations forward the parameter. Corrected it on the branch (`958fa86948d`): that needs a Pulsar server and `pulsar-galaxy-lib` with the companion change. Also fixed the Docker wording.
  - Cited the reporter's own usegalaxy.org records: the job's Slurm cgroup `oom_kill` went 0 → 1 inside the biocontainer. Dropped the unproven Singularity claim from the description.
  - Added bold answers to two misreadings: "the whole feature is opt-in" (the job-stderr check is default-on with no opt-out) and "why not `pipefail`" (#5884, which gives false exit-141 failures with `head`). Bolded "Galaxy's own Slurm runner misses it too".
- Not acted on (questions for John, listed in the index): an opt-out for the default-on check; a shared "user ended this job" state constant across runners; overlap with Richard Burhans' offered `slurm.py` PR.
- Fork CI for `958fa86948d` was queued at hand-off.

## Polishing snapshot

```
since 20261103T140337Z-hardening-05c139c38a0a:
  commits: 12 same, 0 rebased, 0 changed, 1 new, 0 dropped
  hunks:   38 carried, 1 changed, 0 new, 0 dropped
  new     958fa86948d1 Say what check_cgroup_oom_kills needs on Pulsar destinations
```
