# Agent and repository files are not vault notes

`vault/agents/**` and `vault/repositories/**` are outside the vault's note contract.
They're excluded by `SKIP_DIRS` in `validate_frontmatter.py` and by the glob in
`site/src/content.config.ts`. That includes every `index.md` under them (review, issue,
and branch records), despite `index.md` being the validated entry point in `projects/`
and `papers/`.

- No YAML frontmatter. Don't add any.
- They don't appear in `Index.md`, `Dashboard.md`, or the Astro site.
- Wiki links out to vault notes (`[[PR 21842 - ...]]`) work in Obsidian; nothing links back.

To publish a record, promote it into `vault/research/` as a proper note (e.g.
`subtype: pr` or `subtype: issue`) rather than adding frontmatter in place.
