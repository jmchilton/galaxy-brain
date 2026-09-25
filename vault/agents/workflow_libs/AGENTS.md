# Workflow library reviews

This directory coordinates reviews and related development across:

- [gxformat2](https://github.com/jmchilton/gxformat2) — Python Format 2 workflow support.
- [galaxy-tool-util-ts](https://github.com/jmchilton/galaxy-tool-util-ts) — TypeScript workflow tooling and the `gxwf` CLI.
- [gxwf-web](https://github.com/jmchilton/gxwf-web) — Python API and web serving.
- [galaxy-workflows-vscode](https://github.com/davelopez/galaxy-workflows-vscode) — editor integration.

## Queue and worktrees

`index.md` is the review queue. Add a PR number under its repository heading to request a review. Keep review notes here as `<repo>_<number>_<short_slug>.md`, without frontmatter. This directory is excluded from vault validation and the site.

Use `ghwt create <project> <PR_NUMBER>` for queued PRs that lack a worktree. Worktrees normally live under `~/projects/worktrees/<project>/pr/<PR_NUMBER>/`; check the actual path with `ghwt` because the local project name can differ from the GitHub repository name. An existing development branch under `branch/` is separate from a PR review worktree.

Check PR state with `gh pr view <PR_NUMBER> --repo <owner>/<repo> --json state,mergedAt,closedAt`. Remove a worktree with `ghwt rm <project> <PR_NUMBER>` only after its PR has been merged or closed for a few days. Removing a number from `index.md` alone does not remove its worktree.

## Cross-repository work

- Trace a behavior through the Python library, TypeScript library, API, and extension before changing a shared contract. Keep corresponding report models and fixtures aligned.
- When the API shape changes, regenerate the OpenAPI schema in `gxwf-web`, sync it into `galaxy-tool-util-ts`, and regenerate its API types. Commit the schema and generated types together.
- Favor the declarative workflow fixtures for cross-language behavior checks. Run focused tests in each affected repository; follow its current local instructions for commands and dependencies.
- Treat the older `vault/projects/workflow_state/` documents as historical context. Verify branch paths, package layout, and planned features against the current repositories before relying on them.
