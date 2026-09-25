# Session Orientation — Galaxy App Helpers research

Date: 2026-09-16

## Goal (from John)

Two big asks, to be broken into realistic refactoring steps with an ordering:

1. **Run a Galaxy tool test without a web server.** Galaxy is split into managers and
   services; leverage those to run a tool test in-process. Complication: jobs do not run in
   the same thread as tool submission.
2. **`tool-test` -> `tool script` CLI**, pluggable into Planemo. Full expansion of the tool
   script (the thing the job script calls out to). Job-level details explicitly out of scope
   — tool details only. Aim: rapid Galaxy tool development.

Context: planemo PR #1701 ("Run package-installed Galaxy through Gravity", OPEN) established
that Planemo can run the Galaxy packages installed in its own virtualenv. These asks push that
concept much farther into Galaxy itself. This is framed as a *Galaxy* research/planning
session, filed under the Planemo project for convenience.

## Research substrate (pinned)

- Galaxy worktree (read-only, fresh): `/Users/jxc755/projects/repositories/galaxy-embedded-research`
  detached at `c6c3b6df49` == `origin/dev` as of 2026-09-16.
  (The main `~/projects/repositories/galaxy` clone was 854 commits behind `origin/dev`.)
- Planemo PR #1701 worktree: `.../embedded_galaxy_in_planemo/planemo-installed-galaxy-gravity`
  branch `package-installed-galaxy-gravity`.

## Prior art located during orientation

These are the seams the research agents should start from rather than rediscover:

- `lib/galaxy/structured_app/__init__.py:101` — `MinimalToolApp` Protocol. The narrow app
  contract `ToolEvaluator` actually depends on: `config`, `datatypes_registry`, `object_store`,
  `file_sources`, `security`, `tool_data_tables`. Much smaller than a full `UniverseApplication`.
- `lib/galaxy/tools/remote_tool_eval.py` (148 lines) — **existence proof that a DB-free,
  web-server-free tool evaluation works today.** Pulsar re-evaluates a tool with a `ToolApp`
  implementing `MinimalToolApp`, a `SessionlessContext` SQLAlchemy stand-in, a `JobIO` rehydrated
  from `job_io.json`, `create_tool_from_representation()`, and `RemoteToolEvaluator`.
  **Caveat — this is the *back half* of ask #2, not 90% of it.** Everything it consumes
  (`job_io.json`, the model-store export, `tool_data_tables.json`, the datatypes config, the
  object store) is produced by a *real Galaxy* during job setup. The actual work in ask #2 is the
  front half: tool test case -> a `Job` with `input_datasets`/`output_datasets`, HDAs with
  `Dataset` rows and object-store paths, a `History`, a `User`. Use this file as a viability
  proof, not as a template.
- `lib/galaxy/tools/evaluation.py` (1171 lines) — `ToolEvaluator` / `RemoteToolEvaluator`.
  `build()` -> `_build_command_line()`, `_build_config_files()`, `_build_environment_variables()`,
  `_build_param_file()`. This is "the tool script" content.
- `lib/galaxy/jobs/command_factory.py:175` — `script_name="tool_script.sh"`; `__externalize_commands()`
  is where the tool script is actually written out. Job-level wrapping (metadata, dependency
  resolution, stdout capture) is layered around it here — the boundary John wants to cut at.
- `lib/galaxy/tools/runtime.py` — `setup_for_runtimeify()`, tool-state -> runtime JSON adapters.
- `lib/galaxy/app_unittest_utils/` — `galaxy_mock.py` (493 lines), `tools_support.py` (168 lines),
  `toolbox_support.py`. Existing in-process app mocking.
- `test/unit/app/tools/test_evaluation.py` (378 lines) — **the better skeleton for ask #2.**
  `ToolEvaluator` needs only `(app, tool, job, local_working_directory)` plus a
  `ComputeEnvironment` — *not* a `JobIO`. This test already hand-builds a job with input/output
  HDAs against a mock app and runs the evaluator end to end.
- `lib/galaxy/tool_util/verify/` — `interactor.py`, `parse.py`, `script.py`. Tool test parsing and
  the existing HTTP-based test driver. `parse.py` is the tool-test -> structured-test-case step.
- `lib/galaxy/webapps/galaxy/services/` — 25 service classes (`tools.py`, `jobs.py`, `histories.py`,
  `datasets.py`, ...). The web-framework-free layer ask #1 should sit on.
- `lib/galaxy_test/driver/driver_util.py` — existing embedded-Galaxy test driver, for comparison.
- `lib/galaxy/app/__init__.py:301,701,936` — `MinimalGalaxyApplication` -> `GalaxyManagerApplication`
  -> `UniverseApplication`. `GalaxyManagerApplication` is the **already-existing no-web-stack app**
  (what Celery workers use). "Galaxy app without a web server" is largely a solved problem; the gap
  for ask #1 is elsewhere.
- `lib/galaxy/work/context.py:22` — `WorkRequestContext(ProvidesHistoryContext)`, and
  `SessionRequestContext` at :159. The `services/` layer is already FastAPI-free; the real gap for
  ask #1 is constructing a `trans` without an HTTP request. `WorkRequestContext` looks like it.
- **No interactor Protocol exists.** `lib/galaxy/tool_util/verify/interactor.py` has ~60 public
  methods on the concrete `GalaxyInteractorApi`, referenced by concrete type annotation at
  :205, :252, :1755. The only `Protocol` in `verify/` is `TestConfig` (:1707). Extracting a narrow
  interactor interface is therefore itself a refactoring step, not a given.
- `packages/` — 30+ split packages; relevant for deciding *where* new code ships so Planemo can
  depend on it without pulling all of Galaxy.

## Agent plan

File numbering (fixed, agents must not collide):

| File | Author |
| --- | --- |
| `00_SESSION_ORIENTATION.md` | this session (me) |
| `10_RECON.md` | recon agent |
| `11_PROMPT_INPROCESS_TOOL_TEST.md` | recon agent |
| `12_PROMPT_TOOL_SCRIPT_CLI.md` | recon agent |
| `20_PLAN_INPROCESS_TOOL_TEST.md` | planning agent 1 |
| `30_PLAN_TOOL_SCRIPT_CLI.md` | planning agent 2 |
| `40_UNIFIED_PLAN.md` | verification agent |
| `41_VERIFICATION_LOG.md` | verification agent |

1. Recon agent -> `10_RECON.md` + the two research prompts (reviewed by me before dispatch).
2. Two planning agents (in parallel) -> in-process tool test plan; tool-script CLI plan.
3. Verification agent -> verifies claims against code, reconciles, orders -> unified plan.

Standing rules for every agent: research/planning only, **no code changes** in the Galaxy
worktree; cite `file:line` against the pinned worktree; include an explicit
**"claims I could not verify"** section; red-to-green test plan per step; terse
unresolved-questions list at the end.

## The ordering question (for the verification agent)

Do the two asks share a substrate? If ask #2 can live on `SessionlessContext` while ask #1 needs a
real DB plus a job handler, they are independent tracks and "#2 first" buys nothing. If they share
the minimal-app/evaluator foundation, it is a genuine build-up. **That determination is the
ordering answer** — it must not be assumed.
