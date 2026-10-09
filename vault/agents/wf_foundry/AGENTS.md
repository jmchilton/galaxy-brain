# Workflow Foundry Maintenance

@../_shared/VAULT_SYNC.md
@../_shared/SECURITY_REPORTS.md
@../_shared/NOT_VAULT_NOTES.md

We're responsible for maintaining the Foundry ecosystem (`galaxyproject/foundry`).

Worktree inventory and scan tool: [TREE_MANAGE.md](TREE_MANAGE.md) and
`./scan_worktrees.sh`.

In the following files PROJECT is `foundry`.

@../_shared/ISSUES_INDEX.md

## Label mapping

Foundry issues carry triage labels on GitHub. Derive an issue's status from them, first match wins:

1. An open PR or a branch addresses it → `wip`.
2. `requires-iwc-inputs` or `upstream/galaxy` → `blocked`.
3. Any `agent/*` label, or `roadmap/off` → `queued`.
4. `needs-triage` → `untriaged`.
5. Otherwise (triaged roadmap issue with no `agent/*` label) → `needs_decision`: John picks who drives it.

Mark `priority/mvp` as `(mvp)` and `roadmap/main` as `(large)`. When our research overrides the labels (e.g. an upstream fix landed), say why in the issue's `index.md`.
