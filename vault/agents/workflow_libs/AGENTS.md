# Workflow library maintenance

@../_shared/VAULT_SYNC.md
@../_shared/SECURITY_REPORTS.md
@../_shared/NOT_VAULT_NOTES.md

This directory coordinates reviews and related development across:

- [gxformat2](https://github.com/galaxyproject/gxformat2) — Python Format 2 workflow support.
- [galaxy-tool-util-ts](https://github.com/jmchilton/galaxy-tool-util-ts) — TypeScript workflow tooling and the `gxwf` CLI.
- [gxwf-web](https://github.com/jmchilton/gxwf-web) — Python API and web serving.
- [galaxy-workflows-vscode](https://github.com/davelopez/galaxy-workflows-vscode) — editor integration.

## Project settings

In the following files, PROJECT is the repository a branch or PR belongs to.

- `gxformat2`: upstream `galaxyproject/gxformat2`, base branch `origin/main`, push remote the `jmchilton` fork. CI runs on pushes too, so a pushed branch gets fork CI before any PR.
- `galaxy-tool-util-ts`: upstream `jmchilton/galaxy-tool-util-ts`, base branch `origin/main`, push remote `origin`. CI runs only on pull requests and `main`, so a pushed branch gets no CI until its PR opens.

@../_shared/MY_BRANCHES_INDEX.md
@../_shared/REPOSITORY_BRANCHES.md
@../_shared/WORKTREES.md
@../_shared/PROCESS_INITIAL_REVIEW.md
@../_shared/REVIEW_FOCUS.md
@../_shared/ISSUES_INDEX.md
@../_shared/PULL_REQUESTS_INDEX.md

Review records live under `vault/repositories/PROJECT/reviews/` for the PR's repository; [PULL_REQUESTS.md](agents/workflow_libs/PULL_REQUESTS.md) is the shared queue. Include the repository in each entry's label.

The agent running in this directory is also responsible for maintaining and promoting John's branches within the [gxformat2](../../repositories/gxformat2/branches/MY_BRANCHES.md) and [galaxy-tool-util-ts](../../repositories/galaxy-tool-util-ts/branches/MY_BRANCHES.md) queues. Branch records and supporting files live in `vault/repositories/PROJECT/branches/active/<branch_name>/`.

## Automatic Actions

The user authorizes these ahead of time, but only exactly as written here.

- **Rerun unrelated reds.** For each entry in those queues whose PR or pushed branch has failed CI: unless its branch record has a CI verdict for that head SHA, check CI per [`CHECK_CI.md`](../_shared/CHECK_CI.md) (upstream from the project settings) and replace the record's CI line with the verdict. Then rerun per that file's "Rerun unrelated reds". Skip `branches_need_decision` and `branches_reference` entries.

## Cross-repository work

- Trace a behavior through the Python library, TypeScript library, API, and extension before changing a shared contract. Keep corresponding report models and fixtures aligned.
- When the API shape changes, regenerate the OpenAPI schema in `gxwf-web`, sync it into `galaxy-tool-util-ts`, and regenerate its API types. Commit the schema and generated types together.
- Favor the declarative workflow fixtures for cross-language behavior checks. Run focused tests in each affected repository; follow its current local instructions for commands and dependencies.
- Treat the older `vault/projects/workflow_state/` documents as historical context. Verify branch paths, package layout, and planned features against the current repositories before relying on them.
- When the work requires Galaxy core development, hand the Galaxy branch off using the process in [`GX_IMPLEMENTATION_HANDOFF.md`](../_shared/GX_IMPLEMENTATION_HANDOFF.md).
