
- Figure out how to get galaxy-brain consistently published so we can provide permalinks (can we push instead of relying on github actions - is jmchilton.net an option)
- Move POLISH_BRANCH.md and DECOMPOSE_BASELINE_CHANGES_AND_POLISH.md into GX_PROCESS_ documents. 
- Move GX_PROCESS_ documents into `_shared/gx_processes`.
- Conditionally run thermo review on PR reviews (when) - write to thermo_review.md. 
- Implement review awards.
- Integration daily changeset work.
- Bring scope evaluation into development so implementers catch extensions (e.g. issue-thread abstractions) before building, not after.
- Rewrite the `galaxy-playwright` skill: its run commands (shared-user E2E config, 8080, headed) have gone stale; fold in the `galaxy-e2e-local-run-env` / `galaxy-e2e-local-state-accumulates` memories.
- Ensure mypy runs (from `lib/`, like `make mypy`) after hardening and polishing.