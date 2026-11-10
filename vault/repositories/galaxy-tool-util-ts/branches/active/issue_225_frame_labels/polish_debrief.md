# Polish debrief — `issue_225_frame_labels`

Run via Claude Opus 5.5 at low effort.

- Wrote [pr_description.md](pr_description.md). One strengthening round returned no development tasks, plus wording fixes that are all applied:
  - The console block now shows lint's exit code.
  - The `convert-tree` wording no longer leans on its summary count, which still reports a failed file as converted. That count predates this branch.
  - The step-label rule is generalized: any step with an explicit `label` can't be referenced by its `id` or map key. Verified on the Python side.
  - The `validate --connections` crash is unhidden.
- Scope questions left for John:
  - Should `validate --connections` report conversion errors now, or with #220?
  - Should the range check on integer and digit indices be a follow-up?
- Head `5d66d799`: implementation, a shared label helper, a restored non-frame `contains_comments` error, and two thermo refactors.
