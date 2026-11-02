# Agent and repository files are not vault notes

`vault/agents/**` and `vault/repositories/**` (every `index.md` included) are excluded from vault note validation. Do not add vault-note frontmatter. Branch records use the small YAML metadata contract in [REPOSITORY_BRANCHES.md](REPOSITORY_BRANCHES.md); any record may carry `blockers:` and `blocking:` per [BLOCKERS.md](BLOCKERS.md), and `related_records:`, one `<repo>/<kind>/<name>` reference or a list, for records worth reading together. List a related pair on both records. Unlike relative links, these references survive status moves. `make validate` checks record frontmatter against `meta_record_schema.yml`. Other agent and repository files remain without frontmatter.
Repository records are published on the site as raw records; agent files aren't, except the factory landing pages (`agents/factory/FACTORY.md` and `*_FACTORY.md`).
Wiki links to real vault notes are allowed, but these files receive no automatic backlinks.
To publish a record as a proper note, promote it into `vault/research/`.
