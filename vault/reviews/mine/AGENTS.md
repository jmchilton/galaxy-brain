# Galaxy PR Reviews

## Source of truth

`index.md` in this directory — a flat list of branches that are in need to get merged. Adding a branch there is the signal to get the branch merged.
## Worktree lifecycle

Worktrees live at `~/projects/worktrees/galaxy/branch/<BRANCH_NAME>/`, managed by `ghwt`.

**Add** — driven by the document. A PR number that appears in `index.md` with no
corresponding worktree gets one:

```sh
ghwt create galaxy <BRANCH_NAME>
```

**Remove** — driven by PR state, *not* by the document. When a PR has been merged or
closed for a few days, tear its worktree down - warn user if files need to be cleaned up first:

```sh
ghwt rm galaxy <BRANCH_NAME>
```

The asymmetry is intentional. Removing a number from `index.md` does **not** mean
destroy the worktree — reviewing may still be in flight, or the note may have been pruned
for tidiness. Only a merged/closed PR that has settled for a few days justifies removal.
Conversely, a still-open PR keeps its worktree even after it drops off the list.

Check PR state with the gh tool.

## Writing reviews

Review notes go here, one file per PR, alongside `index.md`:

```
vault/reviews/mine/<BRANCH_NAME>_<short_description>.md
```

`<short_description>` is a lowercase snake_case slug of the PR title, e.g.
`23170_workflow_invocation_export.md`.

**Run reviews in subagents.** Reading a Galaxy PR's diff plus surrounding code burns a
lot of context; keep the main session as a coordinator. One subagent per PR, each told to
write its own file at the path above and return only a short summary.

## These files are not vault notes

`vault/reviews/**` is excluded from the vault's frontmatter contract — `reviews` is in
`SKIP_DIRS` in `validate_frontmatter.py`, and `!reviews/**` is in the glob in
`site/src/content.config.ts`. That covers `index.md` here too, despite `index.md` being
the validated entry point in `projects/` and `papers/`. So:

- No YAML frontmatter required. Don't add any; it buys nothing here.
- They don't appear in `Index.md`, `Dashboard.md`, or the Astro site.
- Wiki links out to real vault notes (`[[PR 21842 - ...]]`) still work in Obsidian and are
  fine to use, but nothing links back automatically.

If a review matures into something worth publishing, promote it into `vault/research/`
as a proper note (`type: research`, `subtype: pr`) rather than adding
frontmatter in place.
