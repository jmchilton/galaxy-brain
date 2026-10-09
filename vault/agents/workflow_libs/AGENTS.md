# Workflow library maintenance

@../_shared/VAULT_SYNC.md
@../_shared/SECURITY_REPORTS.md

This directory coordinates reviews and related development across:

- [gxformat2](https://github.com/jmchilton/gxformat2) — Python Format 2 workflow support.
- [galaxy-tool-util-ts](https://github.com/jmchilton/galaxy-tool-util-ts) — TypeScript workflow tooling and the `gxwf` CLI.
- [gxwf-web](https://github.com/jmchilton/gxwf-web) — Python API and web serving.
- [galaxy-workflows-vscode](https://github.com/davelopez/galaxy-workflows-vscode) — editor integration.

@../_shared/WORKTREES.md
@../_shared/REVIEW_NOTES.md
@../_shared/REVIEW_FOCUS.md
@../_shared/ISSUES_INDEX.md
@../_shared/PULL_REQUESTS_INDEX.md

Review records live under `vault/repositories/PROJECT/reviews/` for the PR's repository; [PULL_REQUESTS.md](PULL_REQUESTS.md) is the shared queue. Include the repository in each entry's label.

## Cross-repository work

- Trace a behavior through the Python library, TypeScript library, API, and extension before changing a shared contract. Keep corresponding report models and fixtures aligned.
- When the API shape changes, regenerate the OpenAPI schema in `gxwf-web`, sync it into `galaxy-tool-util-ts`, and regenerate its API types. Commit the schema and generated types together.
- Favor the declarative workflow fixtures for cross-language behavior checks. Run focused tests in each affected repository; follow its current local instructions for commands and dependencies.
- Treat the older `vault/projects/workflow_state/` documents as historical context. Verify branch paths, package layout, and planned features against the current repositories before relying on them.
- When the work requires Galaxy core development, hand the Galaxy branch off using the process in [`GX_IMPLEMENTATION_HANDOFF.md`](../_shared/GX_IMPLEMENTATION_HANDOFF.md).
