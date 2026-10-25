# Workflow Foundry

@../_shared/VAULT_SYNC.md
@../_shared/SECURITY_REPORTS.md
@../_shared/NOT_VAULT_NOTES.md

We're responsible for maintaining the Foundry ecosystem (`galaxyproject/foundry`).

## Project settings

In the following files:

- PROJECT is `foundry`.
- Base branch: `origin/main`.
- Push remote: `origin` (`galaxyproject/foundry`), not the `jmchilton` fork.
- Branch naming: `issue-<number>-<short-slug>`.
- Local gate: `make check`. `check-vendored` and `check:planemo-cli` can fail on this machine only; note them, don't fix them.
- CI runs only on pull requests and `main`, so a pushed branch gets no CI until its PR opens.

@../_shared/MY_BRANCHES_INDEX.md
@../_shared/REPOSITORY_BRANCHES.md
@../_shared/WORKTREES.md

The agent running in this directory is responsible for maintaining and promoting branches within [MY_BRANCHES.md](../../repositories/foundry/branches/MY_BRANCHES.md).

Branch records and supporting files live in `vault/repositories/foundry/branches/active/<branch_name>/`.

If the user asks to abandon a branch, follow the process described for that.

Worktree inventory and scan tool: [TREE_MANAGE.md](TREE_MANAGE.md) and
`./scan_worktrees.sh`.

@../_shared/ISSUES_INDEX.md

## Label mapping

Foundry issues carry triage labels on GitHub, defined in Foundry's `content/meta/issue-labels.md`. Derive an issue's status from them, first match wins:

1. Closed on GitHub → `closed`.
2. An open PR or a branch addresses it → `wip`.
3. `requires-iwc-inputs` or any `upstream/*` → `blocked`.
4. `agent/research` or `agent/implement` → `queued`.
5. `agent/human` → `needs_decision`: John drives it.
6. `needs-triage` → `untriaged`.
7. Otherwise (no `agent/*` label yet) → `needs_decision`: John picks who drives it.

To triage an issue, follow [TRIAGE_ISSUE.md](TRIAGE_ISSUE.md).

Mark `priority/mvp` as `(mvp)` and `roadmap/main` as `(large)`. When our research overrides the labels (e.g. an upstream fix landed), say why in the issue's `index.md`.

## Mold fixes

When a run exposes a Mold problem, fix the Mold and its eval directly; don't write a `refinements/` note unless John asks. Run evidence goes in the PR description or vault tracking note.

## Pipeline tests

To test-drive a pipeline (`/test-pipeline` journey), follow [TEST_PIPELINE.md](TEST_PIPELINE.md). Overview and lessons: [DRIVING_PIPELINE_TESTS.md](DRIVING_PIPELINE_TESTS.md).

To grow a workflow's golden brief over repeated builds, follow [GOLDEN_PLANS.md](GOLDEN_PLANS.md).
