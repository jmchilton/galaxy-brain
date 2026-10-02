# Planemo authoring worktrees

General Planemo PR descriptions live alongside this file. They were moved here unchanged from `vault/projects/embedded_galaxy_in_planemo/` on 2026-09-16.

The unrelated authoring worktrees were relocated with `git worktree move` to `/Users/jxc755/projects/worktrees/planemo/branch/`. Each directory below has the same name as its checked-out branch; commits and branch tracking were preserved.

| Branch / directory                    | Description                                                                   |
| ------------------------------------- | ----------------------------------------------------------------------------- |
| `config-option-conversion`            | [#1667: configured option conversion](PR_DESCRIPTION_1667.md)                 |
| `deduplicate-wait-on`                 | [#1680: shared wait helper](PR_DESCRIPTION_1680.md)                           |
| `error-response-structured-data`      | [Standalone engine error reporting](PR_DESCRIPTION_STRUCTURED_DATA_ERRORS.md) |
| `issue-1694-iwc-changelog-date`       | [#1694: IWC changelog validation](PR_DESCRIPTION_1694.md)                     |
| `list-all-invocations-rebased`        | [#1530: invocation listing](PR_DESCRIPTION_1530_REBASED.md)                   |
| `modern-linters-rebased`              | [#1472: tool linters](PR_DESCRIPTION_1472_REBASED.md)                         |
| `pin-supported-galaxy-python-rebased` | [#1490: Galaxy Python version](PR_DESCRIPTION_1490_REBASED.md)                |
| `anonymous-external-galaxy-api`       | [#1477: external Galaxy API](PR_DESCRIPTION_1477_REBASED.md)                  |
| `python-gc-doc-example`               | [#705: Python GC example](PR_DESCRIPTION_705_RESCUE.md)                       |
| `shed-lint-fail-fast`                 | [#542: lint fail-fast](PR_DESCRIPTION_542.md)                                 |
| `test-job-files-in-tmpdir`            | [#1438: temporary test jobs](PR_DESCRIPTION_1438_REPLACEMENT.md)              |
| `tool-no-wait`                        | [#1668: tool execution without waiting](PR_DESCRIPTION_1668.md)               |

[PR_DESCRIPTION_1692.md](PR_DESCRIPTION_1692.md) and [PR_DESCRIPTION_1693.md](PR_DESCRIPTION_1693.md) were also moved here; their worktrees were not in the embedded-Galaxy project directory.

These are existing authoring branches, not new `ghwt` PR-review worktrees. The review list and its lifecycle rules in [AGENTS.md](agents/planemo/AGENTS.md) are unchanged.

## Package-installed Galaxy work

The [embedded-Galaxy project](../../projects/embedded_galaxy_in_planemo/README.md) retains its research, `galaxyapphelpers/`, and the two related worktrees:

- `planemo-installed-galaxy-gravity/` — #1701 and its Gravity-managed installed runtime.
- `planemo-test-serve-results/` — the `test --serve` follow-up stacked on #1701.

Their PR descriptions remain there: `PR_DESCRIPTION.md`, `PR_DESCRIPTION_INSTALLED_GALAXY_GRAVITY.md`, and `PR_DESCRIPTION_1175_REDESIGN.md`.
