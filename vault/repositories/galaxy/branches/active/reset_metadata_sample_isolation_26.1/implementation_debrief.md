STATUS: READY. Hardening complete on 2026-10-25; retain the implemented scope. Branch `reset_metadata_sample_isolation_26.1` is pushed to John's fork at `96b94dd2697`, based on `release_26.1` (`d9647406cf6`). Handoff queue: `branches_implemented_needs_ci`.

The fix keeps repository scanning and metadata paths tied to the checked-out revision, stages sample copies in `ValidationContext`'s temporary tool-data directory, and removes the fallback to tip samples. Sample-only XML files no longer become tools during reset, and historical revisions use their own table/sample definitions. Hardening required no production changes.

Moved the two regressions to the existing public Tool Shed repository API suite and removed the unused unit-test scaffolding in commit `96b94dd2697`. The original preparatory refactor already precedes the fix; the baseline reviewer retained that history. Code-quality review found no blocking findings. Scope evaluation retained the complete sample-isolation repair and documented alternatives and possible decomposition. Upload-wide table-state policy and empty-revision row retention remain separate decisions recorded in the source dry-run branch.

Validation:

- Complete repository API suite: **40 passed**.
- Complete Tool Shed unit suite: **99 passed, 12 skipped**; two former unit regressions now run through the API.
- Both final API regressions fail at their own metadata assertions with the release-base generator: reset adds the sample-only `Filter1` tool or loses the historical 1.0 metadata row. Restored the fixed generator byte-for-byte afterward.
- `make format`: passed, 2,564 Python files unchanged; worktree clean. Commit hooks, including black, ruff, flake8, and prettier, passed; branch diff whitespace check passed.
- Mypy on both changed files reports only the generator's two existing errors (unreachable assignment and unused ignore), independently reproduced against `d9647406cf6`.
- No UI changes or browser tests; screenshot and E2E-polish stages do not apply. This Codex run does not require the Claude-only Codex-review stage.

Runtime setup built the Tool Shed frontend from locked dependencies and installed repository-pinned pytest-xdist into the existing shared virtualenv. No tracked build/configuration files changed. API runs omitted the Galaxy server and disabled Conda auto-initialization.

Reports: `test_challenges_debrief.md`, `thermo_nuclear_review.md`, `baseline_refactor.md`, and `scope_evaluation.md`. The green API report is `/tmp/reset_metadata_api_green.html`; red evidence is `/tmp/reset_metadata_api_red.log` and `/tmp/reset_metadata_api_red.html`.

Fork CI has not been assessed for the new head; no PR was opened. No issue comment is needed for this hardening-only continuation of an already extracted implementation. The branch-management agent can proceed with CI and polish.

Vault synchronization limitation: repository-wide `make validate` reports one unrelated existing error in untracked `vault/FILL_IN_AT_RUNTIME.md` (missing frontmatter), plus advisory warnings. That file was left untouched; this branch's plain-document records are excluded from frontmatter validation. Galaxy tests and checks are complete; the vault error does not arise from this work.
