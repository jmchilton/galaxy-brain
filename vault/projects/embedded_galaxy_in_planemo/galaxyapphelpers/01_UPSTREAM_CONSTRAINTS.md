# Upstream Constraints & Prior Discussion

Gathered 2026-09-16 from planemo PR #1690 (CLOSED) -> #1691 -> #1701 (OPEN).
These are the positions already staked out in public. Any plan must be consistent with them
or explicitly argue against them.

## The vision statement for ask #1 — John, #1690, 2026-09-04

> "The best argument against Gravity I think is that the webserver is a stop-gap right? I would
> love **a core driving loop that just handles like actions and doesn't need any sort of web
> layer. Driving a tool submission -> preparation -> execute -> job finalize - could probably be
> easily done with some library code.** Workflows would really need probably some sort of
> application loop - but we've done some structuring around this in core and it would be great.
> I don't think that goal should prevent this from using gravity in this modality though."

This is ask #1 in the user's own words, predating this session. Treat
`tool submission -> preparation -> execute -> job finalize` as the canonical four-phase spine
the in-process plan must deliver. "Some library code" sets the expected shape: a library API in
Galaxy core, not a test-harness special case.

Note the last sentence: pursuing the core driving loop is **not** a reason to block or unwind
#1701's Gravity engine. The two coexist.

## GIL objection — mvdbeek, #1690, 2026-09-02

> "gravity has the subprocess setup, isn't that the right abstraction? threads are going to be
> gil bound"

The standing objection to in-process/threaded Galaxy. A plan for ask #1 must address it head on.
Likely line: a *test* driving loop is latency-bound on startup and correctness-bound on
sequencing, not throughput-bound on parallel job execution — so GIL contention is not the
binding constraint for a single tool test. Whoever plans ask #1 must make this argument
explicitly with evidence, or concede and adopt subprocess handlers. John notes elsewhere that
the agent analysis found **process isolation**, not the GIL, to be the real benefit of
subprocesses — so isolation/teardown, not speed, is the thing to answer.

## Ownership split — John's recommendation, #1690, 2026-09-02

- **Galaxy core** owns: supported context-managed embedded runtime API, application
  startup/shutdown, restoration of process-global application state, in-process Celery worker
  cleanup (global termination state + fork pools), logging isolation. Rationale: tightly coupled
  to Galaxy and Celery versions; keeping it in Galaxy stops Planemo tracking private internals.
- **Planemo** owns: adapter and policy layer — CLI options/runnables -> ephemeral Galaxy config,
  socket/port selection, readiness checks, logging/diagnostics, tool and workflow installation,
  temp-dir / `no_cleanup` / engine behavior.
- **Gravity** owns: process definitions and external service orchestration.

**This split is binding on both plans.** New capability goes in Galaxy core with a supported API;
Planemo only adapts. Corollary: a plan that puts Galaxy internals knowledge into Planemo is
wrong by the user's own stated standard.

## Explicitly rejected / deferred

- **Do not route an in-process runtime through Gravity.** Gravity's abstraction is process and
  service orchestration; its `stop`/`terminate`/`shutdown` are currently stubs. Putting it
  underneath an in-process runtime either spawns child processes anyway (losing the benefit) or
  forces a large new abstraction into Gravity's scope.
- **Do not create a `galaxy-launcher-library` repo.** It would mostly relocate private
  Galaxy/Celery coupling while adding a synchronized release boundary. Split into a library only
  after the boundary is stable and there is a second real consumer.
  *Generalize this*: it is a standing bias against new release boundaries. Applies directly to
  any temptation to invent a new package for ask #2's CLI.
- `embed_galaxy` branch preserved for reference (planemo worktree
  `~/projects/worktrees/planemo/branch/embed_galaxy`). Prior art for in-process startup —
  a plan for ask #1 should mine it rather than restart.

## Related merged Galaxy work

- galaxyproject/galaxy **#23360** — `build_galaxy_web_app`. Merged. Cited as the foundation the
  embedded runtime API should build on. Review notes in this project:
  `../UPSTREAM_23360_REVIEW.md`.

## Consequences for this session

1. Ask #1 is a **Galaxy core** feature ("core driving loop"), not a Planemo feature. Plans should
   target `lib/galaxy/`.
2. Ask #2's CLI should ship inside an existing Galaxy package. #1701 already established that
   `planemo[installed_galaxy]` may depend on the full Galaxy runtime, so a package split needs a
   concrete justification.
3. The GIL / process-isolation objection is the known review challenge for ask #1. Answer it in
   the plan, do not route around it.
4. Neither plan should propose unwinding #1701.

## Prior art: the `embed_galaxy` branch — what it proves

Worktree: `~/projects/worktrees/planemo/branch/embed_galaxy`, 16 commits ahead of planemo master.
Key file: `planemo/galaxy/embedded.py`, **538 lines**.

Its shape (`grep '^def '`) is the argument for the ownership split, in code:

- `_start_uvicorn` / `_stop_uvicorn` (:264, :288)
- `_start_celery_worker` / `_terminate_celery_worker` / `_stop_celery_worker` (:299, :334, :346)
- `_stop_fork_pool` / `_join_fork_pool` (:360, :366)
- `_embedded_logging` (:198), `_patched_environment` (:182), `_bind_socket` (:169)
- `_cleanup_diagnostic_budget`, `_report_slow_cleanup` (:391, :403)
- `serve_embedded` (:435)

**This is 538 lines of Galaxy/Celery/uvicorn internals living in Planemo** — precisely what the
ownership split says belongs in Galaxy core. Half the commit titles are teardown-hardening
("Harden embedded worker cleanup state", "Harden embedded Galaxy teardown fallbacks",
"Diagnose slow embedded Galaxy teardown"). That churn is the empirical cost of owning this
outside Galaxy, and is the strongest concrete argument for the core-side API.

**Critical distinction — this branch does NOT satisfy ask #1.** It still starts uvicorn and a
Celery worker; it is *embedded web server*, not *no web server*. Ask #1 is strictly further:
no web layer at all, driving `tool submission -> preparation -> execute -> job finalize`
directly through managers/services. Plans must not treat `embed_galaxy` as the finish line —
it is prior art for in-process startup/teardown mechanics and a catalogue of the teardown
hazards (fork pools, process-global state, logging) that any in-process approach inherits.
