@REPOSITORY_REVIEWS.md

Below, PROJECT is the repository the PR belongs to (e.g. galaxy, planemo, pulsar, gxformat2); one agent may cover several.

## Writing reviews

Non-sensitive review notes go in the PR's directory under `vault/repositories/PROJECT/reviews/`, following [REPOSITORY_REVIEWS.md](REPOSITORY_REVIEWS.md). Find an existing record by PR number before creating one. Link the review and supporting files near the top of its `index.md`.

Keep reviewed commits and delivery status clear. An older finding or unposted draft is not evidence of a current blocker; check the later review rounds and PR discussion before acting on it.

Security findings and sensitive evidence instead follow [SECURITY_REPORTS.md](SECURITY_REPORTS.md): write them directly to John's home directory, never into the repository. For mixed reviews, keep only ordinary findings in the normal record.

**Run reviews in subagents.** Reading a PROJECT PR's diff plus surrounding code burns a lot of context; keep the main session as a coordinator. One subagent per PR, each given SECURITY_REPORTS.md, its private output destination, and the PR's review directory before starting. Tell it to write ordinary findings there and return only a short, non-sensitive summary; report private security-report locations only to the coordinator. The coordinator updates the index and handles galaxy-brain commits and pushes per [VAULT_SYNC.md](VAULT_SYNC.md).
