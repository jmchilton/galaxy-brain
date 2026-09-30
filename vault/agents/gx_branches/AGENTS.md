# My Galaxy Branches and PRs

@./GALAXY_BRANCHES_POLICY.md

In the following file, PROJECT is `galaxy`.

@../_shared/WORKTREES.md

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
