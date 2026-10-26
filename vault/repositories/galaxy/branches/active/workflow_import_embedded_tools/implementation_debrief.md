STATUS: READY

Fixed [#24471](https://github.com/galaxyproject/galaxy/issues/24471) on [workflow_import_embedded_tools](https://github.com/jmchilton/galaxy/tree/workflow_import_embedded_tools), pushed at `d8e943eff4c`. Target: `release_26.1`, the first release branch with embedded GalaxyUserTool imports. Human review and fork CI remain pending; no PR was opened.

The importer now resolves embedded tool definitions in its dependency pre-pass, before outputs or post-job actions can put incomplete workflow steps into the database session. Both user tools and admin dynamic tools share the resolver with standalone module construction. Existing recursive subworkflow loading gives nested imports the same ordering. Ownership checks, user permissions, private copies and standalone tool creation retain their existing behavior.

Scope review recommends retaining this implementation. It fixes the shared ordering failure for user and admin imports rather than delaying individual output/PJA writes. Transaction-wide rollback of independently created tools and write-free dry runs remain separate design questions. The repeated user-tool ownership lookup/materialization is retained to keep the canonical permission checks shared; no import-only bypass or cache was introduced.

Validation:

- Two baseline cases passed before implementation, committed first as `7bc2781a561`.
- Six user-tool and two admin-tool regressions reproduced `NOT NULL constraint failed: workflow_step.workflow_id` on the base implementation.
- All 10 strengthened import variants pass, checking earlier outputs, rename actions, stock predecessors, nested workflows, embedded definitions and preserved connections.
- The broader selected user-tool API run passed 26 cases, including execution, export/import, sharing, permissions and refactoring. Together with the admin checks, 28 distinct relevant API cases passed.
- Normal review, test challenge, code quality review, baseline-history evaluation and scope evaluation completed. The quality review's resolver transaction documentation was applied.
- `make format` passed; its unrelated existing quote normalization in `mulled_build.py` was reverted. Commit hooks and `git diff --check` passed.
- Mypy on the three changed files reports only the same three pre-existing unused-ignore errors in `managers/workflows.py` as the base branch. The test file passes separately.
- Vault validation: 126 files, zero errors, 15 existing advisory warnings. No UI changes, screenshots or database migrations were needed.

History keeps baseline tests first, the resolver extraction second, and the import fix plus regression cases third. The final commit documents the resolver's possible session commits. Full review details are in the sibling debriefs. The worktree is clean and all four commits are pushed.

Hardening snapshot:

```text
created /Users/jxc755/projects/repositories/galaxy-brain/vault/repositories/galaxy/branches/active/workflow_import_embedded_tools/differential-review/snapshots/20261026T144002Z-hardening-d8e943eff4c4.json
  hardening @ d8e943eff4c4 vs origin/release_26.1 (merge-base b17e5145564f)
  since 20261026T143606Z-implementation-9b4b8fde4150:
    commits: 3 same, 0 rebased, 0 changed, 1 new, 0 dropped
    hunks:   4 carried, 1 changed, 0 new, 0 dropped
    new     d8e943eff4c4 Document embedded tool resolution transaction side effects
```
