# Planemo morning triage — 2026-10-07

Checked all 28 open PRs and 229 open issues against GitHub. No new issues since
the previous sweep. Both issues assigned to jmchilton (#135 and #1137) are already
in the untriaged index. Tracked issue directories still match open GitHub issues;
there are no delegated issues awaiting closure cleanup.

## Next moves

1. Merge [#1735](https://github.com/galaxyproject/planemo/pull/1735), YAML tool
   recognition: reviewed, 14 checks successful, out of draft. Then finish landing
   [#1701](https://github.com/galaxyproject/planemo/pull/1701), installed Galaxy:
   October 6 fixes reviewed, 17 checks successful, still draft. Both are mergeable.
2. Merge [#1733](https://github.com/galaxyproject/planemo/pull/1733), pinned CLI
   distribution: reviewed and out of draft, 21 checks successful. Then refresh
   stacked [#1734](https://github.com/galaxyproject/planemo/pull/1734), Pyrefly:
   23 checks successful, still draft. Both are mergeable.
3. [#1695](https://github.com/galaxyproject/planemo/pull/1695), IWC missing-test
   severity, reviewed today with no findings: 22 workflow-lint tests and six CLI
   assertions pass. [Review](planemo_1695_require_workflow_tests_under_the_iwc_lint_profile.md).
   [#1707](https://github.com/galaxyproject/planemo/pull/1707), temporary inline
   jobs, retains its reviewed head and green CI and is now out of draft.
   Both are mergeable and await merge.
4. New [#1736](https://github.com/galaxyproject/planemo/pull/1736), template cleanup,
   reviewed today with no findings: five build/lint tests and XML generation smoke
   checks pass. CI has 14 successful checks; mergeable and out of draft.
   It also raises the default generated tool profile from 21.05 to 25.0, so new
   wrappers require Galaxy 25.0 or newer.
   [Review](planemo_1736_remove_python_template_version_from_template.md).

All counts exclude the expected skipped release-upload job. GitHub reports
`BLOCKED` for these PRs despite mergeable diffs and passing checks; no merge-conflict
rebase is indicated. No reviews, comments, merges, or draft-state changes were
posted during this sweep.

## CI follow-up and rebases

- [#1700](https://github.com/galaxyproject/planemo/pull/1700) and
  [#1704](https://github.com/galaxyproject/planemo/pull/1704): October 4 failed-job
  retries both succeeded on attempt 2, without source changes. Each now has 14
  successful checks. The earlier Tool Shed installation/quay.io failures did not
  repeat on those attempts.
- [#1706](https://github.com/galaxyproject/planemo/pull/1706) is the only red PR.
  September 14 [run 34865798613](https://github.com/galaxyproject/planemo/actions/runs/34865798613)
  failed `test_data_manager_docker_mount` and
  `test_workflow_test_repository_installation_gxformat2`. Both traces show 12-second
  quay.io read timeouts during BioContainer discovery; the workflow jobs subsequently
  report `fastqc: command not found`. Galaxy had continued after the logged missing
  `galaxy.datatypes.html` import, so that import alone is not the failure diagnosis.
  Retried only the failed job today; attempt 2 is queued. Inspect the result before
  changing linter code. No source change justified yet.
- Only conflicted PR is old external-author draft
  [#1555](https://github.com/galaxyproject/planemo/pull/1555), uvx Galaxy. Decide
  whether its approach is still wanted alongside #1701 before investing in a rebase.
- [#1708](https://github.com/galaxyproject/planemo/pull/1708), `test --serve`, remains
  green and draft, but its head `4f5f6cbc` does not contain #1701's October 6 fix
  `ee14c2b2`. Refresh the stack and repeat lifecycle checks after the prerequisite
  runtime work lands.
- [#1715](https://github.com/galaxyproject/planemo/pull/1715), async submission,
  remains an external-author review candidate: green, mergeable, out of draft.

## Worktree and note cleanup

- Archived merged #1111 and #1730 review notes under `old/`.
- Removed the merged #1727 `issue-1478-autoupdate-exit-code` worktree with `ghwt rm`:
  it was clean, had an upstream, and had zero unpushed commits.
- Retained clean merged #1111 and #1730 PR worktrees because neither has an upstream;
  shared cleanup policy requires confirmation before removing them.
- Retained closed/merged authoring worktrees with uncommitted changes:
  `declare-rich-dependency` (#1682), `embed_galaxy` (#1690),
  `gxformat2_update_followup` (#1642), `linting_update` (#1633), and
  `workflow_work` / `foundry_update` (#1666). The first and fourth also lack upstreams.
- Created and retained a clean #1736 review worktree. #1695 review reused its clean
  authoring worktree at the exact PR head without modifying it.

Updated active review statuses and wrote today's two reviews. Existing unrelated
working changes are preserved. No implementation branch was changed during this sweep.
