# Agent and repository files are not vault notes

`vault/agents/**` and `vault/repositories/**` (every `index.md` included) are excluded from vault validation and the Astro site. Do not add YAML frontmatter.
Wiki links to real vault notes are allowed, but these files receive no automatic backlinks.
To publish a record, promote it into `vault/research/` as a proper note.
