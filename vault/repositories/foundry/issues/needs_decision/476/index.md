# foundry#476 — Build a Pi-backed black-box Pipeline evaluation harness

[Issue](https://github.com/galaxyproject/foundry/issues/476)

- [Resume plan (2026-10-14)](PLAN_2026-10-14.md)
- [#569 + #476 joint work set (2026-10-14)](WORK_SET_569_2026-10-14.md): #569 rebased locally, all gates green

Labels at seeding (2026-10-06): `priority/mvp`, `roadmap/main`.

## Status (2026-10-14, `origin/main` @ `01c89ca0`)

- Steps 1–2 are done: the single-skill Pi runner with local and container sandboxes (#488), and the linear `test-pipeline` (#489).
- Then the tool-conversion detour: #530–#542, plus nfcore-tool-lab #544/#560.
- Steps 3–5 are not started: loop/branch predicates, independent grading, black-box lane and CI.
- Related:
  - #569, mvdbeek's draft run record and dashboard.
  - #662, the assertion oracle.
  - #643, the inverted summarize-nextflow validator.
  - #534, pinned scenarios.
  - #531/#535, the linear pipelines to prove.
- Worktree `pi-harness-resume` was created 2026-10-14. It has no commits yet.
