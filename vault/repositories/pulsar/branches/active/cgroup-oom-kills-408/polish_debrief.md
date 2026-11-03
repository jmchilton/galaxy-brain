# Polish debrief — `cgroup-oom-kills-408`

Run via claude-opus-5-5. Head `63969ff` (unchanged by polish).

- Wrote [pr_description.md](pr_description.md), [pr_titles.md](pr_titles.md), [pr_tags.md](pr_tags.md).
- Strengthening round (one fresh subagent, read-only). Acted on:
  - Real-kernel demo replaces the fake-counter-only evidence. Docker Desktop cgroup v2, `--memory=128m`: the command OOM-killed mid-pipe exits 0 both ways, and the line appears only with the check on ([demo/real_kernel_oom_demo.md](demo/real_kernel_oom_demo.md)). The description now leads with it.
  - The lead is now a silent kill, not the Slurm case this PR doesn't need. Cites Galaxy's embedded-Pulsar integration test as the end-to-end proof.
  - "Each half works alone" is reworded to "merged alone, adds a line nothing acts on yet".
  - Docker wording corrected: tool containers get their own cgroup outside the job's.
  - Bold answers for these misreadings: turn it on everywhere; this fixes #408 (opener now `Toward #75`, walltime out of scope); per-job control works today (needs a Pulsar release plus a `pulsar-galaxy-lib` bump, since Galaxy pins 0.16.0); off by default.
- Not acted on (scope questions for John, in index): which Pulsar resource managers kill silently in practice; whether `queued_python`/unqueued should reject or warn on the option; who bumps `pulsar-galaxy-lib`.
- Fork CI for `63969ff` was still queued at hand-off ([pulsar run](https://github.com/jmchilton/pulsar/actions/runs/41648356495)).

## Polishing snapshot

```
since 20261103T135500Z-hardening-63969ff15ba5:
  commits: 7 same, 0 rebased, 0 changed, 0 new, 0 dropped
  hunks:   35 carried, 0 changed, 0 new, 0 dropped
```
