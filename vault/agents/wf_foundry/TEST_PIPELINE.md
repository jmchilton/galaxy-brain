# Test a Foundry pipeline

You'll be given a pipeline slug, a `scenarios.md` case, and optionally a branch to test (default `origin/main`) and a scope cut (default: full journey).

Foundry's `/test-pipeline` is a slash command in the checkout's `.claude/commands/`, not a skill. Sessions started here can't invoke it, so a driver subagent reads it and follows it, the same way `/test-pipeline` itself follows each skill's `SKILL.md`.

## 1. Prepare (you, the coordinator)

- Worktree: `ghwt create foundry pipeline-run-<short-slug>` (or reuse the tested branch's worktree). `git fetch` and confirm it sits on fresh `origin/main` or the branch head.
- New worktree: `pnpm install --frozen-lockfile && npm run packages-build`.
- Fixtures the case names: `make fixtures-nextflow`, `make fixtures-iwc fixtures-skeletons`, etc. One at a time; parallel runs collide on a git lock. For parallel journeys, build all fixtures before launching any driver.
- Parallel journeys are fine, with no cap here; John picks how many. Give each its own worktree (drivers commit Mold fixes locally) and check free disk first.
- Run dir: `~/foundry-runs/prose-<pipeline-short>-<case-short>-<YYYY-MM-DD>/`. `~/foundry-runs` is a clone of the private [jmchilton/foundry-runs](https://github.com/jmchilton/foundry-runs); `git pull` it first. Not `casts/claude/_emulated-runs/`: upstream tracks files there, so new runs dirty the worktree and block cleanup.

## 2. Drive (a background subagent)

Launch one subagent with your model and effort and this brief, filled in:

```text
Drive a Foundry pipeline test. Worktree: <WT> (branch <BRANCH> @ <SHA>).
Prefix every shell command with `cd <WT> &&` (cwd resets between calls).
Read <WT>/AGENTS.md, <WT>/.claude/commands/test-pipeline.md and <WT>/.claude/commands/test-drive.md, then follow test-pipeline with:
  pipeline: <slug>    case: "<scenarios.md case name>"
  scope: <full journey | phases 1..N, stop after <skill>; partial by design>
  run dir: <RUN_DIR> (replaces casts/claude/_emulated-runs/<slug>/)
Use the assembled harness casts/claude/skills/pipeline-<slug>/SKILL.md for phase order, the run record and the feedback ledger, with --use-subagents --checkpoint --feedback semantics.
Overrides:
- Never ask questions; decide, and record the assumption in the run summary.
- Skip test-drive step 6: write no content/molds/*/refinements/ files.
- A run that exposes a Mold problem: you may fix that Mold and its eval.md in <WT> (re-cast, `make check` scoped as AGENTS.md says), committed locally, never pushed. Say whether later phases ran on the fixed Mold. Don't touch packages/ or harness code; report those gaps.
- Run each cast phase, and each loop iteration, in its own subagent returning a short report (artifacts, assumptions, status, feedback outcome). You keep the run record and the ledger.
- Run executable phases for real (`gxwf validate`, `planemo test`). Without a green planemo result the journey is incomplete, not done.
- Galaxy for planemo is release_26.1 or newer: pass `--galaxy_branch release_26.1` (a newer release_* or master is fine), never an older branch. If that branch's `~/.planemo/gx_venv_*` is broken, rebuild it when no running Galaxy uses it; otherwise stop and report. Never downgrade to get a run going.
- Never hand back while a child agent or background command is still running; wait for it.
- Keep the output datasets of the final green planemo attempt under <RUN_DIR>/.scratch/test-outputs/ (planemo's Galaxy is deleted at exit; e.g. `--no_cleanup` then copy, or `--test_output_json` plus downloads) and remove the kept Galaxy dir afterwards, and between failed attempts. Docker leaves root-owned mount dirs; remove those with `docker run --rm -v <dir>:/d busybox rm -rf /d/<subdir>`.
- On the Linux host `/tmp` is a RAM-backed tmpfs: run planemo with `TMPDIR` set to a short on-disk path (`/var/tmp/<3-6 chars>`, at most ~59 characters). Planemo nests Galaxy's temp dir ~48 characters under it, and Python 3.12 doesn't guard the 107-character socket limit, so a long path breaks Galaxy's celery socket ("AF_UNIX path too long") and can hang an upload job.
- planemo is `~/.local/share/planemo-master-2a815808/bin/planemo` (master @ `2a815808`, 0.75.48.dev0), not `uvx planemo==0.75.47`: master carries unreleased fixes (#1763 embedded user tools, #1760 collection expression assertions, #1761 falsy test outputs, #1755 undeclared replacement params). Name it in the run summary. Workflows with embedded user tools use plain `planemo test`; fall back to `planemo serve` + a `user_tool_execute` user + `--engine external_galaxy` only if that fails, and report the failure.
- Environment probes record process counts or names (`pgrep -c`, `ps -o pid,comm`), never other processes' full command lines (`pgrep -af`, `ps aux`): they can carry API keys.
- Never give a child a step budget or other size cap that narrows the brief's scope. If a phase can't carry everything the brief scopes, it records each unit it leaves out as a brief-change recommendation in the ledger, not just a `dropped` entry.
- Before each planemo attempt, if another `planemo test` is running on the host and `MemAvailable` is under 8 GiB, wait for it to finish (poll every few minutes). An attempt killed by the host OOM killer counts as an attempt with cause "host OOM", not a workflow defect.
- Other planemo Galaxies may be running; run yours anyway. If a failure looks caused by them (port, ~/.planemo cache, locks), report it as a suspected planemo bug with the error text and the other runs' PIDs, then retry once.
Return at most 60 lines: per-phase eval table, then the pipeline eval.md and the case's expect results; misses; incomplete or blocked phases; Mold fixes committed (SHAs); the paths to run-summary.md and the ledger.
```

If a driver hands back while its own planemo run or child is still going (an "interim" report), resume it with SendMessage and tell it to wait and finish. Drivers have done this twice, once claiming they were told to.

## 3. Record (you)

- If the run tested a branch or issue, add the report to that record. Otherwise write `vault/repositories/foundry/pipeline_runs/<YYYY-MM-DD>-<pipeline-short>-<case-short>/index.md`: title, worktree, branch @ SHA, run dir, `## Status` (completed / incomplete / blocked), then the eval table and misses.
- Mold fixes the driver committed: tell John and propose an issue and branch; don't push without a decision.
- Commit the vault record per VAULT_SYNC.
- Archive the run dir once no driver will resume it: `git log --format='%h %ad %s' --date=iso > CHECKPOINTS.txt`, rename its `.git` to `.checkpoints.git` (ignored), then commit the run dir and its `.bin/` to foundry-runs by explicit path and push. Its `.gitignore` drops test data, `.scratch/`, traces and archives.
- Leave the worktree until its commits are pushed or John drops them; then clean it up per WORKTREES.md.
