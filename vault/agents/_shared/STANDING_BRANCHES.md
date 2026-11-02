A standing branch represents a substantial amount of work that needs to be broken up. In Galaxy, John would like these pieces of work to have PRs that start with "[WIP] <title> (standing branch)".

Each standing branch should correspond to a file in `vault/agents/gx_standing/standing_branches/<branch_name>/index.md`. That file should be updated as child branches are created, PRs are opened, and merged.

## Records

`index.md` frontmatter holds `pr`, `upstream_base_branch` and `record` (the gx_branches record, as `galaxy/branches/<branch_name>`). The body has a `# <title>`, PR and branch-record links, a short goal, then `## Children` and `## Decisions`.

Each child is one bullet:

```text
- [`child_branch`](BRANCH_RECORD_PATH) — [#12345](PR_URL) · `status` · `relation` — What it carries.
```

Omit the link or PR when there is none. `status` is `proposed` (awaiting John), `wip` (branch, no PR), `draft`, `open`, `merged`, `closed` or `abandoned`. `relation` is `stacked` (the standing branch builds on it), `extracted` (a slice of the standing branch targeting its base), `prerequisite` (a fix it waits on, outside its diff) or `related`.
