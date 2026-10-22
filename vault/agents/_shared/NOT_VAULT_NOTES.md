# Agent and repository files are not vault notes

`vault/agents/**` and `vault/repositories/**` (every `index.md` included) are excluded from vault validation. Do not add YAML frontmatter.
Repository records are published on the site as raw records; agent files aren't, except the factory landing pages (`agents/factory/FACTORY.md` and `*_FACTORY.md`).
Wiki links to real vault notes are allowed, but these files receive no automatic backlinks.
To publish a record as a proper note, promote it into `vault/research/`.
