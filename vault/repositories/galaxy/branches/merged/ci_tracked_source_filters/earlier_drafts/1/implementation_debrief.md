# Implementation handoff

STATUS: READY. Branch `ci_tracked_source_filters` is pushed to `jmchilton/galaxy` at `f42c9e5e5452121d9aa7f4ea346312e8dced68cf`. Human review and GitHub CI remain pending; no PR was opened. Queue: `branches_implemented_needs_ci`.

Restore tracked `lib/...` CI filters removed by merged PR [#23999](https://github.com/galaxyproject/galaxy/pull/23999). The package source directories remain symlinks; edits through their aliases appear as `lib/...` paths in Git. The implementation adds 59 filter lines across 25 workflows: source/dependency inclusions in eight workflows and Selenium exclusions in seventeen workflows. Package patterns stay in place to cover package metadata and the future source move. No job bodies, requirements reads, event types, schedules, permissions or workspace configuration change.

The initial implementation and all independent reviews are complete. Normal review and code-quality review requested no changes. The first paragraph of scope_evaluation.md recommends keeping the implemented scope and handing off READY. No findings were deferred; no scope decision is required.

Validation: 25 edited workflow YAML files parsed; all 59 removed pre-merge source patterns tested using representative tracked files against actual parsed event lists (25 inclusion and 34 exclusion checks). A temporary edit through the schema package alias produced only the tracked `lib/galaxy/schema/history.py` Git diff path, then was restored. Existing package filters, job bodies and workflow-file triggers were verified unchanged. `git diff --check` and the commit-time Validate GitHub Workflows hook passed. The implementation worktree is clean.

No repository test code was added, so the test-challenge and E2E-polish steps do not apply. No Galaxy UI/client code changed, so screenshots do not apply. Code-quality review was performed because the patch exceeds 50 added lines. Codex-specific external review is not required for this Codex implementation. Runtime tests would not validate GitHub scheduling; source-only filter validation is documented separately from eventual CI runs.

Vault checks: make validate passed with zero errors and 15 existing advisory warnings; make check-index and make check-dashboard passed. Handoff notes and the single queue entry are committed selectively on main. Vault sync is deferred because main already had 94 unpublished commits unrelated to this task; pushing it would publish that backlog. No unrelated working-tree changes are included in this handoff commit.

Worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/ci_tracked_source_filters`.

See [validation](validation.md), [normal review](subagents/normal_review.md), [code-quality review](thermo_nuclear_review.md), and [scope evaluation](scope_evaluation.md).
