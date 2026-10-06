# planemo#1267 — workflow_lint doesn't match best practice checks

[Issue](https://github.com/galaxyproject/planemo/issues/1267)

Close candidate. **Not implemented** — the #1213 false positive is fixed (proved by counterfactual), but `workflow_lint` and the editor's Best Practices panel lint different data structures: planemo reads the legacy `.ga` `step["inputs"]` list, so it false-positives on nested conditional inputs and misses a genuinely dangling data input. Close-with-ask; the divergence table and 11 enumerated follow-ups were in `ISSUE_CLOSE_DRAFTS_2026-09-21` (no longer in the vault). Highest-value single fix is galaxy `managers/workflows.py:1764` (`val` should be `partval`) — three of the planemo-side items collapse into it.
