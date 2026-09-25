# PR 23694 — Fix user-defined tool references in workflow steps

PR: https://github.com/galaxyproject/galaxy/pull/23694  
Head reviewed: `282dd5606e499a784f64169770bc29214610a097`  
Base: `release_26.1` (current upstream tip verified as `e03fbb5de35efe894d2dfa72c1b33f80e1b0291b`)  
State at review: open, non-draft, mergeable; all reported CI checks pass (CWL job intentionally skipped).

## Recommendation

Approve. I found no correctness or release-blocking issue.

The central model is coherent: a private user-defined tool step is identified by its `dynamic_tool` relationship, `effective_tool_id` derives the display/serialization id from that relationship, and toolbox resolution continues to use the owner-scoped UUID. The change consistently carries that model through workflow copying, editor/run/preview/export serialization, execution, extraction, refactoring, BCO, RO-Crate, WES, and report generation. Portable exports correctly drop the server- and owner-local UUID while retaining the embedded definition; internal representations retain the UUID where needed.

Shared/published imports create owner-scoped copies before copying the workflow, including nested subworkflows, and remap copied steps to the new dynamic tools. The permission failure is deliberately early, preventing creation of an unusable imported workflow. Admin-created public dynamic tools remain on the existing toolbox/tool-id path.

## Findings

No blocking findings.

Minor, non-blocking test gap: `SoftwarePrerequisiteTracker` is correctly changed from class-level mutable state to instance state, but `test_software_prerequisite_tracker` still exercises only one instance. A small assertion that a second tracker starts empty or can independently register the same tool would directly pin the cross-export regression. The implementation itself is straightforward and this does not justify holding the PR.

## Test evidence

- Local focused unit suite: `33 passed`:
  - `test/unit/tool_util/test_user_tool_authoring_help.py`
  - `test/unit/workflows/test_authoring_help_workflows.py`
  - `test/unit/data/test_bco_utils.py`
- Local focused API suite: `6 passed` covering:
  - deriving the UDT id from the dynamic tool,
  - execution through a UUID reference plus BCO/RO-Crate output,
  - native/format2 export round trips,
  - shared import by another user,
  - `upgrade_all_steps` behavior,
  - workflow rename/copy behavior.
- `git diff --check origin/release_26.1...HEAD` passed.
- GitHub CI is fully green across API, integration, workflow/tool framework, unit, package, lint, client, Selenium/Playwright, startup, docs, and database-index jobs.

The local worktree has no review-induced changes.
