# Driving pipeline tests with a subagent

How a wf_foundry session test-drives a Foundry pipeline without you sitting in a worktree running `/test-pipeline`. The step-by-step process and the driver brief are in [TEST_PIPELINE.md](TEST_PIPELINE.md); this page explains the setup and what the first run taught us.

## Old way vs new way

Old: `ghwt create foundry <branch>`, open Claude in that worktree, run `/test-pipeline`, answer its questions, watch it phase by phase.

New: from `vault/agents/wf_foundry/`, ask for a run:

```text
Test-drive pipeline nextflow-to-galaxy, case "nf-core/demo", on origin/main.
```

Optionally name a branch or PR to test, or a scope cut ("phases 1..6"). The session prepares the worktree, launches a background driver, and records the result in the vault. You can keep working; it reports back when the run finishes.

## How it works

Three layers:

1. **Coordinator**, the wf_foundry session. It creates and builds the worktree, builds fixtures, picks the run dir, writes the driver brief, and afterwards writes the vault record and proposes issues or PRs.
2. **Driver**, one background subagent. It reads the worktree's `AGENTS.md`, `.claude/commands/test-pipeline.md` and `test-drive.md`, and follows them as text. `/test-pipeline` is a slash command, not a skill, so a session started outside the worktree can't invoke it, but it can follow it. The driver owns the run record (`foundry-run.yml`) and the feedback ledger.
3. **Phase children**, one subagent per cast phase and per loop iteration, spawned by the driver. Subagents do have the Agent tool, so this nesting works. Each child returns a short report; this matches the `--use-subagents` mode of `casts/claude/skills/pipeline-<slug>/SKILL.md`.

The brief turns the interactive command into an unattended one:

- Never ask questions; decide and record the assumption in the run summary.
- No `refinements/` notes. A Mold problem gets a direct fix to the Mold and its `eval.md`, committed locally in the worktree and never pushed.
- `packages/` and harness gaps are reported, not fixed.
- Executable phases run for real (`gxwf validate`, `planemo test`). No green planemo, no complete journey.
- Never hand back while a child or background command is still running.

## Where things land

| What | Where |
|---|---|
| Worktree | `~/projects/worktrees/foundry/branch/pipeline-run-<slug>/` (or the tested branch's) |
| Run dir | `~/foundry-runs/prose-<pipeline>-<case>-<date>/`, its own git repo with one commit per phase (`--checkpoint`) |
| Run record, ledger, summary | `foundry-run.yml`, `foundry-feedback.ledger.yml`, `run-summary.md` in the run dir |
| Mold fixes | Local commits in the worktree; the coordinator proposes an issue and branch |
| Vault record | The tested branch or issue record, else `vault/repositories/foundry/pipeline_runs/<date>-<pipeline>-<case>/index.md` |

The run dir is outside the worktree on purpose: upstream tracks files in `casts/claude/_emulated-runs/`, so runs there dirty the worktree and block cleanup.

## First run: nf-core/demo, 2026-10-25

[Run record](../../repositories/foundry/pipeline_runs/2026-10-25-nf2g-demo/index.md). Full nextflow-to-galaxy journey on `origin/main` @ `bc790960`: phases 1–12 done, `planemo test` green, debug phase skipped. It surfaced a Mold eval bug, fixed as [#716](https://github.com/galaxyproject/foundry/issues/716) / [PR #717](https://github.com/galaxyproject/foundry/pull/717), and 35 ledger entries that are candidates for further issues.

Lessons, now in the brief or the prepare step:

- The driver handed back while its phase 12 child was still waiting for planemo. Hence the "never hand back early" rule.
- The child was waiting for another session's planemo Galaxy. Concurrent planemo runs are now allowed; a clash between them is a planemo bug to report, not a reason to serialize.
- Fixture builds collide on a git lock; build them one at a time.
- `make check` stops at `check-vendored`, which fails only on this machine; `make -k check` shows the rest.
- Test on Galaxy release_26.1 or newer only. The smrnaseq and funcscan v0 builds fell back to release_25.1 over a stale venv, and funcscan hung 41 h installing a data-manager repo, a Galaxy bug fixed in 26.1 ([galaxy#23394](https://github.com/galaxyproject/galaxy/pull/23394); planemo [#1767](https://github.com/galaxyproject/planemo/issues/1767), [#1768](https://github.com/galaxyproject/planemo/issues/1768)).

## Limits

- Parallel journeys need a worktree each and fixtures built first, one at a time. The process sets no cap; pick a count with tokens and disk in mind.
- The driver's eval verdicts are its own; spot-check claims like "tooling defect" before filing (the round-trip `when` failure in the first run is unconfirmed).
- Long runs depend on the session's permission checks staying up; when they stalled mid-run, read-only checks still worked but nothing could be written until they returned.
- Related, not a replacement: `foundry-build test-pipeline` (the Pi runner, #476) runs straight-line pipelines with `--through` on main; loop and branch support is in the #686 / #689 / #690 stack.
