# Implementation debrief

- Reproduced #204 on `origin/main` `539c16c9` (1.14.0) with the issue's workflow. Root cause: a `skip` edge counted as "no map-over", so the step's data outputs were typed as datasets.
- `0aebee05`: any skipped edge makes the step's map-over unknown and its outputs ANY, so downstream edges skip. `6ea680e7`: same for subworkflow outputs, which aren't in `step.outputs`. `1577f9f7` (thermo review): extracted `_markOutputsUnknown`. `e57c9157`: conflict test.
- Tests are TS-only, red-to-green (`test/unknown-map-over.test.ts`), because the synced `connection_workflows` corpus rejects local extras. The issue repro now gives `1 ok, 0 invalid, 2 skip`.
- `make check` and `make test` green. Patch changeset for `@galaxy-tool-util/connection-validation`.
- An untracked test file from an unknown session appeared in the worktree at 13:13; neither peer workflow_libs session claimed it. Replaced it with this branch's tests.
