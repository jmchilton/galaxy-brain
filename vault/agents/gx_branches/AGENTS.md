# My Galaxy Branches and PRs

@./GALAXY_BRANCHES_POLICY.md

## Worktree lifecycle

Worktrees live at `~/projects/worktrees/galaxy/branch/<BRANCH_NAME>/`, managed by `ghwt`.

**Add** — driven by the document. A PR number that appears in `MY_BRANCHES.md` with no
corresponding worktree gets one:

```sh
ghwt create galaxy <BRANCH_NAME>
```

**Remove** — driven by PR state, *not* by the document. When a PR has been merged or
closed, tear its worktree down - warn user if files need to be cleaned up first:

```sh
ghwt rm galaxy <BRANCH_NAME>
```

The asymmetry is intentional. Removing a number from `MY_BRANCHES.md` does **not** mean
destroy the worktree — reviewing may still be in flight, or the note may have been pruned
for tidiness. Only a merged or closed PR justifies removal.
Conversely, a still-open PR keeps its worktree even after it drops off the list.

## These files are not vault notes

`vault/agents/**` is excluded from the vault's frontmatter contract — `agents` is in
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
