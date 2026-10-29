# Workflow Foundry

@../_shared/VAULT_SYNC.md
@../_shared/SECURITY_REPORTS.md
@../_shared/NOT_VAULT_NOTES.md
@../_shared/AGENT_MARKERS.md

We're responsible for maintaining the Foundry ecosystem (`galaxyproject/foundry`).

## Project settings

In the following files:

- PROJECT is `foundry`.
- Base branch: `origin/main`.
- Push remote: `jmchilton` (the `jmchilton/foundry` fork), not `origin`. Branches pushed to `origin` before this stay there until they merge or are abandoned.
- Branch naming: `issue-<number>-<short-slug>`.
- Local gate: `make check`. `check-vendored` and `check:planemo-cli` can fail on this machine only; note them, don't fix them.
- CI runs only on pull requests and `main`, so a pushed branch gets no CI until its PR opens; the fork branch shows no checks.

@../_shared/MY_BRANCHES_INDEX.md
@../_shared/REPOSITORY_BRANCHES.md
@../_shared/WORKTREES.md

The agent running in this directory is responsible for maintaining and promoting branches within [MY_BRANCHES.md](../../repositories/foundry/branches/MY_BRANCHES.md).

Branch records and supporting files live in `vault/repositories/foundry/branches/active/<branch_name>/`.

If the user asks to abandon a branch, follow the process described for that.

Worktree inventory and scan tool: [TREE_MANAGE.md](TREE_MANAGE.md) and
`./scan_worktrees.sh`.

## Automatic Actions

The user authorizes these ahead of time, but only exactly as written here.

- **Rerun unrelated reds.** For each MY_BRANCHES.md entry whose open PR has failed CI: unless its branch record has a CI verdict for that head SHA, check CI per [`CHECK_CI.md`](../_shared/CHECK_CI.md) (upstream `galaxyproject/foundry`) and replace the record's CI line with the verdict. Then rerun per that file's "Rerun unrelated reds". Skip `branches_need_decision` and `branches_reference` entries.

@../_shared/MY_ISSUES_INDEX.md

The issue index is [MY_ISSUES.md](../../repositories/foundry/issues/MY_ISSUES.md).

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

Queued runs and the two-at-a-time cap: [RUN_QUEUE.md](RUN_QUEUE.md). Turning run problems into reviewable findings: [RUN_FINDINGS.md](RUN_FINDINGS.md).
