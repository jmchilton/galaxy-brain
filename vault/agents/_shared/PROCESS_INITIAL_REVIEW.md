@REPOSITORY_REVIEWS.md

Below, PROJECT is the repository the PR belongs to (e.g. galaxy, planemo, pulsar, gxformat2); one agent may cover several.

## Security

Security findings and sensitive evidence instead follow [SECURITY_REPORTS.md](SECURITY_REPORTS.md): write them directly to John's home directory, never into the repository. For mixed reviews, keep only ordinary findings in the normal record.

## Initial review

**Run reviews in subagents.** Reading a PROJECT PR's diff plus surrounding code burns a lot of context; keep the main session as a coordinator. Pick every applicable profile from the [reviewer registry](reviewers/index.md) and run each in its own subagent, given the profile, the PR and its worktree, the PR's review directory, its private security output destination, and the agent's own review guidance.

Once all reports are in, aggregate their P1 and P2 findings into John's response, `initial_response_draft.md`, per the [Review File Docs](../../repositories/_defaults/reviews/FILE_DOCS.md). Merge duplicates across reports. Template:

```markdown
Reviewed by <profile> (<model>, <effort> effort), <profile> (<model>, <effort> effort).

**P1: <title>** — <file:line>. <problem and suggested fix>

**P2: <title>** — <file:line>. <problem and suggested fix>
```

The coordinator updates the index and handles galaxy-brain commits and pushes per [VAULT_SYNC.md](VAULT_SYNC.md).
