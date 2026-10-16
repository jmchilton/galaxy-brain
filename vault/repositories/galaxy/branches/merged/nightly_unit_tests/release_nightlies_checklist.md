# Final release nightly checklist — 2026-10-14

Independent review of preview and final `a13b016c0ff`, including full origin/dev diff. GENERAL applies; WORKFLOW_RELATED does not (GitHub Actions, not Galaxy workflows).

- [ ] Did a human read every test and every comment? Requires fresh read after extension.
- [x] What does the user see when it fails? Failed jobs/artifacts, isolated suite/branch tracking issues and actual tested SHA; target-resolution failures fail preparation visibly.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Tests exercise version changes, resolution failures, duplicate branches and report isolation.
- [x] Are the comments free of excess archeology? Yes; operational and compatibility constraints only.
- [x] If comments describe prior implementation or bugs, what purpose do they serve? Preserve release PR policy and explain compatibility fallbacks.

Review fixes applied before commit: use tested SHA/branch for Codecov, and preserve release26.1 if_needed/always. Both were rechecked. No remaining blocker. Full release runtime remains unverified.
